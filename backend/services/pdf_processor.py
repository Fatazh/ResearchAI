"""
PDF Text Extraction Service
Extracts and cleans text from PDF files using PyMuPDF.
"""

import re
import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str) -> list[dict]:
    """
    Extract text from a PDF file, page by page.
    Returns a list of dicts with 'page_num' and 'text' keys.
    """
    doc = fitz.open(pdf_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")

        cleaned = clean_text(text)
        if cleaned.strip():
            pages.append({
                "page_num": page_num + 1,
                "text": cleaned
            })

    doc.close()
    return pages


def clean_text(text: str) -> str:
    """
    Clean extracted text: remove noise, fix formatting, normalize whitespace.
    """
    # Remove excessive whitespace and normalize line breaks
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove page headers/footers patterns (common patterns)
    text = re.sub(r'Page\s+\d+\s*(of\s+\d+)?', '', text, flags=re.IGNORECASE)

    # Remove standalone page numbers
    text = re.sub(r'^\s*\d+\s*$', '', text, flags=re.MULTILINE)

    # Fix hyphenated line breaks (word-\nbreak -> wordbreak)
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)

    # Normalize multiple spaces to single space
    text = re.sub(r'[ \t]+', ' ', text)

    # Remove leading/trailing whitespace per line
    text = '\n'.join(line.strip() for line in text.split('\n'))

    # Remove empty lines at start/end
    text = text.strip()

    return text


def get_pdf_metadata(pdf_path: str) -> dict:
    """
    Extract rich metadata from a PDF file.
    Tries PDF embedded metadata first, then falls back to first-page text parsing.
    """
    doc = fitz.open(pdf_path)
    metadata = doc.metadata or {}
    page_count = len(doc)

    # Get first page text for fallback parsing
    first_page_text = ""
    if page_count > 0:
        first_page_text = doc[0].get_text("text")

    doc.close()

    # --- Title ---
    title = (metadata.get("title") or "").strip()
    if not title or len(title) < 5:
        # Fallback: try first meaningful line from first page
        for line in first_page_text.split("\n"):
            cleaned = line.strip()
            if len(cleaned) > 15 and not re.match(r'^\d+$', cleaned):
                title = cleaned
                break
        if not title:
            # Use filename without extension and doc_id prefix
            import os
            basename = os.path.splitext(os.path.basename(pdf_path))[0]
            # Remove doc_id prefix like "abc12345_"
            title = re.sub(r'^[a-f0-9]{8}_', '', basename).replace('_', ' ').replace('-', ' ').strip()

    # --- Author ---
    author = (metadata.get("author") or "").strip()

    # --- DOI ---
    doi = ""
    doi_match = re.search(r'(10\.\d{4,}/[^\s,;]+)', first_page_text)
    if doi_match:
        doi = doi_match.group(1).rstrip('.')

    # --- Year ---
    year = ""
    # Try from PDF metadata dates
    for date_key in ["creationDate", "modDate"]:
        date_str = metadata.get(date_key, "")
        if date_str:
            year_match = re.search(r'(\d{4})', date_str)
            if year_match:
                yr = int(year_match.group(1))
                if 1950 <= yr <= 2030:
                    year = str(yr)
                    break

    # If no year from metadata, try first page text
    if not year:
        # Look for year near publication-related keywords
        year_patterns = [
            r'(?:Published|Received|Accepted|Vol|Volume|©|\bYear\b)[^\d]*(\d{4})',
            r'\b(20[0-2]\d|19[89]\d)\b',
        ]
        for pattern in year_patterns:
            match = re.search(pattern, first_page_text, re.IGNORECASE)
            if match:
                yr = int(match.group(1))
                if 1950 <= yr <= 2030:
                    year = str(yr)
                    break

    # --- Publisher ---
    publisher = ""
    producer = (metadata.get("producer") or "").strip()
    creator = (metadata.get("creator") or "").strip()

    # Common publisher patterns in first page
    pub_patterns = [
        r'(?:Published by|Publisher:?|©\s*\d{4}\s*)\s*(.+?)(?:\.|$)',
        r'(Elsevier|Springer|Wiley|Taylor\s*&\s*Francis|MDPI|IEEE|Nature|Science|Cambridge University Press|Oxford University Press|IOP Publishing|SAGE|Frontiers|PLOS|BioMed Central|Hindawi|De Gruyter|Emerald)',
    ]
    for pattern in pub_patterns:
        match = re.search(pattern, first_page_text, re.IGNORECASE)
        if match:
            publisher = match.group(1).strip()
            break

    # Fallback to PDF producer/creator
    if not publisher and producer and "pdf" not in producer.lower() and "adobe" not in producer.lower():
        publisher = producer
    if not publisher and creator and "pdf" not in creator.lower() and "adobe" not in creator.lower():
        publisher = creator

    return {
        "title": title[:200] if title else "",
        "author": author[:200] if author else "",
        "year": year,
        "doi": doi[:100] if doi else "",
        "publisher": publisher[:150] if publisher else "",
        "page_count": page_count,
    }
