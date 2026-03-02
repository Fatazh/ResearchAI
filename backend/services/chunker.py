"""
Text Chunking Engine
Splits cleaned text into overlapping chunks for embedding.
"""

from config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(pages: list[dict], doc_id: str, filename: str, doc_meta: dict = None) -> list[dict]:
    """
    Split page texts into overlapping chunks.
    Each chunk includes metadata for citation tracking.

    Args:
        pages: List of dicts with 'page_num' and 'text'
        doc_id: Unique document identifier
        filename: Original filename
        doc_meta: Optional dict with title, author, year, doi, publisher

    Returns:
        List of chunk dicts with 'text', 'metadata' keys
    """
    if doc_meta is None:
        doc_meta = {}

    # Combine all pages with page markers
    segments = []
    for page in pages:
        sentences = split_into_sentences(page["text"])
        for sentence in sentences:
            segments.append({
                "text": sentence,
                "page_num": page["page_num"]
            })

    # Build chunks with overlap
    chunks = []
    chunk_idx = 0
    i = 0

    while i < len(segments):
        chunk_texts = []
        chunk_pages = set()
        token_count = 0

        j = i
        while j < len(segments) and token_count < CHUNK_SIZE:
            seg = segments[j]
            seg_tokens = len(seg["text"].split())
            chunk_texts.append(seg["text"])
            chunk_pages.add(seg["page_num"])
            token_count += seg_tokens
            j += 1

        chunk_text = " ".join(chunk_texts)

        if chunk_text.strip():
            chunks.append({
                "id": f"{doc_id}_chunk_{chunk_idx}",
                "text": chunk_text,
                "metadata": {
                    "doc_id": doc_id,
                    "filename": filename,
                    "chunk_index": chunk_idx,
                    "pages": sorted(list(chunk_pages)),
                    "page_range": f"{min(chunk_pages)}-{max(chunk_pages)}",
                    "token_count": token_count,
                    "title": doc_meta.get("title", ""),
                    "author": doc_meta.get("author", ""),
                    "year": doc_meta.get("year", ""),
                    "doi": doc_meta.get("doi", ""),
                    "publisher": doc_meta.get("publisher", ""),
                }
            })
            chunk_idx += 1

        # Move forward, minus overlap
        overlap_tokens = 0
        advance = 0
        for k in range(i, j):
            advance += 1
            overlap_tokens += len(segments[k]["text"].split())
            if overlap_tokens >= (token_count - CHUNK_OVERLAP):
                break

        i += max(advance, 1)

    return chunks


def split_into_sentences(text: str) -> list[str]:
    """
    Split text into sentences using simple rules.
    """
    import re

    # Split on sentence boundaries
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)

    # Further split very long sentences
    result = []
    for sentence in sentences:
        words = sentence.split()
        if len(words) > 100:
            # Split long sentences into smaller pieces at commas or semicolons
            parts = re.split(r'(?<=[,;])\s+', sentence)
            result.extend(parts)
        else:
            result.append(sentence)

    return [s.strip() for s in result if s.strip()]
