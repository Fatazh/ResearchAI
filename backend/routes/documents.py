"""
Document Routes
Handles PDF upload, listing, deletion, and ingestion pipeline.
"""

import os
import uuid
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse
from services.pdf_processor import extract_text_from_pdf, get_pdf_metadata
from services.chunker import chunk_text
from services.embedder import generate_embeddings
from services.vector_store import add_documents, delete_document_chunks
from services.llm_service import generate_summary, generate_tags
from services.database import (
    insert_document, update_document, get_document,
    get_all_documents, delete_document as db_delete_document,
    get_stats
)
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and ingest a PDF document."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    doc_id = str(uuid.uuid4())[:8]
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Get metadata
    metadata = get_pdf_metadata(file_path)

    # Insert document record
    insert_document(
        doc_id=doc_id,
        filename=safe_filename,
        original_name=file.filename,
        file_path=file_path,
        page_count=metadata["page_count"],
        title=metadata.get("title", ""),
        author=metadata.get("author", ""),
        year=metadata.get("year", ""),
        doi=metadata.get("doi", ""),
        publisher=metadata.get("publisher", ""),
    )

    # Run ingestion pipeline
    try:
        # Step 1: Extract text
        pages = extract_text_from_pdf(file_path)

        if not pages:
            update_document(doc_id, status="error")
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        # Step 2: Chunk text
        doc_meta = {
            "title": metadata.get("title", ""),
            "author": metadata.get("author", ""),
            "year": metadata.get("year", ""),
            "doi": metadata.get("doi", ""),
            "publisher": metadata.get("publisher", ""),
        }
        chunks = chunk_text(pages, doc_id, file.filename, doc_meta=doc_meta)

        # Step 3: Generate embeddings
        chunk_texts = [c["text"] for c in chunks]
        embeddings = generate_embeddings(chunk_texts)

        # Step 4: Store in vector database
        chunk_ids = [c["id"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]
        # Convert pages list to string for ChromaDB (it doesn't support list values)
        for m in metadatas:
            m["pages"] = json.dumps(m["pages"])

        add_documents(chunk_ids, embeddings, chunk_texts, metadatas)

        # Step 5: Generate tags
        full_text = " ".join([p["text"] for p in pages])
        tags = generate_tags(full_text)

        # Step 6: Generate summary
        summary = generate_summary(full_text, file.filename)

        # Update document record
        update_document(
            doc_id,
            chunk_count=len(chunks),
            tags=json.dumps(tags),
            summary=summary,
            status="ready"
        )

        return {
            "id": doc_id,
            "filename": file.filename,
            "page_count": metadata["page_count"],
            "chunk_count": len(chunks),
            "tags": tags,
            "status": "ready",
            "message": "Document ingested successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        update_document(doc_id, status="error")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.get("")
async def list_documents():
    """List all documents."""
    docs = get_all_documents()
    return {"documents": docs}


@router.get("/stats")
async def get_app_stats():
    """Get application statistics."""
    stats = get_stats()
    return stats


@router.get("/{doc_id}/view")
async def view_document_pdf(doc_id: str):
    """Serve the PDF file inline for viewing in browser."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = doc.get("file_path", "")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=doc.get("original_name", "document.pdf"),
        headers={"Content-Disposition": f'inline; filename="{doc.get("original_name", "document.pdf")}"'}
    )


@router.get("/{doc_id}/download")
async def download_document_pdf(doc_id: str):
    """Download the PDF file as an attachment."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = doc.get("file_path", "")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=doc.get("original_name", "document.pdf"),
        headers={"Content-Disposition": f'attachment; filename="{doc.get("original_name", "document.pdf")}"'}
    )


@router.get("/{doc_id}")
async def get_document_detail(doc_id: str):
    """Get document details."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{doc_id}")
async def delete_doc(doc_id: str):
    """Delete a document and its vectors."""
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete vector chunks
    delete_document_chunks(doc_id)

    # Delete file
    if os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])

    # Delete database record
    db_delete_document(doc_id)

    return {"message": "Document deleted successfully"}


@router.post("/ingest-existing")
async def ingest_existing_pdfs():
    """Ingest all PDF files already present in the asset/doc folder."""
    pdf_files = [f for f in os.listdir(UPLOAD_DIR) if f.lower().endswith('.pdf')]

    if not pdf_files:
        return {"message": "No PDF files found in asset/doc folder", "processed": 0}

    # Check which files are already ingested
    existing_docs = get_all_documents()
    existing_filenames = {d["filename"] for d in existing_docs}

    processed = []
    errors = []

    for pdf_file in pdf_files:
        if pdf_file in existing_filenames:
            continue

        file_path = os.path.join(UPLOAD_DIR, pdf_file)
        doc_id = str(uuid.uuid4())[:8]

        try:
            metadata = get_pdf_metadata(file_path)
            insert_document(
                doc_id, pdf_file, pdf_file, file_path, metadata["page_count"],
                title=metadata.get("title", ""),
                author=metadata.get("author", ""),
                year=metadata.get("year", ""),
                doi=metadata.get("doi", ""),
                publisher=metadata.get("publisher", ""),
            )

            pages = extract_text_from_pdf(file_path)
            if not pages:
                update_document(doc_id, status="error")
                errors.append({"file": pdf_file, "error": "No text extracted"})
                continue

            doc_meta = {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "year": metadata.get("year", ""),
                "doi": metadata.get("doi", ""),
                "publisher": metadata.get("publisher", ""),
            }
            chunks = chunk_text(pages, doc_id, pdf_file, doc_meta=doc_meta)
            chunk_texts = [c["text"] for c in chunks]
            embeddings = generate_embeddings(chunk_texts)

            chunk_ids = [c["id"] for c in chunks]
            metadatas = [c["metadata"] for c in chunks]
            for m in metadatas:
                m["pages"] = json.dumps(m["pages"])

            add_documents(chunk_ids, embeddings, chunk_texts, metadatas)

            full_text = " ".join([p["text"] for p in pages])
            tags = generate_tags(full_text)
            summary = generate_summary(full_text, pdf_file)

            update_document(doc_id, chunk_count=len(chunks), tags=json.dumps(tags),
                          summary=summary, status="ready")

            processed.append({"file": pdf_file, "doc_id": doc_id, "chunks": len(chunks)})

        except Exception as e:
            errors.append({"file": pdf_file, "error": str(e)})
            try:
                update_document(doc_id, status="error")
            except Exception:
                pass

    return {
        "message": f"Processed {len(processed)} documents",
        "processed": processed,
        "errors": errors,
    }


@router.post("/reingest-all")
async def reingest_all_documents():
    """
    Re-ingest ALL existing documents with enriched metadata.
    Deletes old vector chunks & re-processes each PDF.
    """
    docs = get_all_documents()
    if not docs:
        return {"message": "No documents found", "processed": 0}

    processed = []
    errors = []

    for doc in docs:
        doc_id = doc["id"]
        file_path = doc.get("file_path", "")

        if not os.path.exists(file_path):
            errors.append({"doc_id": doc_id, "file": doc.get("original_name", ""), "error": "File not found on disk"})
            continue

        try:
            # Step 1: Re-extract metadata
            metadata = get_pdf_metadata(file_path)

            # Step 2: Update DB with new metadata
            update_document(
                doc_id,
                title=metadata.get("title", ""),
                author=metadata.get("author", ""),
                year=metadata.get("year", ""),
                doi=metadata.get("doi", ""),
                publisher=metadata.get("publisher", ""),
            )

            # Step 3: Delete old vector chunks
            delete_document_chunks(doc_id)

            # Step 4: Re-extract text and re-chunk
            pages = extract_text_from_pdf(file_path)
            if not pages:
                errors.append({"doc_id": doc_id, "file": doc.get("original_name", ""), "error": "No text extracted"})
                continue

            doc_meta = {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "year": metadata.get("year", ""),
                "doi": metadata.get("doi", ""),
                "publisher": metadata.get("publisher", ""),
            }
            chunks = chunk_text(pages, doc_id, doc.get("original_name", ""), doc_meta=doc_meta)

            # Step 5: Re-embed
            chunk_texts = [c["text"] for c in chunks]
            embeddings = generate_embeddings(chunk_texts)

            # Step 6: Re-store in vector DB
            chunk_ids = [c["id"] for c in chunks]
            metadatas = [c["metadata"] for c in chunks]
            for m in metadatas:
                m["pages"] = json.dumps(m["pages"])

            add_documents(chunk_ids, embeddings, chunk_texts, metadatas)

            # Update chunk count
            update_document(doc_id, chunk_count=len(chunks), status="ready")

            processed.append({
                "doc_id": doc_id,
                "file": doc.get("original_name", ""),
                "title": metadata.get("title", ""),
                "year": metadata.get("year", ""),
                "doi": metadata.get("doi", ""),
                "chunks": len(chunks),
            })

        except Exception as e:
            errors.append({"doc_id": doc_id, "file": doc.get("original_name", ""), "error": str(e)})

    return {
        "message": f"Re-ingested {len(processed)} of {len(docs)} documents",
        "processed": processed,
        "errors": errors,
    }
