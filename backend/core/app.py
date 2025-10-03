# app.py - College Assistant RAG Backend (SIH + Gemini Flash + Google Voice, Full Version)

from dotenv import load_dotenv

load_dotenv()

import json
import os
import time
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
from concurrent.futures import ThreadPoolExecutor
import warnings
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Body, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

# LangChain (for RAG vectorstore)
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Google AI SDKs
import google.generativeai as genai

# PDF loaders
try:
    import pdfplumber

    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    import PyPDF2

    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    from langchain_community.document_loaders import PyPDFLoader

    LANGCHAIN_PDF_AVAILABLE = True
except ImportError:
    LANGCHAIN_PDF_AVAILABLE = False

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", module="langchain")

# -------------------- CONFIG --------------------
PERSIST_DIR = os.getenv("PERSIST_DIR", "./chroma_db")
DEFAULT_K = int(os.getenv("DEFAULT_K", "5"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "800"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
TEMP_MD_DIR = os.getenv("TEMP_MD_DIR", "./temp_md")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "20"))

os.makedirs(PERSIST_DIR, exist_ok=True)
os.makedirs(TEMP_MD_DIR, exist_ok=True)

executor = ThreadPoolExecutor(max_workers=4)

# Gemini + Google Clients
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_EMBED_MODEL = "models/embedding-001"

# -------------------- FASTAPI --------------------
app = FastAPI(
    title="College Assistant RAG API (SIH + Gemini + Google Voice)",
    version="9.0",
    description="RAG backend with admin approval, student chat, streaming chat, and Google voice chat",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- MODELS --------------------
class ChatRequest(BaseModel):
    message: str
    department: Optional[str] = "General"
    k: Optional[int] = DEFAULT_K


class ChatResponse(BaseModel):
    response: str
    department: str
    sources: List[Dict[str, Any]] = []
    elapsed_seconds: float


class UploadResponse(BaseModel):
    message: str
    num_chunks: int
    stored_at: str


# -------------------- GLOBALS --------------------
_vectorstore = None
upload_progress = {}
_doc_approval_status: Dict[str, bool] = {}
_chat_history: Dict[str, List[Dict[str, str]]] = {}
_activity_log: List[Dict[str, str]] = []


# -------------------- UTILS --------------------
def log_activity(message: str):
    _activity_log.insert(
        0, {"message": message, "time": datetime.now(timezone.utc).strftime("%H:%M:%S")}
    )
    if len(_activity_log) > 20:
        _activity_log.pop()


def extract_text_from_pdf(pdf_path: Path) -> str:
    if PDFPLUMBER_AVAILABLE:
        with pdfplumber.open(pdf_path) as pdf:
            return "\n\n".join([p.extract_text() or "" for p in pdf.pages])
    if LANGCHAIN_PDF_AVAILABLE:
        loader = PyPDFLoader(str(pdf_path))
        return "\n\n".join([p.page_content for p in loader.load()])
    if PYPDF2_AVAILABLE:
        reader = PyPDF2.PdfReader(open(pdf_path, "rb"))
        return "\n\n".join([p.extract_text() or "" for p in reader.pages])
    raise ImportError("No PDF loader available. Install pdfplumber or PyPDF2.")


def preprocess_text(text: str) -> str:
    text = text.replace("&amp;", "&")
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def chunk_text(text: str, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP) -> List[str]:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", "! ", "? ", " "],
        length_function=len,
    )
    chunks = splitter.split_text(text)
    return [c.strip() for c in chunks if len(c.strip()) > 50]


def embed_and_store_fast(
    chunks: List[str],
    metadata: Optional[List[Dict]] = None,
    batch_size: int = BATCH_SIZE,
):
    global _vectorstore
    if _vectorstore is None:
        embeddings = GoogleGenerativeAIEmbeddings(model=GEMINI_EMBED_MODEL)
        _vectorstore = Chroma(
            persist_directory=PERSIST_DIR, embedding_function=embeddings
        )

    total = len(chunks)
    if total <= batch_size:
        _vectorstore.add_texts(texts=chunks, metadatas=metadata)
        return _vectorstore

    futures = []
    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        meta_batch = metadata[i : i + batch_size] if metadata else None
        futures.append(
            executor.submit(_vectorstore.add_texts, texts=batch, metadatas=meta_batch)
        )

    for f in futures:
        f.result()
    return _vectorstore


