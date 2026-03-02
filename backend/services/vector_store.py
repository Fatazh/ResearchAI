"""
Vector Store Service
Manages ChromaDB for storing and querying document embeddings.
"""

import chromadb
from chromadb.config import Settings
from config import CHROMA_DIR, TOP_K_RESULTS


# Singleton client
_client = None
_collection = None

COLLECTION_NAME = "research_documents"


def get_client() -> chromadb.PersistentClient:
    """Get or create ChromaDB client."""
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
    return _client


def get_collection():
    """Get or create the document collection."""
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def add_documents(chunk_ids: list[str], embeddings: list[list[float]],
                  texts: list[str], metadatas: list[dict]):
    """
    Add document chunks to the vector store.
    """
    collection = get_collection()

    # ChromaDB has a batch size limit, process in batches
    batch_size = 100
    for i in range(0, len(chunk_ids), batch_size):
        end = min(i + batch_size, len(chunk_ids))
        collection.add(
            ids=chunk_ids[i:end],
            embeddings=embeddings[i:end],
            documents=texts[i:end],
            metadatas=metadatas[i:end]
        )


def query_similar(query_embedding: list[float], top_k: int = TOP_K_RESULTS,
                  filter_doc_id: str = None) -> dict:
    """
    Query the vector store for similar documents.
    Returns top-k most similar chunks.
    """
    collection = get_collection()

    where_filter = None
    if filter_doc_id:
        where_filter = {"doc_id": filter_doc_id}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"]
    )

    return results


def delete_document_chunks(doc_id: str):
    """Delete all chunks belonging to a document."""
    collection = get_collection()
    # Get all chunk IDs for this document
    results = collection.get(
        where={"doc_id": doc_id},
        include=[]
    )
    if results["ids"]:
        collection.delete(ids=results["ids"])


def get_collection_count() -> int:
    """Get total number of chunks in the collection."""
    try:
        collection = get_collection()
        return collection.count()
    except Exception:
        return 0
