#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import uuid
from pathlib import Path

from qdrant_client import models
from dotenv import load_dotenv

from qdrant_utils import (
    build_chunks_from_dir,
    DocChunk,
    evaluate_text,
    generate_answer,
    get_qdrant_client,
    load_text_from_file,
    normalize_ws,
    rerank,
    search,
    text_to_chunks,
    upsert_chunks,
)


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
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    print(f"→ Connecting to Qdrant at {qdrant_url}")

    upsert_chunks(client, args.collection, chunks, model_name=args.embedding_model, metadata=metadata)
    count = client.count(collection_name=args.collection, exact=True).count
    print(f"✓ Indexed {len(chunks)} chunks into '{args.collection}'. Total points: {count}")


def cmd_delete_document(args):
    client = get_qdrant_client()
    print(f"→ Deleting document with doc_id '{args.doc_id}' from collection '{args.collection}'…")

    client.delete(
        collection_name=args.collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id",
                        match=models.MatchValue(value=args.doc_id),
                    ),
                ]
            )
        ),
    )
    print(f"✓ Deleted document chunks from '{args.collection}'")


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

    hits = search(client, args.collection, args.text, top_k=args.top_k)
    if args.rerank:
        hits = rerank(args.text, hits)

    contexts = [h.payload.get("text", "") for h in hits[:args.max_ctx]]

    if not contexts:
        print("\n⚠️  Warning: No relevant context found in the database. Evaluation may be unreliable.")

    evaluation = evaluate_text(args.text, contexts)

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

    p_del = sub.add_parser("delete-document", help="Delete a document and its chunks from the collection")
    p_del.add_argument("--collection", required=True)
    p_del.add_argument("--doc_id", required=True)
    p_del.set_defaults(func=cmd_delete_document)

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
