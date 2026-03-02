"""
Embedding Service
Generates vector embeddings using sentence-transformers.
"""

from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

# Singleton model instance
_model = None


def get_model() -> SentenceTransformer:
    """Load embedding model (singleton pattern to avoid reloading)."""
    global _model
    if _model is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print("Embedding model loaded successfully.")
    return _model


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts.
    Returns list of embedding vectors.
    """
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    return embeddings.tolist()


def generate_query_embedding(query: str) -> list[float]:
    """
    Generate embedding for a single query text.
    """
    model = get_model()
    embedding = model.encode([query], convert_to_numpy=True)
    return embedding[0].tolist()
