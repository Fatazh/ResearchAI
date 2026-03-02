"""
Query Routes
Handles Q&A, summarization, and search operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import generate_query_embedding
from services.vector_store import query_similar
from services.llm_service import generate_answer, generate_summary
from services.database import get_document, save_chat, get_chat_history, get_all_documents
from config import TOP_K_RESULTS, SIMILARITY_THRESHOLD

router = APIRouter(prefix="/api", tags=["query"])


class QuestionRequest(BaseModel):
    question: str
    top_k: int = TOP_K_RESULTS


class SummarizeRequest(BaseModel):
    doc_id: str


@router.post("/query")
async def ask_question(request: QuestionRequest):
    """
    Ask a question and get an AI-generated answer with citations.
    Implements the full RAG query pipeline:
    1. Query Embedding
    2. Vector Similarity Search
    3. Context Augmentation
    4. LLM Generation
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Step 1: Generate query embedding
    query_embedding = generate_query_embedding(request.question)

    # Step 2: Vector similarity search
    results = query_similar(query_embedding, top_k=request.top_k)

    if not results or not results.get("documents") or not results["documents"][0]:
        return {
            "answer": "I couldn't find any relevant information in the uploaded documents. Please make sure you've uploaded relevant PDF documents first.",
            "citations": [],
            "contexts_found": 0,
        }

    # Step 3: Build contexts with metadata
    contexts = []
    import json
    for i in range(len(results["documents"][0])):
        distance = results["distances"][0][i] if results["distances"] else 1.0
        # ChromaDB returns distances (lower = more similar for cosine)
        similarity_score = 1 - distance

        metadata = results["metadatas"][0][i] if results["metadatas"] else {}

        # Parse pages back from JSON string
        if "pages" in metadata and isinstance(metadata["pages"], str):
            try:
                metadata["pages"] = json.loads(metadata["pages"])
            except Exception:
                pass

        contexts.append({
            "text": results["documents"][0][i],
            "metadata": metadata,
            "score": round(similarity_score, 4),
        })

    # Step 4 & 5: Context Augmentation + LLM Generation
    result = generate_answer(request.question, contexts)

    # Save to chat history
    save_chat(request.question, result["answer"], result["citations"])

    return {
        "answer": result["answer"],
        "citations": result["citations"],
        "contexts_found": len(contexts),
        "model": result.get("model", ""),
    }


@router.post("/summarize")
async def summarize_document(request: SummarizeRequest):
    """Generate or retrieve a summary for a document."""
    doc = get_document(request.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Return existing summary if available
    if doc.get("summary"):
        return {
            "doc_id": request.doc_id,
            "filename": doc["original_name"],
            "summary": doc["summary"],
            "tags": doc.get("tags", []),
        }

    raise HTTPException(status_code=400, detail="Document has not been fully processed yet")


@router.get("/chat-history")
async def get_history():
    """Get chat history."""
    history = get_chat_history()
    return {"history": history}
