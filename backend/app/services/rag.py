import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from backend.app.core.config import settings
from backend.app.schemas.schemas import RAGCitations, RAGQueryOut

class DocumentChunk:
    def __init__(
        self,
        chunk_id: str,
        doc_id: str,
        doc_title: str,
        section_title: str,
        content: str,
        file_name: str
    ):
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.doc_title = doc_title
        self.section_title = section_title
        self.content = content.strip()
        self.file_name = file_name

class RAGKnowledgeHub:
    def __init__(self, docs_dir: Optional[Path] = None):
        self.docs_dir = docs_dir or (settings.DATA_DIR / "documents")
        self.chunks: List[DocumentChunk] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self._load_and_index()

    def _parse_markdown_into_chunks(self, file_path: Path) -> List[DocumentChunk]:
        """Parses markdown document sections into semantically bounded chunks."""
        with open(file_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        file_name = file_path.name
        doc_id = f"DOC-{file_name.split('.')[0].upper()}"

        # Extract main title
        title_match = re.search(r"^#\s+(.+)$", raw_text, re.MULTILINE)
        doc_title = title_match.group(1).strip() if title_match else file_name

        # Split by markdown H2 or H3 headers: ## or ###
        sections = re.split(r"\n(?=#{2,3}\s+)", raw_text)
        chunks = []

        for idx, sec in enumerate(sections):
            lines = sec.strip().split("\n")
            if not lines:
                continue

            first_line = lines[0].strip()
            if first_line.startswith("#"):
                sec_header = re.sub(r"^#+\s*", "", first_line)
                sec_body = "\n".join(lines[1:]).strip()
            else:
                sec_header = "Overview & Preamble"
                sec_body = sec.strip()

            if len(sec_body) > 30:  # Skip trivial headers
                chunk = DocumentChunk(
                    chunk_id=f"{doc_id}-SEC-{idx+1}",
                    doc_id=doc_id,
                    doc_title=doc_title,
                    section_title=sec_header,
                    content=sec_body,
                    file_name=file_name
                )
                chunks.append(chunk)

        return chunks

    def _load_and_index(self):
        """Indexes all markdown files in data/documents."""
        self.chunks = []
        if not self.docs_dir.exists():
            return

        for md_file in sorted(self.docs_dir.glob("*.md")):
            parsed_chunks = self._parse_markdown_into_chunks(md_file)
            self.chunks.extend(parsed_chunks)

        if not self.chunks:
            return

        # Prepare corpus for hybrid semantic search
        corpus = [
            f"{c.doc_title} {c.section_title}\n{c.content}" for c in self.chunks
        ]

        # TF-IDF with character and word n-grams for semantic and exact clause matching
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            sublinear_tf=True,
            stop_words="english",
            max_features=5000
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def query(self, user_query: str, top_k: int = 3) -> RAGQueryOut:
        """Retrieves verified document passages and generates grounded answer with strict citations."""
        if not self.chunks or self.vectorizer is None or self.tfidf_matrix is None:
            return RAGQueryOut(
                query=user_query,
                answer="No documents are currently indexed in the Knowledge Hub.",
                citations=[],
                abstention_triggered=True
            )

        # 1. Transform query and compute cosine similarities
        query_vec = self.vectorizer.transform([user_query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        max_base_similarity = float(np.max(similarities)) if len(similarities) > 0 else 0.0

        # 2. Add keyword boost for exact contractual numbers or names
        query_lower = user_query.lower()
        boosted_scores = np.copy(similarities)
        for i, c in enumerate(self.chunks):
            combined_text = f"{c.doc_title} {c.section_title} {c.content}".lower()
            for term in ["apex", "velox", "zenith", "penalty", "emergency", "freight", "transfer", "approval", "air freight", "liquidated damages"]:
                if term in query_lower and term in combined_text:
                    boosted_scores[i] += 0.22

        # 3. Rank top results
        top_indices = np.argsort(boosted_scores)[::-1][:top_k]
        top_scores = [boosted_scores[idx] for idx in top_indices]

        # 4. Domain scope verification with exact word boundaries
        supply_chain_terms = [
            "apex", "velox", "zenith", "supplier", "vendor", "contract", "agreement",
            "penalty", "liquidated damages", "late", "delay", "lead time", "moq",
            "freight", "air cargo", "shipping", "bluedart", "delhivery", "gati", "maersk",
            "procurement", "purchase order", "po", "doa", "threshold", "delegation", "approval",
            "emergency", "sourcing", "transfer", "warehouse", "stockout", "rebalancing", "inventory",
            "sla", "corridor", "transit"
        ]
        is_in_domain = any(re.search(r"\b" + re.escape(term) + r"\b", query_lower) for term in supply_chain_terms)

        # Strict Abstention Guardrail: If query is out of supply chain scope or best match score is insufficient
        if not is_in_domain or top_scores[0] < 0.14:
            return RAGQueryOut(
                query=user_query,
                answer=(
                    "Under ChainMind governance guidelines, I cannot speculate without documented policy evidence. "
                    "The Knowledge Hub is strictly restricted to supply chain vendor contracts, corporate procurement DOA policies, "
                    "freight guidelines, and disruption contingency SOPs. No relevant operational clauses were found."
                ),
                citations=[],
                abstention_triggered=True
            )

        citations = []
        context_passages = []

        for idx in top_indices:
            score = float(boosted_scores[idx])
            chunk = self.chunks[idx]
            if score >= 0.10:
                snippet = chunk.content[:350] + ("..." if len(chunk.content) > 350 else "")
                citations.append(
                    RAGCitations(
                        document_id=chunk.doc_id,
                        document_title=chunk.doc_title,
                        section=chunk.section_title,
                        snippet=snippet,
                        confidence_score=round(min(0.99, score), 3)
                    )
                )
                context_passages.append(
                    f"[{chunk.doc_title} | {chunk.section_title}]\n{chunk.content}"
                )

        # Formulate grounded answer from top verified passages
        primary_chunk = self.chunks[top_indices[0]]
        grounded_summary = (
            f"Based on {primary_chunk.doc_title} ({primary_chunk.section_title}):\n\n"
            f"{primary_chunk.content}\n\n"
            f"Reference: Document '{primary_chunk.file_name}', Section '{primary_chunk.section_title}'."
        )

        return RAGQueryOut(
            query=user_query,
            answer=grounded_summary,
            citations=citations,
            abstention_triggered=False
        )
