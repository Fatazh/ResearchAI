
<h1 align="center">🔬 ResearchAI — AI-Powered Smart Research Repository</h1>

<p align="center">
  Asisten riset berbasis AI yang menggunakan arsitektur <strong>RAG (Retrieval-Augmented Generation)</strong> untuk menjawab pertanyaan dari dokumen PDF penelitian secara akurat, lengkap dengan sitasi otomatis.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/ChromaDB-Vector_Store-FF6F00" />
  <img src="https://img.shields.io/badge/LLM-Multi_Provider-blueviolet" />
</p>

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📄 **Upload & Manage PDF** | Upload dokumen PDF penelitian, otomatis diekstrak teks, di-chunk, dan di-index |
| 🤖 **Chat AI dengan Sitasi** | Tanyakan apapun tentang dokumen, AI menjawab dengan referensi sumber yang jelas |
| 📊 **Tabel Otomatis** | Tabel markdown dari AI di-render sebagai datatable yang rapi dan profesional |
| 🏷️ **Auto-Tagging & Summary** | Setiap dokumen otomatis diberi tags dan ringkasan oleh AI |
| 📖 **Rich Citation Tooltip** | Hover pada sitasi untuk melihat judul jurnal, penulis, tahun, DOI, dan penerbit |
| 🔌 **Multi-Provider LLM** | Mendukung Qwen, OpenAI, Groq, DeepSeek, Ollama, dan provider OpenAI-compatible lainnya |
| 🔍 **Semantic Search** | Pencarian berbasis makna menggunakan sentence-transformers + ChromaDB |

---

## 🏗️ Arsitektur

```
┌──────────────────────────────────────────────────┐
│                   Frontend (Vite)                 │
│         Vanilla JS + CSS • SPA Router             │
│   Home Page │ Research Chat │ Document Manager     │
└──────────────────┬───────────────────────────────┘
                   │ REST API
┌──────────────────▼───────────────────────────────┐
│                Backend (FastAPI)                   │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ PDF Process │  │  Chunker     │  │ Embedder │ │
│  │ (PyMuPDF)   │  │ (Sentence)   │  │ (S-Trans)│ │
│  └──────┬──────┘  └──────┬───────┘  └────┬─────┘ │
│         │                │               │        │
│  ┌──────▼──────────────▼───────────────▼──────┐  │
│  │           ChromaDB (Vector Store)            │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │ Semantic Search              │
│  ┌──────────────────▼──────────────────────────┐  │
│  │        LLM Service (OpenAI-compatible)       │  │
│  │   Qwen │ GPT-4 │ Groq │ DeepSeek │ Ollama   │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

---

## 🚀 Instalasi & Setup

### Prasyarat

- **Python** 3.10 atau lebih baru
- **Node.js** 18 atau lebih baru
- **Git**
- API Key dari salah satu LLM provider (lihat [Konfigurasi LLM](#-konfigurasi-llm))

### 1. Clone Repository

```bash
git clone https://github.com/Fatazh/ResearchAI.git
cd ResearchAI
```

### 2. Setup Backend

```bash
cd backend

# Buat virtual environment
python -m venv venv

# Aktivasi virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install python-dotenv (untuk membaca .env)
pip install python-dotenv
```

### 3. Konfigurasi Environment

```bash
# Copy template environment
cp .env.example .env

# Edit .env dan isi API key Anda
```

Buka file `backend/.env` dan isi konfigurasi:

```env
LLM_API_KEY=your_api_key_here
LLM_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
```

> Lihat bagian [Konfigurasi LLM](#-konfigurasi-llm) untuk contoh provider lain.

### 4. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install
```

### 5. Jalankan Aplikasi

Buka **2 terminal** terpisah:

**Terminal 1 — Backend:**
```bash
cd backend
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Linux/Mac
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Buka Aplikasi

Buka browser dan akses: **http://localhost:3000**

---

## 🔌 Konfigurasi LLM

Aplikasi ini mendukung **semua provider LLM yang memiliki API kompatibel OpenAI**. Cukup ubah 3 variabel di file `backend/.env`:

| Provider | `LLM_BASE_URL` | `LLM_MODEL` | Dapatkan API Key |
|---|---|---|---|
| **Qwen** | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | [DashScope](https://dashscope.aliyun.com/) |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o` | [OpenAI](https://platform.openai.com/) |
| **Groq** | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | [Groq](https://console.groq.com/) |
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | [DeepSeek](https://platform.deepseek.com/) |
| **Ollama** (Lokal) | `http://localhost:11434/v1` | `llama3` | Gratis (lokal) |
| **Together AI** | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` | [Together](https://www.together.ai/) |

### Contoh: Menggunakan OpenAI GPT-4o

```env
LLM_API_KEY=sk-proj-xxxxxxxxxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### Contoh: Menggunakan Ollama (Gratis, Lokal)

```bash
# Install & jalankan Ollama terlebih dahulu
ollama pull llama3
ollama serve
```

```env
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
```

---

## 📖 Cara Penggunaan

### 1. Upload Dokumen PDF

- Buka halaman **Documents**
- Klik tombol upload dan pilih file PDF penelitian
- Sistem akan otomatis:
  - Mengekstrak teks dari PDF
  - Memecah teks menjadi chunk-chunk kecil
  - Membuat embedding vektor untuk semantic search
  - Menggenerate tags dan ringkasan dokumen
  - Mengekstrak metadata (judul, penulis, tahun, DOI, penerbit)

### 2. Tanya AI tentang Dokumen

- Buka halaman **Research Chat**
- Ketik pertanyaan dalam bahasa apapun
- AI akan:
  - Mencari bagian dokumen yang paling relevan
  - Menyusun jawaban berdasarkan konteks
  - Menyertakan sitasi `[Source N]` untuk setiap klaim
- **Hover** pada badge sitasi 📖 untuk melihat detail sumber

### 3. Fitur Tabel

Jika AI merespons dengan data tabel, tabel akan dirender otomatis sebagai datatable profesional dengan:
- Header berwarna tosca
- Alternating row colors (zebra striping)
- Hover effect pada baris
- Scroll horizontal untuk tabel lebar

---

## 📁 Struktur Proyek

```
ResearchAI/
├── asset/
│   └── doc/                    # Upload folder untuk PDF
├── backend/
│   ├── .env                    # Konfigurasi lokal (tidak di-push)
│   ├── .env.example            # Template konfigurasi
│   ├── config.py               # Konfigurasi aplikasi
│   ├── main.py                 # Entry point FastAPI
│   ├── requirements.txt        # Python dependencies
│   ├── routes/
│   │   ├── documents.py        # API untuk upload, list, delete dokumen
│   │   └── query.py            # API untuk chat/query AI
│   └── services/
│       ├── chunker.py          # Text chunking dengan overlap
│       ├── database.py         # SQLite database layer
│       ├── embedder.py         # Sentence-Transformers embedding
│       ├── llm_service.py      # LLM abstraction layer
│       ├── pdf_processor.py    # PDF text extraction & metadata
│       └── vector_store.py     # ChromaDB vector store
├── frontend/
│   ├── index.html              # HTML entry point
│   ├── package.json            # Node.js dependencies
│   ├── vite.config.js          # Vite bundler config
│   └── src/
│       ├── main.js             # SPA router & app init
│       ├── api.js              # Backend API client
│       ├── style.css           # Global styles (Tosca theme)
│       ├── assets/img/         # Logo & static assets
│       └── pages/
│           ├── home.js         # Landing page
│           ├── chat.js         # Research chat interface
│           └── documents.js    # Document manager
└── .gitignore
```

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Vanilla JavaScript, Vite, CSS3 |
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | SQLite (metadata), ChromaDB (vectors) |
| **AI/ML** | Sentence-Transformers (embedding), OpenAI-compatible LLM |
| **PDF Processing** | PyMuPDF (fitz) |
| **NLP** | NLTK (sentence tokenization) |

---

## 🔧 API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/documents/upload` | Upload PDF baru |
| `GET` | `/api/documents/` | List semua dokumen |
| `GET` | `/api/documents/{id}` | Detail satu dokumen |
| `DELETE` | `/api/documents/{id}` | Hapus dokumen |
| `GET` | `/api/documents/{id}/view` | Lihat PDF di browser |
| `GET` | `/api/documents/{id}/download` | Download PDF |
| `POST` | `/api/documents/ingest-existing` | Ingest PDF yang sudah ada di folder |
| `POST` | `/api/documents/reingest-all` | Re-ingest semua dokumen (untuk update metadata) |
| `POST` | `/api/query` | Kirim pertanyaan ke AI |

---

## ❓ FAQ

**Q: Apakah bisa menggunakan model AI gratis?**
> Ya! Gunakan [Ollama](https://ollama.com/) untuk menjalankan model AI secara lokal dan gratis.

**Q: Bahasa apa yang didukung untuk pertanyaan?**
> Semua bahasa yang didukung oleh model LLM yang Anda gunakan. AI akan menjawab dalam bahasa yang sama dengan pertanyaan.

**Q: Format file apa saja yang didukung?**
> Saat ini hanya mendukung file **PDF**. 

**Q: Apakah data dokumen aman?**
> Ya. Semua data disimpan secara lokal di komputer Anda (SQLite + ChromaDB). Tidak ada data yang dikirim ke server lain kecuali teks yang dikirim ke API LLM untuk menjawab pertanyaan.

---

## 📝 Lisensi

Proyek ini bersifat open-source. Silakan gunakan dan modifikasi sesuai kebutuhan.

---

<p align="center">
  Dibuat dengan ❤️ untuk komunitas riset Indonesia
</p>
