"""
SQLite Database Service
Manages document metadata storage.
"""

import sqlite3
import json
from datetime import datetime
from config import SQLITE_PATH


def get_connection():
    """Get a SQLite connection."""
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            page_count INTEGER DEFAULT 0,
            chunk_count INTEGER DEFAULT 0,
            tags TEXT DEFAULT '[]',
            summary TEXT DEFAULT '',
            status TEXT DEFAULT 'processing',
            title TEXT DEFAULT '',
            author TEXT DEFAULT '',
            year TEXT DEFAULT '',
            doi TEXT DEFAULT '',
            publisher TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            citations TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    """)

    # --- Schema migration: add new columns if missing ---
    cursor = conn.execute("PRAGMA table_info(documents)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    new_cols = {
        "title": "TEXT DEFAULT ''",
        "author": "TEXT DEFAULT ''",
        "year": "TEXT DEFAULT ''",
        "doi": "TEXT DEFAULT ''",
        "publisher": "TEXT DEFAULT ''",
    }
    for col_name, col_type in new_cols.items():
        if col_name not in existing_cols:
            conn.execute(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()


def insert_document(doc_id: str, filename: str, original_name: str,
                    file_path: str, page_count: int = 0,
                    title: str = "", author: str = "",
                    year: str = "", doi: str = "", publisher: str = ""):
    """Insert a new document record."""
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """INSERT INTO documents (id, filename, original_name, file_path, page_count,
           title, author, year, doi, publisher, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (doc_id, filename, original_name, file_path, page_count,
         title, author, year, doi, publisher, now, now)
    )
    conn.commit()
    conn.close()


def update_document(doc_id: str, **kwargs):
    """Update document fields."""
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    kwargs["updated_at"] = now

    set_clauses = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [doc_id]

    conn.execute(f"UPDATE documents SET {set_clauses} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_document(doc_id: str) -> dict | None:
    """Get a single document by ID."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    conn.close()
    if row:
        doc = dict(row)
        doc["tags"] = json.loads(doc["tags"]) if doc["tags"] else []
        return doc
    return None


def get_all_documents() -> list[dict]:
    """Get all documents."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM documents ORDER BY created_at DESC"
    ).fetchall()
    conn.close()

    docs = []
    for row in rows:
        doc = dict(row)
        doc["tags"] = json.loads(doc["tags"]) if doc["tags"] else []
        docs.append(doc)
    return docs


def delete_document(doc_id: str):
    """Delete a document record."""
    conn = get_connection()
    conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()


def get_document_count() -> int:
    """Get total document count."""
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    conn.close()
    return count


def save_chat(question: str, answer: str, citations: list):
    """Save a chat Q&A pair."""
    conn = get_connection()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """INSERT INTO chat_history (question, answer, citations, created_at)
           VALUES (?, ?, ?, ?)""",
        (question, answer, json.dumps(citations), now)
    )
    conn.commit()
    conn.close()


def get_chat_history(limit: int = 50) -> list[dict]:
    """Get recent chat history."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()

    chats = []
    for row in rows:
        chat = dict(row)
        chat["citations"] = json.loads(chat["citations"]) if chat["citations"] else []
        chats.append(chat)

    return list(reversed(chats))


def get_stats() -> dict:
    """Get application statistics."""
    conn = get_connection()
    doc_count = conn.execute("SELECT COUNT(*) FROM documents WHERE status = 'ready'").fetchone()[0]
    chat_count = conn.execute("SELECT COUNT(*) FROM chat_history").fetchone()[0]
    total_chunks = conn.execute("SELECT COALESCE(SUM(chunk_count), 0) FROM documents").fetchone()[0]
    conn.close()

    return {
        "document_count": doc_count,
        "chat_count": chat_count,
        "total_chunks": total_chunks,
    }
