import os
import re
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from db.database import SessionLocal
from db.models import KnowledgeChunk, Dataset

load_dotenv()


class KnowledgeAgent:
    """RAG Knowledge Agent for AgentInsight AI.
    
    Uses TF-IDF-based vectorization (scikit-learn) and cosine similarity for local,
    dependency-free retrieval over dataset audit issues and executive insight briefings,
    paired with LLM synthesis for grounded question answering.
    """

    def __init__(
        self,
        anthropic_api_key: Optional[str] = None,
        groq_api_key: Optional[str] = None,
        anthropic_model: Optional[str] = None,
        groq_model: Optional[str] = None,
    ):
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.groq_api_key = groq_api_key or os.getenv("GROQ_API_KEY")
        self.anthropic_model = anthropic_model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
        self.groq_model = groq_model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    def index_pipeline_run(
        self,
        dataset_id: int,
        audit_report: Optional[Dict[str, Any]],
        insight_result: Optional[Dict[str, Any]],
        filename: Optional[str] = None,
        db_session=None,
    ) -> List[Dict[str, Any]]:
        """Indexes audit issues and executive summary from a completed pipeline run into the DB.
        
        Args:
            dataset_id: ID of the dataset
            audit_report: data_quality_report dictionary
            insight_result: insight_result dictionary (summary, key_finding, recommendation)
            filename: optional filename for context
            db_session: optional active SQLAlchemy session
            
        Returns:
            List of indexed chunk dictionaries
        """
        chunks_to_create = []
        name_str = filename or f"Dataset #{dataset_id}"

        # 1. Audit issues chunking
        flagged_issues = (audit_report or {}).get("flagged_for_review", [])
        for issue in flagged_issues:
            row_idx = issue.get("row_index", "Unknown")
            col = issue.get("column") or issue.get("column_name", "Unknown")
            orig_val = issue.get("original_value")
            orig_val_str = f"'{orig_val}'" if orig_val is not None else "null"
            reason = issue.get("reason", "Flagged during data cleaning audit")

            chunk_text = (
                f"Dataset #{dataset_id} ({name_str}) - Row {row_idx}, column '{col}': "
                f"{reason}. Original value was {orig_val_str}."
            )
            chunks_to_create.append({
                "dataset_id": dataset_id,
                "chunk_text": chunk_text,
                "chunk_type": "audit_issue",
            })

        # 2. Executive insight summary chunking
        if insight_result:
            summary = insight_result.get("summary", "")
            key_finding = insight_result.get("key_finding", "")
            recommendation = insight_result.get("recommendation", "")

            insight_text_parts = [f"Dataset #{dataset_id} ({name_str}) Executive Analysis:"]
            if summary:
                insight_text_parts.append(f"Summary: {summary}")
            if key_finding:
                insight_text_parts.append(f"Key Finding: {key_finding}")
            if recommendation:
                insight_text_parts.append(f"Recommendation: {recommendation}")

            full_insight_text = " ".join(insight_text_parts)
            chunks_to_create.append({
                "dataset_id": dataset_id,
                "chunk_text": full_insight_text,
                "chunk_type": "insight_summary",
            })

        # Persist chunks to database
        own_session = False
        session = db_session
        if session is None:
            session = SessionLocal()
            own_session = True

        saved_records = []
        try:
            for item in chunks_to_create:
                chunk_obj = KnowledgeChunk(
                    dataset_id=item["dataset_id"],
                    chunk_text=item["chunk_text"],
                    chunk_type=item["chunk_type"],
                )
                session.add(chunk_obj)
            session.commit()
            saved_records = chunks_to_create
        except Exception as exc:
            session.rollback()
            print(f"[KnowledgeAgent] Warning: Failed to persist knowledge chunks to DB: {exc}")
        finally:
            if own_session:
                session.close()

        return saved_records

    def answer_question(
        self,
        question: str,
        current_dataset_id: Optional[int] = None,
        scope: str = "current",
        top_k: int = 5,
        db_session=None,
    ) -> Dict[str, Any]:
        """Answers a user meta-question using TF-IDF retrieval + LLM synthesis.
        
        Args:
            question: User query text
            current_dataset_id: ID of the currently active dataset
            scope: "current" or "all_history"
            top_k: Number of chunks to retrieve
            db_session: optional SQLAlchemy session
            
        Returns:
            Dict with "answer" and "sources"
        """
        if not question or not question.strip():
            return {
                "answer": "Please ask a specific question about the dataset analysis or audit findings.",
                "sources": [],
            }

        own_session = False
        session = db_session
        if session is None:
            session = SessionLocal()
            own_session = True

        try:
            # Query chunks based on scope
            query = session.query(KnowledgeChunk)
            if scope == "current" and current_dataset_id is not None:
                query = query.filter(KnowledgeChunk.dataset_id == current_dataset_id)

            db_chunks = query.all()

            # If current dataset has no chunks but there are chunks overall, or if empty
            if not db_chunks:
                if scope == "current" and current_dataset_id is not None:
                    # Check if any chunks exist in any dataset
                    any_chunks = session.query(KnowledgeChunk).first()
                    if any_chunks:
                        return {
                            "answer": f"No audit issues or insights found for current dataset #{current_dataset_id}. You can switch scope to 'All Historical Uploads' to query other uploaded datasets.",
                            "sources": [],
                        }
                return {
                    "answer": "No analysis or audit data is currently available in the knowledge base. Please run a pipeline analysis on a dataset first.",
                    "sources": [],
                }

            # Retrieve top relevant chunks using TF-IDF + Row boost
            retrieved_sources = self._retrieve_relevant_chunks(question, db_chunks, top_k=top_k)

            # Generate grounded LLM answer
            answer = self._generate_grounded_answer(question, retrieved_sources, scope=scope)

            return {
                "answer": answer,
                "sources": [
                    {
                        "text": s["text"],
                        "chunk_type": s["chunk_type"],
                        "dataset_id": s["dataset_id"],
                        "score": round(float(s["score"]), 3),
                    }
                    for s in retrieved_sources
                ],
            }
        finally:
            if own_session:
                session.close()

    def _retrieve_relevant_chunks(
        self,
        query: str,
        db_chunks: List[KnowledgeChunk],
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        """Computes TF-IDF cosine similarity scores and exact row mention boosts."""
        corpus = [c.chunk_text for c in db_chunks]

        # Extract explicit row number query if present (e.g. "row 13" or "row #13")
        row_matches = re.findall(r"(?i)\brow\s*#?(\d+)\b", query)
        target_rows = set(row_matches)

        # Fit TF-IDF Vectorizer
        try:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                stop_words="english",
                lowercase=True,
                max_features=2500,
            )
            tfidf_matrix = vectorizer.fit_transform(corpus)
            query_vec = vectorizer.transform([query])
            sim_scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
        except Exception:
            # Fallback if vocabulary is too sparse or empty
            sim_scores = [0.0] * len(corpus)

        scored_chunks = []
        for idx, chunk in enumerate(db_chunks):
            base_score = float(sim_scores[idx]) if idx < len(sim_scores) else 0.0
            boost = 0.0

            # Boost if chunk contains explicitly asked row number
            chunk_text_lower = chunk.chunk_text.lower()
            for r in target_rows:
                if f"row {r}" in chunk_text_lower or f"row #{r}" in chunk_text_lower:
                    boost += 2.0  # Dominant boost for exact row inquiry

            # Boost insight summary if user asks about summary/overview/trend
            if chunk.chunk_type == "insight_summary" and any(
                w in query.lower() for w in ["summary", "finding", "recommendation", "trend", "overview", "compare", "past"]
            ):
                boost += 0.5

            total_score = base_score + boost
            scored_chunks.append({
                "text": chunk.chunk_text,
                "chunk_type": chunk.chunk_type,
                "dataset_id": chunk.dataset_id,
                "score": total_score,
            })

        # Sort descending by total score
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)

        # Take top_k
        top_chunks = scored_chunks[:top_k]

        # Filter out 0-score chunks only if we have at least some non-zero matches
        non_zero = [c for c in top_chunks if c["score"] > 0]
        if non_zero:
            return non_zero
        return top_chunks[:min(3, len(top_chunks))]

    def _call_llm(self, prompt: str, system_prompt: str) -> str:
        """Invokes Anthropic API if key is available, else Groq."""
        # 1. Anthropic API
        if self.anthropic_api_key and not self.anthropic_api_key.startswith("your_"):
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.anthropic_api_key)
                response = client.messages.create(
                    model=self.anthropic_model,
                    max_tokens=800,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                if response.content and len(response.content) > 0:
                    first_block = response.content[0]
                    text_val = getattr(first_block, "text", None)
                    if text_val is not None:
                        return str(text_val).strip()
            except Exception as e:
                if not self.groq_api_key:
                    raise RuntimeError(f"Anthropic API error: {str(e)}")

        # 2. Groq fallback
        if self.groq_api_key:
            from groq import Groq
            client = Groq(api_key=self.groq_api_key)

            kwargs: Dict[str, Any] = {
                "model": self.groq_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 2048,
            }
            if "gpt-oss" in str(self.groq_model).lower():
                kwargs["extra_body"] = {"reasoning_effort": "low"}

            try:
                response = client.chat.completions.create(**kwargs)
                if response.choices and len(response.choices) > 0:
                    content = (response.choices[0].message.content or "").strip()
                    if content:
                        return content
            except Exception:
                pass

            # Fallback to instruction model
            try:
                fb_response = client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.1,
                    max_tokens=2048,
                )
                if fb_response.choices and len(fb_response.choices) > 0:
                    fb_content = (fb_response.choices[0].message.content or "").strip()
                    if fb_content:
                        return fb_content
            except Exception:
                pass

        raise RuntimeError("No active LLM API key available.")

    def _generate_grounded_answer(
        self,
        question: str,
        sources: List[Dict[str, Any]],
        scope: str = "current",
    ) -> str:
        """Synthesizes a grounded answer from retrieved source chunks."""
        if not sources:
            return "No relevant audit issues or insight records were found for your query."

        # Format context
        context_blocks = []
        for i, s in enumerate(sources, 1):
            tag = "Audit Issue" if s["chunk_type"] == "audit_issue" else "Executive Insight"
            context_blocks.append(f"[{i}] ({tag} | Dataset #{s['dataset_id']}):\n{s['text']}")
        context_str = "\n\n".join(context_blocks)

        system_prompt = (
            "You are an expert AI Data Quality Auditor & Business Intelligence Knowledge Agent for AgentInsight AI.\n"
            "Your task is to answer the user's question directly, clearly, and accurately based ONLY on the provided context sources.\n\n"
            "STRICT GROUNDING RULES:\n"
            "1. Ground every statement directly in the retrieved evidence.\n"
            "2. When explaining why a row or transaction was flagged, explicitly state:\n"
            "   - Which dataset and row index it occurred in\n"
            "   - The specific column name\n"
            "   - The original invalid or unparseable value\n"
            "   - The exact reason it was flagged or rejected\n"
            "3. When answering comparison questions across uploads, compare the specific dataset findings and issues directly.\n"
            "4. Be concise, objective, and professional. Do not invent facts."
        )

        user_prompt = (
            f"Retrieved Evidence Sources:\n"
            f"-------------------------\n"
            f"{context_str}\n"
            f"-------------------------\n\n"
            f"User Question: {question}\n\n"
            f"Answer the question based strictly on the retrieved sources above:"
        )

        try:
            return self._call_llm(user_prompt, system_prompt)
        except Exception:
            # Deterministic fallback when LLM is offline or no API key is provided
            return self._deterministic_fallback_answer(question, sources)

    def _deterministic_fallback_answer(
        self, question: str, sources: List[Dict[str, Any]]
    ) -> str:
        """Produces a clean, factual answer extracted directly from sources when LLM is offline."""
        top_source = sources[0]["text"]
        # If user asked about row X
        row_match = re.search(r"(?i)\brow\s*#?(\d+)\b", question)
        if row_match:
            r = row_match.group(1)
            matching = [s["text"] for s in sources if f"row {r}" in s["text"].lower()]
            if matching:
                return f"Based on the audit records: {matching[0]}"

        if len(sources) == 1:
            return f"Retrieved record: {top_source}"

        answer_lines = ["Based on the retrieved analysis records:"]
        for s in sources[:3]:
            answer_lines.append(f"• {s['text']}")
        return "\n".join(answer_lines)
