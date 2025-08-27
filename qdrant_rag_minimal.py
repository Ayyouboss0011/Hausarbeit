#!/usr/bin/env python3
"""
Qdrant RAG — end‑to‑end minimal implementation (fast + production‑ready skeleton)

Features
- Local or Qdrant Cloud via URL/API key
- Fast CPU embeddings via FastEmbed (no external API needed)
- Simple folder ingestor with smart text chunking
- Hybrid (dense + keyword) retrieval optional
- Optional reranking (CrossEncoder) for better answer quality
- OpenAI (or any chat model) for generation — configurable via env vars

Usage
  # 1) Install deps
  #    pip install -U qdrant-client fastembed sentence-transformers groq python-dotenv
  #    # If you want reranking:
  #    pip install -U transformers torch --extra-index-url https://download.pytorch.org/whl/cu121  # or CPU wheels
  #
  # 2) Run Qdrant locally (Docker):
  #    docker run -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage qdrant/qdrant
  #
  # 3) Put your docs as .txt/.md/.pdf into ./data
  #    (PDFs get extracted with a basic text fallback if pypdf is installed)
  #
  # 4) Index your data
  #    python qdrant_rag_minimal.py index --collection guardianai --data_dir ./data
  #
  # 5) Ask questions
  #    python qdrant_rag_minimal.py query --collection guardianai -q "Wie funktioniert unser Onboarding?"
  #
  # Env vars
  #   QDRANT_URL (default: http://localhost:6333)
  #   QDRANT_API_KEY (for Qdrant Cloud)
  #   EMBEDDING_MODEL (default: sentence-transformers/all-MiniLM-L6-v2 via FastEmbed alias)
"""
from __future__ import annotations

import argparse
import os
import re
import uuid
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

# GuardianAI import
from guardian_ai import evaluate_text, SafetyEvaluation

# Optional imports guarded
try:
    from pypdf import PdfReader  # for simple PDF text extraction
    HAS_PDF = True
except Exception:
    HAS_PDF = False

from qdrant_client import QdrantClient, models
from fastembed import TextEmbedding

# Optional reranker
try:
    from sentence_transformers import CrossEncoder
    HAS_RERANK = True
except Exception:
    HAS_RERANK = False

# Optional LLM generation via Groq
try:
    from groq import Groq
    HAS_GROQ = True
except Exception:
    HAS_GROQ = False

from dotenv import load_dotenv


# --------------------------- Ingestion & Chunking --------------------------- #

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
    if path.suffix.lower() == ".pdf" and HAS_PDF:
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    # Fallback: binary read & decode best-effort
    return path.read_text(encoding="utf-8", errors="ignore")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def text_to_chunks(text: str, chunk_size: int = 800, chunk_overlap: int = 120) -> List[str]:
    """Word-aware chunking with overlap."""
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


# --------------------------- Qdrant Operations ------------------------------ #

def get_qdrant_client() -> QdrantClient:
    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    api_key = os.getenv("QDRANT_API_KEY")
    return QdrantClient(url=url, api_key=api_key)


def ensure_collection(client: QdrantClient, collection: str, vector_size: int, distance=models.Distance.COSINE,
                      enable_sparse: bool = False) -> None:
    try:
        client.get_collection(collection_name=collection)
        return  # Collection exists
    except Exception:
        # Collection does not exist, create it
        pass

    if enable_sparse:
        # Hybrid (dense + sparse) setup
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
    # FastEmbed model aliases map to SBERT models under the hood
    model_name = model_name or os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedder = TextEmbedding(model_name)
    vectors = [vec for vec in embedder.embed(texts)]
    dim = len(vectors[0]) if vectors else 384
    return vectors, dim


def upsert_chunks(client: QdrantClient, collection: str, chunks: List[DocChunk], model_name: Optional[str] = None, metadata: Optional[dict] = None) -> None:
    batch_size = 128
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        vectors, dim = embed_texts_fastembed([c.text for c in batch], model_name)
        # Ensure collection exists with the right size
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


# --------------------------- Retrieval & Reranking -------------------------- #

def search(client: QdrantClient, collection: str, query: str, top_k: int = 8) -> List[models.ScoredPoint]:
    qvec, _ = embed_texts_fastembed([query])
    result = client.search(
        collection_name=collection,
        query_vector=qvec[0],
        limit=top_k,
        with_payload=True,
        with_vectors=False,
    )
    return result