def create_college_context_prompt(query: str, department: str) -> str:
    return f"""
    You are a knowledgeable and authoritative college assistant specializing in {department}.
    Your job is to answer to the point student questions about college rules, regulations, and policies.

    IMPORTANT:
    - Always give a clear, direct, to the point, and complete answer.
    - Assume the context is THIS COLLEGE.
    - Respond in the same language as the student's last question.

    Student Question: {query}
    """


async def run_gemini(query: str) -> str:
    model = genai.GenerativeModel(GEMINI_MODEL)
    resp = model.generate_content(query)
    return resp.text if resp and resp.text else "No response generated."


# -------------------- STARTUP --------------------
@app.on_event("startup")
def startup_event():
    global _vectorstore
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model=GEMINI_EMBED_MODEL)
        _vectorstore = Chroma(
            persist_directory=PERSIST_DIR, embedding_function=embeddings
        )
        print(f"✅ Vector DB loaded from {PERSIST_DIR} using Gemini embeddings")
    except Exception as e:
        print(f"❌ Failed to load vectorstore: {e}")
        _vectorstore = None
    print("🔥 Gemini + Google Voice backend ready!")


# -------------------- HEALTH --------------------
@app.get("/health")
def health():
    return {"status": "ok", "vectorstore_loaded": _vectorstore is not None}


# -------------------- STUDENT CHAT --------------------
@app.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    payload: ChatRequest = Body(...), user_id: str = "default"
):
    if _vectorstore is None:
        return ChatResponse(
            response="Vectorstore not initialized. Upload some PDFs first or call /test_retrieval.",
            department=payload.department,
            sources=[],
            elapsed_seconds=0.0,
        )

    if user_id not in _chat_history:
        _chat_history[user_id] = []

    _chat_history[user_id].append({"role": "student", "content": payload.message})
    conversation = "\n".join(
        [
            f"{msg['role'].capitalize()}: {msg['content']}"
            for msg in _chat_history[user_id]
        ]
    )

    prompt = f"""
    The following is a conversation between a student and a helpful college assistant specializing in {payload.department}.
    You must maintain context across turns.
    Always respond in the same language as the student's last question.
    Always assume the student is asking about THIS college.

    Conversation so far:
    {conversation}

    Assistant:
    """

    start = time.time()
    result_text = await run_gemini(prompt)
    _chat_history[user_id].append({"role": "assistant", "content": result_text})
    _chat_history[user_id] = _chat_history[user_id][-20:]

    retriever = _vectorstore.as_retriever(search_kwargs={"k": payload.k or DEFAULT_K})
    docs = retriever.get_relevant_documents(payload.message)
    approved = [
        d for d in docs if _doc_approval_status.get(d.metadata.get("source"), False)
    ]

    elapsed = time.time() - start
    log_activity(f"💬 Chat message: {payload.message[:30]}...")
    return ChatResponse(
        response=result_text,
        department=payload.department,
        sources=[{"source": d.metadata.get("source")} for d in approved],
        elapsed_seconds=round(elapsed, 3),
    )


@app.post("/chat_stream")
async def chat_stream(payload: ChatRequest = Body(...)):
    query = create_college_context_prompt(payload.message, payload.department)

    def event_stream():
        retriever = _vectorstore.as_retriever(
            search_kwargs={"k": payload.k or DEFAULT_K}
        )
        docs = retriever.get_relevant_documents(payload.message)
        yield json.dumps({"type": "status", "message": "📚 searching documents"}) + "\n"
        for d in docs:
            preview = d.page_content[:120].replace("\n", " ")
            yield json.dumps(
                {"type": "doc", "source": d.metadata.get("source"), "preview": preview}
            ) + "\n"

        yield json.dumps(
            {"type": "status", "message": "🤔 Generating answer..."}
        ) + "\n"

        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(query, stream=True)
        for chunk in response:
            if chunk.text:
                yield json.dumps({"type": "token", "text": chunk.text}) + "\n"

        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/json")


