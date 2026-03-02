import os
from dotenv import load_dotenv

load_dotenv()

# LLM Configuration — supports any OpenAI-compatible API
# Examples: Qwen (DashScope), OpenAI, Groq, DeepSeek, Ollama, etc.
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen-plus")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "asset", "doc")
CHROMA_DIR = os.path.join(BASE_DIR, "backend", "data", "chromadb")
SQLITE_PATH = os.path.join(BASE_DIR, "backend", "data", "metadata.db")

# Chunking settings
CHUNK_SIZE = 500       # approximate tokens per chunk
CHUNK_OVERLAP = 50     # overlap tokens between chunks

# Search settings
TOP_K_RESULTS = 5      # number of documents to retrieve
SIMILARITY_THRESHOLD = 0.3

# Embedding model
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)
os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
