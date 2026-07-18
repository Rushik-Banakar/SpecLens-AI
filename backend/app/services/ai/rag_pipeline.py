"""Modular LangChain RAG orchestration using in-memory FAISS."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Protocol, Sequence

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.ai.provider_manager import provider_manager

logger = logging.getLogger("speclens.rag")

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
RETRIEVAL_TOP_K = 4


class VectorStoreProvider(Protocol):
    """Interface permitting FAISS to be swapped for Pinecone or Chroma."""

    def as_retriever(self, *, k: int): ...


class InMemoryFaissStore:
    """Process-local FAISS implementation of ``VectorStoreProvider``."""

    def __init__(self, documents: Sequence[Document]) -> None:
        """Create an in-memory vector store from document chunks.

        Args:
            documents: Chunked documents to embed and index.

        Raises:
            ValueError: If no documents are supplied.
        """
        if not documents:
            raise ValueError("Cannot create a vector store without document chunks.")
        self._store = FAISS.from_documents(list(documents), _get_embeddings())

    def as_retriever(self, *, k: int) -> Any:
        """Return a LangChain retriever configured for similarity search."""
        return self._store.as_retriever(
            search_type="similarity", search_kwargs={"k": k}
        )


@lru_cache(maxsize=1)
def _get_embeddings() -> HuggingFaceEmbeddings:
    """Load the free local sentence-transformer only once per process."""
    logger.info("[RAG] Loading embedding model: %s", EMBEDDING_MODEL)
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )


class RagPipeline:
    """Split, embed, retrieve, and reason through a RetrievalQA chain using shared Groq LLM."""

    def __init__(
        self,
        documents: Sequence[Document],
        *,
        vector_store: VectorStoreProvider | None = None,
    ) -> None:
        """Build chunk embeddings and a retriever for the supplied documents.

        Args:
            documents: Source documents to chunk and index.
            vector_store: Optional pre-built vector store for dependency injection.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        logger.info("[STAGE] Chunking started for documents")
        chunks: list[Document] = splitter.split_documents(list(documents))
        if not chunks:
            raise ValueError("Document splitting produced no chunks.")
        logger.info("[STAGE] Chunking completed: split into %d chunks", len(chunks))
        logger.info("[RAG] Split %d document(s) into %d chunk(s)", len(documents), len(chunks))

        if vector_store is None:
            logger.info("[STAGE] Embeddings generation started")
            self.vector_store = InMemoryFaissStore(chunks)
            logger.info("[STAGE] Embeddings generation completed")
        else:
            self.vector_store = vector_store

        self.retriever = self.vector_store.as_retriever(k=RETRIEVAL_TOP_K)

    def query(self, question: str) -> str:
        """Run retrieval-augmented question answering over indexed document chunks."""
        logger.info("[STAGE] Retrieval query: %s", question)
        logger.info("[RAG] Querying pipeline: %s", question)
        relevant_docs: list[Document] = []
        try:
            relevant_docs = self.retriever.get_relevant_documents(question)
            logger.info("[STAGE] Retrieval completed: found %d relevant chunks", len(relevant_docs))
        except Exception as exc:
            logger.warning("Could not retrieve relevant documents directly: %s", exc)
            
        # Manually stuff the documents into context
        context = "\n\n".join([doc.page_content for doc in relevant_docs])
        prompt = (
            f"Use the following pieces of context to answer the question at the end.\n"
            f"If you don't know the answer, just say that you don't know, don't try to make up an answer.\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {question}\n"
            f"Helpful Answer:"
        )

        logger.info("[STAGE] AI invocation started (RetrievalQA)")
        response = provider_manager.generate(prompt, temperature=0.1)
        logger.info("[STAGE] AI invocation completed (RetrievalQA)")
        return response