# -------------------- ADMIN CHAT --------------------
@app.post("/admin_chat", response_model=ChatResponse)
async def admin_chat(payload: ChatRequest = Body(...)):
    start = time.time()
    query = create_college_context_prompt(payload.message, payload.department)
    result_text = await run_gemini(query)

    retriever = _vectorstore.as_retriever(search_kwargs={"k": payload.k or DEFAULT_K})
    docs = retriever.get_relevant_documents(payload.message)

    elapsed = time.time() - start
    log_activity(f"🛠 Admin chat: {payload.message[:30]}...")
    return ChatResponse(
        response=result_text,
        department=payload.department,
        sources=[{"source": d.metadata.get("source")} for d in docs],
        elapsed_seconds=round(elapsed, 3),
    )


# -------------------- ADMIN DOC CONTROL --------------------
@app.post("/upload_pdf_async")
async def upload_pdf_async(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    content = await file.read()
    upload_id = f"{file.filename}_{int(time.time())}"
    upload_progress[upload_id] = {"status": "started", "progress": 0}
    background_tasks.add_task(process_pdf_background, upload_id, content, file.filename)

    log_activity(f"📤 Upload started: {file.filename}")
    return {"upload_id": upload_id, "message": "Upload started"}


async def process_pdf_background(upload_id: str, file_content: bytes, filename: str):
    try:
        temp_path = Path(TEMP_MD_DIR) / filename
        temp_path.write_bytes(file_content)
        upload_progress[upload_id] = {"status": "processing", "progress": 20}

        text = extract_text_from_pdf(temp_path)
        text = preprocess_text(text)
        chunks = chunk_text(text)
        if not chunks:
            upload_progress[upload_id] = {"status": "error", "error": "No valid text"}
            return

        metadata = [{"source": filename, "chunk_id": i} for i in range(len(chunks))]
        embed_and_store_fast(chunks, metadata)
        _doc_approval_status[filename] = False

        upload_progress[upload_id] = {
            "status": "completed",
            "progress": 100,
            "num_chunks": len(chunks),
        }
        log_activity(f"✅ Upload completed: {filename}")
        try:
            temp_path.unlink()
        except:
            pass
    except Exception as e:
        upload_progress[upload_id] = {"status": "error", "error": str(e)}


@app.get("/upload_status/{upload_id}")
def get_upload_status(upload_id: str):
    return upload_progress.get(upload_id, {"status": "not_found"})


@app.post("/approve_doc/{filename}")
def approve_doc(filename: str):
    if filename not in _doc_approval_status:
        raise HTTPException(status_code=404, detail="Doc not found")
    _doc_approval_status[filename] = True
    log_activity(f"✔ Approved: {filename}")
    return {"message": f"{filename} approved and now available to students"}


@app.delete("/delete_doc/{filename}")
def delete_doc(filename: str):
    global _vectorstore
    try:
        _vectorstore._collection.delete(where={"source": filename})
        _doc_approval_status.pop(filename, None)
        log_activity(f"🗑 Deleted: {filename}")
        return {"message": f"{filename} deleted from vectorstore"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")


@app.post("/test_retrieval")
def test_retrieval(request: ChatRequest):
    if _vectorstore is None:
        return {"status": "error", "message": "No docs uploaded"}
    retriever = _vectorstore.as_retriever(search_kwargs={"k": 5})
    docs = retriever.get_relevant_documents(request.message)
    return {
        "status": "success",
        "query": request.message,
        "retrieved_docs": [
            {"source": d.metadata.get("source"), "preview": d.page_content[:200]}
            for d in docs
        ],
    }


@app.get("/documents")
def list_documents():
    docs = []
    for filename, approved in _doc_approval_status.items():
        docs.append(
            {"name": filename, "status": "verified" if approved else "processing"}
        )
    return docs


@app.get("/recent_activities")
def get_recent_activities():
    return _activity_log


# -------------------- RUN --------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