def rerank(query: str, candidates: List[models.ScoredPoint], model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
    if not HAS_RERANK or not candidates:
        return candidates
    model = CrossEncoder(model_name)
    pairs = [(query, c.payload.get("text", "")) for c in candidates]
    scores = model.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [c for c, s in ranked]


# --------------------------- Generation ------------------------------------ #

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

    if HAS_GROQ:
        try:
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            resp = client.chat.completions.create(
                model="meta-llama/llama-4-maverick-17b-128e-instruct",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API call failed: {e}")

    # Fallback: extractive answer (no LLM)
    return (
        "\n".join(contexts[:3]) + "\n\n(LLM not configured — returning top context chunks)"
    )


# --------------------------- CLI ------------------------------------------- #

def cmd_add_document(args):
    filepath = Path(args.filepath)
    assert filepath.exists(), f"File not found: {filepath}"

    print(f"→ Processing document: {filepath}")
    
    try:
        metadata = json.loads(args.metadata) if args.metadata else {}
    except json.JSONDecodeError:
        print("Error: Invalid JSON in metadata argument.")
        return

    raw = load_text_from_file(filepath)
    text = normalize_ws(raw)
    
    if not text:
        print("Error: No text could be extracted from the document.")
        return

    doc_id = metadata.get("id", str(uuid.uuid4()))
    parts = text_to_chunks(text)
    chunks = [
        DocChunk(
            id=str(uuid.uuid4()),
            text=part,
            doc_id=doc_id,
            source=str(filepath),
            chunk_index=i,
        )
        for i, part in enumerate(parts)
    ]

    client = get_qdrant_client()
    qdrant_url = os.getenv("QDRant_URL", "http://localhost:6333")
    print(f"→ Connecting to Qdrant at {qdrant_url}")

    upsert_chunks(client, args.collection, chunks, model_name=args.embedding_model, metadata=metadata)
    count = client.count(collection_name=args.collection, exact=True).count
    print(f"✓ Indexed {len(chunks)} chunks into '{args.collection}'. Total points: {count}")


def cmd_index(args):
    data_dir = Path(args.data_dir)
    assert data_dir.exists(), f"Data dir not found: {data_dir}"

    print("→ Discovering files…")
    chunks = build_chunks_from_dir(data_dir)
    print(f"→ Built {len(chunks)} chunks from {data_dir}")

    client = get_qdrant_client()
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    print(f"→ Connecting to Qdrant at {qdrant_url}")

    upsert_chunks(client, args.collection, chunks, model_name=args.embedding_model)
    count = client.count(collection_name=args.collection, exact=True).count
    print(f"✓ Indexed {count} chunks into '{args.collection}'")


def cmd_query(args):
    client = get_qdrant_client()
    print(f"→ Searching in collection '{args.collection}'…")

    hits = search(client, args.collection, args.query, top_k=args.top_k)
    if args.rerank:
        hits = rerank(args.query, hits)

    contexts = []
    for h in hits[: args.max_ctx]:
        meta = h.payload
        snippet = meta.get("text", "")
        src = meta.get("source", "")
        idx = meta.get("chunk_index", -1)
        contexts.append(f"{snippet}\n[source: {src}#{idx}]\n")

    answer = generate_answer(args.query, contexts)

    print("\n=== Answer ===\n")
    print(answer)

    if args.show_context:
        print("\n=== Top Contexts ===\n")
        for i, h in enumerate(hits):
            print(f"#{i+1} score={h.score:.4f} src={h.payload.get('source')}#{h.payload.get('chunk_index')}")
            print(h.payload.get("text", "")[:500], "\n")


def cmd_evaluate(args):
    client = get_qdrant_client()
    print(f"→ Evaluating text against collection '{args.collection}'…")

    # 1. Search for relevant context
    hits = search(client, args.collection, args.text, top_k=args.top_k)
    if args.rerank:
        hits = rerank(args.text, hits)

    # 2. Extract context snippets
    contexts = [h.payload.get("text", "") for h in hits[:args.max_ctx]]

    # 3. Call GuardianAI for evaluation
    if not contexts:
        print("\n⚠️  Warning: No relevant context found in the database. Evaluation may be unreliable.")

    evaluation = evaluate_text(args.text, contexts)

    # 4. Print structured output
    print("\n=== GuardianAI Evaluation ===\n")
    print(json.dumps(evaluation.model_dump(), indent=2))


def build_arg_parser():
    p = argparse.ArgumentParser(description="Qdrant RAG minimal")

    sub = p.add_subparsers(required=True)

    p_idx = sub.add_parser("index", help="Index documents from a folder")
    p_idx.add_argument("--collection", required=True)
    p_idx.add_argument("--data_dir", required=True)
    p_idx.add_argument("--embedding_model", default=None,
                       help="FastEmbed model alias (default: sentence-transformers/all-MiniLM-L6-v2)")
    p_idx.set_defaults(func=cmd_index)

    p_add = sub.add_parser("add-document", help="Add a single document to the collection")
    p_add.add_argument("--collection", required=True)
    p_add.add_argument("--filepath", required=True)
    p_add.add_argument("--metadata", type=str, help="JSON string of metadata to attach to the document")
    p_add.add_argument("--embedding_model", default=None)
    p_add.set_defaults(func=cmd_add_document)

    p_q = sub.add_parser("query", help="Query the collection and generate an answer")
    p_q.add_argument("--collection", required=True)
    p_q.add_argument("-q", "--query", required=True)
    p_q.add_argument("--top_k", type=int, default=8)
    p_q.add_argument("--max_ctx", type=int, default=4)
    p_q.add_argument("--rerank", action="store_true")
    p_q.add_argument("--show_context", action="store_true")
    p_q.set_defaults(func=cmd_query)

    p_eval = sub.add_parser("evaluate", help="Evaluate a text against the collection for safety.")
    p_eval.add_argument("--collection", required=True)
    p_eval.add_argument("--text", required=True, help="The text to evaluate.")
    p_eval.add_argument("--top_k", type=int, default=5)
    p_eval.add_argument("--max_ctx", type=int, default=5)
    p_eval.add_argument("--rerank", action="store_true")
    p_eval.set_defaults(func=cmd_evaluate)

    return p


def main():
    load_dotenv()
    parser = build_arg_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
