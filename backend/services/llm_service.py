"""
LLM Service
Handles all interactions with any OpenAI-compatible LLM API.
Supports: Qwen, OpenAI, Groq, DeepSeek, Ollama, and more.
"""

from openai import OpenAI
from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

# Initialize OpenAI-compatible client
client = OpenAI(
    api_key=LLM_API_KEY,
    base_url=LLM_BASE_URL,
)


def generate_answer(question: str, contexts: list[dict]) -> dict:
    """
    Generate an answer to a question using retrieved contexts.
    Implements the RAG 'Context Augmentation' + 'LLM Generation' steps.

    Args:
        question: User's question
        contexts: List of relevant context dicts with 'text', 'metadata'

    Returns:
        Dict with 'answer', 'citations'
    """
    # Build context string with source references
    context_parts = []
    for i, ctx in enumerate(contexts):
        meta = ctx.get("metadata", {})
        source = meta.get("filename", "Unknown")
        pages = meta.get("page_range", "?")
        context_parts.append(
            f"[Source {i+1}: {source}, Pages {pages}]\n{ctx['text']}"
        )

    context_str = "\n\n---\n\n".join(context_parts)

    prompt = f"""You are an intelligent research assistant. Answer the user's question based ONLY on the provided context from research documents. Your task is to:

1. Provide a clear, comprehensive, and well-structured answer.
2. Cite your sources using [Source N] notation for each claim or piece of information.
3. If the context doesn't contain enough information to fully answer the question, clearly state what you can and cannot answer.
4. Respond in the SAME LANGUAGE as the user's question (cross-language synthesis: even if sources are in a different language, translate and answer in the user's language).
5. Use markdown formatting for better readability (headings, bullet points, bold text).

CONTEXT FROM RESEARCH DOCUMENTS:
{context_str}

USER'S QUESTION:
{question}

ANSWER (with citations):"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert research assistant that provides accurate, well-cited answers based on provided research documents. Always cite your sources."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000,
        )

        answer = response.choices[0].message.content

        # Extract citation references
        citations = []
        for i, ctx in enumerate(contexts):
            meta = ctx.get("metadata", {})
            citations.append({
                "source_num": i + 1,
                "doc_id": meta.get("doc_id", ""),
                "filename": meta.get("filename", "Unknown"),
                "title": meta.get("title", ""),
                "author": meta.get("author", ""),
                "year": meta.get("year", ""),
                "doi": meta.get("doi", ""),
                "publisher": meta.get("publisher", ""),
                "pages": meta.get("pages", []),
                "page_range": meta.get("page_range", "?"),
                "relevance_score": ctx.get("score", 0),
                "snippet": ctx["text"][:200] + "..." if len(ctx["text"]) > 200 else ctx["text"],
            })

        return {
            "answer": answer,
            "citations": citations,
            "model": LLM_MODEL,
        }

    except Exception as e:
        return {
            "answer": f"Error generating answer: {str(e)}",
            "citations": [],
            "model": LLM_MODEL,
            "error": str(e),
        }


def generate_summary(text: str, filename: str) -> str:
    """
    Generate a summary of a document's content.
    """
    prompt = f"""Summarize the following research document content concisely but comprehensively.
Include:
- Main topic and objectives
- Key findings and conclusions
- Important methodologies mentioned
- Practical implications

Document: {filename}

Content:
{text[:6000]}

Provide a well-structured summary in markdown format:"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert academic summarizer. Provide clear, structured summaries of research documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating summary: {str(e)}"


def generate_tags(text: str) -> list[str]:
    """
    Automatically identify topics/tags from document content.
    """
    prompt = f"""Analyze the following document content and identify the main topics, themes, and keywords.
Return exactly 5-10 tags as a JSON array of strings.
Tags should be concise (1-3 words each), in English, and represent the key topics.

Content:
{text[:4000]}

Return ONLY a JSON array of tag strings, nothing else. Example: ["machine learning", "neural networks", "computer vision"]"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are a document classification expert. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=200,
        )

        import json
        tags_text = response.choices[0].message.content.strip()
        # Try to extract JSON from the response
        if "[" in tags_text:
            start = tags_text.index("[")
            end = tags_text.rindex("]") + 1
            tags = json.loads(tags_text[start:end])
            return tags
        return []
    except Exception as e:
        print(f"Error generating tags: {e}")
        return []
