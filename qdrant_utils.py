#!/usr/bin/env python3
from __future__ import annotations
import os
import re
import uuid
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple
from guardian_ai import evaluate_text, SafetyEvaluation
from pypdf import PdfReader
from qdrant_client import QdrantClient, models
from fastembed import TextEmbedding
from sentence_transformers import CrossEncoder
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

@dataclass
class DocChunk:
    id: str
    text: str
    doc_id: str
    source: str
    chunk_index: int


def load_text_from_file(path: Path) -> str:
    if path.suffix.lower() in {".txt", ".md", ".markdown"}:
        return path.read_text(encoding="utf-8", errors="ignore")
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="ignore")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def text_to_chunks(text: str, chunk_size: int = 800, chunk_overlap: int = 120) -> List[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(len(words), start + chunk_size)
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start = end - chunk_overlap
        if start < 0:
            start = 0
    return chunks


def discover_files(data_dir: Path) -> List[Path]:
    exts = {".txt", ".md", ".markdown", ".pdf"}
    return [p for p in data_dir.rglob("*") if p.is_file() and p.suffix.lower() in exts]


def build_chunks_from_dir(data_dir: Path) -> List[DocChunk]:
    chunks: List[DocChunk] = []
    for path in discover_files(data_dir):
        try:
            raw = load_text_from_file(path)
        except Exception:
            continue
        text = normalize_ws(raw)
        if not text:
            continue
        doc_id = str(uuid.uuid4())
        parts = text_to_chunks(text)
        for i, part in enumerate(parts):
            chunks.append(
                DocChunk(
                    id=str(uuid.uuid4()),
                    text=part,
                    doc_id=doc_id,
                    source=str(path),
                    chunk_index=i,
                )
            )
    return chunks


def get_qdrant_client() -> QdrantClient:
    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    api_key = os.getenv("QDRANT_API_KEY")
    return QdrantClient(url=url, api_key=api_key)


def ensure_collection(client: QdrantClient, collection: str, vector_size: int, distance=models.Distance.COSINE,
                      enable_sparse: bool = False) -> None:
    try:
        client.get_collection(collection_name=collection)
        return
    except Exception:
        pass

    if enable_sparse:
        vectors_config = models.VectorParams(size=vector_size, distance=distance)
        client.create_collection(
            collection_name=collection,
            vectors_config={"dense": vectors_config},
            sparse_vectors_config=models.SparseVectorParams(),
            optimizers_config=models.OptimizersConfigDiff(default_segment_number=2),
        )
    else:
        client.create_collection(
            collection_name=collection,
            vectors_config=models.VectorParams(size=vector_size, distance=distance),
            optimizers_config=models.OptimizersConfigDiff(default_segment_number=2),
        )


def embed_texts_fastembed(texts: List[str], model_name: Optional[str] = None) -> Tuple[List[List[float]], int]:
    model_name = model_name or os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedder = TextEmbedding(model_name)
    vectors = [vec.tolist() for vec in embedder.embed(texts)]
    dim = len(vectors[0]) if vectors else 384
    return vectors, dim


def upsert_chunks(client: QdrantClient, collection: str, chunks: List[DocChunk], model_name: Optional[str] = None, metadata: Optional[dict] = None) -> None:
    batch_size = 128
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        vectors, dim = embed_texts_fastembed([c.text for c in batch], model_name)
        if i == 0:
            ensure_collection(client, collection, vector_size=dim, enable_sparse=False)
        
        points = []
        for j, c in enumerate(batch):
            payload = {
                "text": c.text,
                "doc_id": c.doc_id,
                "source": c.source,
                "chunk_index": c.chunk_index,
            }
            if metadata:
                payload.update(metadata)
            
            points.append(
                models.PointStruct(
                    id=c.id,
                    vector=vectors[j],
                    payload=payload,
                )
            )
        
        client.upsert(collection_name=collection, points=points)


def search(client: QdrantClient, collection: str, query: str, top_k: int = 8) -> List[models.ScoredPoint]:
    qvecs, _ = embed_texts_fastembed([query])
    if not qvecs:
        return []
    result = client.search(
        collection_name=collection,
        query_vector=qvecs[0],
        limit=top_k,
        with_payload=True,
        with_vectors=False,
    )
    return result


def rerank(query: str, candidates: List[models.ScoredPoint], model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    if not candidates:
        return candidates
    model = CrossEncoder(model_name)
    pairs = [(query, c.payload.get("text", "")) for c in candidates]
    scores = model.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x, reverse=True)
    return [c for c, s in ranked]


def generate_answer(query: str, contexts: List[str]) -> str:
    system = (
        "You are a helpful RAG assistant. Answer the user using only the provided context snippets. "
        "If the answer is not present, say you don't know. Provide citations as [source:index] based on given metadata."
    )
    context_block = "\n\n".join(f"[chunk {i}] {ctx}" for i, ctx in enumerate(contexts))
    prompt = (
        f"User question: {query}\n\n"
        f"Context snippets:\n{context_block}\n\n"
        "Answer in the same language as the question."
    )

    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        model_name = os.getenv("LLM_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
        resp = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq API call failed: {e}")

    return (
        "\n".join(contexts[:3]) + "\n\n(LLM not configured — returning top context chunks)"
    )
