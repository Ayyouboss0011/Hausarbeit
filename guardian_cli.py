#!/usr/bin/env python3
import click
import json
import os
import uuid
from pathlib import Path

from qdrant_client import models
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

@click.group()
def cli():
    pass

@cli.command("list-collections")
def list_collections():
    """Lists all available collections in Qdrant."""
    client = get_qdrant_client()
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    click.echo(f"→ Fetching collections from Qdrant at {qdrant_url}…")
    try:
        collections = client.get_collections().collections
        if not collections:
            click.echo("No collections found.")
            return
        click.echo("Available collections:")
        for collection in collections:
            click.echo(f"- {collection.name}")
    except Exception as e:
        click.echo(f"Error: Could not connect to Qdrant or fetch collections: {e}")

@cli.command("list-documents")
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
def list_documents(collection):
    """Lists all documents in a collection."""
    client = get_qdrant_client()
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    click.echo(f"→ Fetching documents from '{collection}' at {qdrant_url}…")
    try:
        count = client.count(collection_name=collection, exact=True).count
        if count == 0:
            click.echo(f"Collection '{collection}' is empty.")
            return

        click.echo(f"Found {count} document chunks. Aggregating by doc_id…")
        
        seen_doc_ids = set()
        response = client.scroll(collection_name=collection, limit=256, with_payload=True)
        points = response[0]
        
        for point in points:
            if point.payload and "doc_id" in point.payload:
                seen_doc_ids.add(point.payload["doc_id"])

        if not seen_doc_ids:
            click.echo("No documents with doc_id found in this collection.")
            return

        click.echo("Available documents (by doc_id):")
        for doc_id in sorted(list(seen_doc_ids)):
            click.echo(f"- {doc_id}")

    except Exception as e:
        click.echo(f"Error: Could not connect to Qdrant or fetch documents: {e}")

@cli.command()
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
@click.option("--data-dir", required=True, type=click.Path(exists=True, file_okay=False, path_type=Path), help="Directory containing documents to index.")
@click.option("--embedding-model", default=None, help="FastEmbed model alias.")
def index(collection, data_dir, embedding_model):
    click.echo("→ Discovering files…")
    chunks = build_chunks_from_dir(data_dir)
    click.echo(f"→ Built {len(chunks)} chunks from {data_dir}")

    client = get_qdrant_client()
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    click.echo(f"→ Connecting to Qdrant at {qdrant_url}")

    upsert_chunks(client, collection, chunks, model_name=embedding_model)
    count = client.count(collection_name=collection, exact=True).count
    click.echo(f"✓ Indexed {count} chunks into '{collection}'")

@cli.command("add-document")
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
@click.option("--filepath", required=True, type=click.Path(exists=True, dir_okay=False, path_type=Path), help="Path to the document to add.")
@click.option("--metadata", type=str, help="JSON string of metadata to attach.")
@click.option("--embedding-model", default=None, help="FastEmbed model alias.")
def add_document(collection, filepath, metadata, embedding_model):
    click.echo(f"→ Processing document: {filepath}")
    
    try:
        meta = json.loads(metadata) if metadata else {}
    except json.JSONDecodeError:
        click.echo("Error: Invalid JSON in metadata argument.")
        return

    raw = load_text_from_file(filepath)
    text = normalize_ws(raw)
    
    if not text:
        click.echo("Error: No text could be extracted from the document.")
        return

    doc_id = meta.get("id", str(uuid.uuid4()))
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
    click.echo(f"→ Connecting to Qdrant at {qdrant_url}")

    upsert_chunks(client, collection, chunks, model_name=embedding_model, metadata=meta)
    count = client.count(collection_name=collection, exact=True).count
    click.echo(f"✓ Indexed {len(chunks)} chunks into '{collection}'. Total points: {count}")

@cli.command("delete-document")
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
@click.option("--doc-id", required=True, help="ID of the document to delete.")
def delete_document(collection, doc_id):
    client = get_qdrant_client()
    click.echo(f"→ Deleting document with doc_id '{doc_id}' from collection '{collection}'…")

    client.delete(
        collection_name=collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="doc_id",
                        match=models.MatchValue(value=doc_id),
                    ),
                ]
            )
        ),
    )
    click.echo(f"✓ Deleted document chunks from '{collection}'")

@cli.command()
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
@click.option("-q", "--query", "query_text", required=True, help="Query text.")
@click.option("--top-k", type=int, default=8, help="Number of results to retrieve.")
@click.option("--max-ctx", type=int, default=4, help="Maximum context snippets to use.")
@click.option("--rerank/--no-rerank", "use_rerank", default=False, help="Enable or disable reranking.")
@click.option("--show-context/--no-show-context", default=False, help="Show context snippets in output.")
@click.option(
    "--score-threshold",
    type=float,
    default=lambda: float(os.getenv("SCORE_THRESHOLD", 0.2)),
    help="Similarity score threshold.",
)
def query(collection, query_text, top_k, max_ctx, use_rerank, show_context, score_threshold):
    client = get_qdrant_client()
    click.echo(f"→ Searching in collection '{collection}' with score_threshold={score_threshold}…")

    hits = search(
        client,
        collection,
        query_text,
        top_k=top_k,
        score_threshold=score_threshold,
    )
    if use_rerank:
        hits = rerank(query_text, hits)

    contexts = []
    for h in hits[:max_ctx]:
        meta = h.payload
        snippet = meta.get("text", "")
        src = meta.get("source", "")
        idx = meta.get("chunk_index", -1)
        contexts.append(f"{snippet}\n[source: {src}#{idx}]\n")

    answer = generate_answer(query_text, contexts)

    click.echo("\n=== Answer ===\n")
    click.echo(answer)

    if show_context:
        click.echo("\n=== Top Contexts ===\n")
        for i, h in enumerate(hits):
            click.echo(f"#{i+1} score={h.score:.4f} src={h.payload.get('source')}#{h.payload.get('chunk_index')}")
            click.echo(h.payload.get("text", "")[:500] + "\n")

@cli.command()
@click.option("--collection", required=True, help="Name of the Qdrant collection.")
@click.option("--text", required=True, help="Text to evaluate for safety.")
@click.option("--top-k", type=int, default=5, help="Number of results for context.")
@click.option("--max-ctx", type=int, default=5, help="Maximum context snippets for evaluation.")
@click.option("--rerank/--no-rerank", "use_rerank", default=False, help="Enable or disable reranking for context retrieval.")
@click.option(
    "--score-threshold",
    type=float,
    default=lambda: float(os.getenv("SCORE_THRESHOLD", 0.2)),
    help="Similarity score threshold.",
)
def evaluate(collection, text, top_k, max_ctx, use_rerank, score_threshold):
    client = get_qdrant_client()
    click.echo(f"→ Evaluating text against collection '{collection}' with score_threshold={score_threshold}…")

    hits = search(
        client,
        collection,
        text,
        top_k=top_k,
        score_threshold=score_threshold,
    )
    if use_rerank:
        hits = rerank(text, hits)

    contexts = [h.payload.get("text", "") for h in hits[:max_ctx]]

    if not contexts:
        click.echo("\n⚠️  Warning: No relevant context found in the database. Evaluation may be unreliable.")

    evaluation = evaluate_text(text, contexts)

    click.echo("\n=== GuardianAI Evaluation ===\n")
    click.echo(json.dumps(evaluation.model_dump(), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    cli()
