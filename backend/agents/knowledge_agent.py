"""
RAG Knowledge Agent
-------------------
Ye agent user ke analytical aur meta-questions ke answers deta hai:
Example:
- "Why was row 22 flagged?"
- "What data quality issues were found?"
- "How does this compare to past uploads?"

Architecture:
1. Indexing: Pipeline run ke baad audit issues aur executive summaries ko chunks bana kar SQLite database me store karta hai.
2. Retrieval: Scikit-learn TF-IDF Vectorizer + Cosine Similarity se user ke question se match hone wale top chunks dhoondta hai.
   Agar question me specific row number ho (e.g. 'row 22'), to exact row mention ko dominant score boost (+2.0) deta hai.
   Same row ke multiple chunks ko merge/deduplicate karta hai taaki duplicate issues UI me clutter na karein.
3. Grounded Synthesis: LLM ko strictly retrieved context dekar grounded answer generate karwata hai with source citations.
   Offline / No API key hone par deterministic rule-based answer banata hai.
"""
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
        """
        Completed pipeline run ke data ko chunks me divide karke DB me persist karta hai:
        1. Flagged audit issues (row number, column, original value, reason)
        2. Executive summary findings and recommendations
        """
        chunks_to_create = []
        name_str = filename or f"Dataset #{dataset_id}"

        # -------------------------------------------------------------
        # 1. Audit issues chunking: Har flagged error ka concise text chunk banao
        # -------------------------------------------------------------
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

        # -------------------------------------------------------------
        # 2. Executive insight summary chunking: Key findings ko chunk me add karo
        # -------------------------------------------------------------
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

            full_insight_text = "\n".join(insight_text_parts)
            chunks_to_create.append({
                "dataset_id": dataset_id,
                "chunk_text": full_insight_text,
                "chunk_type": "insight_summary",
            })

        # -------------------------------------------------------------
        # 3. Database me batch save karo
        # -------------------------------------------------------------
        session = db_session
        own_session = False
        if session is None:
            session = SessionLocal()
            own_session = True

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
        except Exception:
            session.rollback()
            raise RuntimeError("Knowledge indexing failed") from None
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
        """
        Main Q&A function:
        1. Scope check (Sirf current dataset ya Saare historical uploads)
        2. TF-IDF retrieval se top relevant chunks dhoondna
        3. LLM synthesis se grounded response return karna
        """
        if not question or not question.strip():
            return {
                "answer": "Please ask a specific question about the dataset analysis or audit findings.",
                "sources": [],
            }

        own_session = False
        if scope not in {'current', 'all_history'}:
            raise ValueError('Invalid knowledge scope')
        if scope == 'current' and current_dataset_id is None:
            raise ValueError('Current scope requires a dataset ID')

        session = db_session
        if session is None:
            session = SessionLocal()
            own_session = True

        try:
            if current_dataset_id is not None and session.get(Dataset, current_dataset_id) is None:
                raise ValueError('Dataset not found')

            # Scope ke mutabiq database chunks fetch karo
            query = session.query(KnowledgeChunk)
            if scope == "current" and current_dataset_id is not None:
                query = query.filter(KnowledgeChunk.dataset_id == current_dataset_id)
            db_chunks = query.all()

            if not db_chunks:
                if scope == "current" and current_dataset_id is not None:
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

            # TF-IDF + Row Boost retrieval
            retrieved_sources = self._retrieve_relevant_chunks(question, db_chunks, top_k=top_k)

            # Grounded LLM synthesis
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
        """
        TF-IDF vector space model se cosine similarity calculate karta hai.
        Smart Boosts:
        - Exact row number match (e.g. 'row 13'): +2.0 boost
        - Executive summary match (e.g. 'summary', 'recommendation'): +0.5 boost
        - Same row deduplication: Row 22 ke multiple column issues ko ek single chunk me combine karta hai
        """
        corpus = [c.chunk_text for c in db_chunks]

        # User question me koi specific row number pucha gaya hai kya? (e.g. 'row 22')
        row_matches = re.findall(r"(?i)\brow\s*#?(\d+)\b", query)
        target_rows = set(row_matches)

        # TF-IDF similarity calculate karo
        try:
            from retrieval_cache import index
            vectorizer, tfidf_matrix = index(db_chunks)
            query_vec = vectorizer.transform([query])
            sim_scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
        except Exception:
            sim_scores = [0.0] * len(corpus)

        scored_chunks = []
        for idx, chunk in enumerate(db_chunks):
            base_score = float(sim_scores[idx]) if idx < len(sim_scores) else 0.0
            boost = 0.0

            # Row number match boost
            chunk_text_lower = chunk.chunk_text.lower()
            for r in target_rows:
                if re.search(r'\brow\s*#?' + re.escape(r) + r'\b', chunk_text_lower):
                    boost += 2.0

            # Overview / summary query boost
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

        # Highest score pehle sort karo
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)

        # -------------------------------------------------------------
        # Deduplication: Ek hi row ke alag-alag columns ko ek chunk me merge karo
        # (e.g. Row 22 unit_price + Row 22 total_amount -> ek combined clear entry)
        # -------------------------------------------------------------
        merged = []
        seen_row_keys = set()
        for sc in scored_chunks:
            if sc["chunk_type"] == "audit_issue":
                row_m = re.search(r"Row\s+(\d+)", sc["text"], re.IGNORECASE)
                if row_m:
                    key = (sc.get("dataset_id"), row_m.group(1))
                    if key in seen_row_keys:
                        for m in merged:
                            if m["chunk_type"] == "audit_issue" and m.get("_row_key") == key:
                                col_m = re.search(r"column\s+'[^']+'.*$", sc["text"], re.IGNORECASE)
                                if col_m:
                                    m["text"] = m["text"].rstrip(".") + "; " + col_m.group(0)
                                break
                        continue
                    seen_row_keys.add(key)
                    sc = dict(sc)
                    sc["_row_key"] = key
            merged.append(sc)

        top_chunks = merged[:top_k]
        non_zero = [c for c in top_chunks if c["score"] > 0]
        if non_zero:
            return non_zero
        return top_chunks[:min(3, len(top_chunks))]

    def _call_llm(self, prompt: str, system_prompt: str) -> str:
        """Unified providers module ke zariye AI call karta hai."""
        from providers import complete
        return complete(self, prompt, system_prompt)

    def _generate_grounded_answer(
        self,
        question: str,
        sources: List[Dict[str, Any]],
        scope: str = "current",
    ) -> str:
        """
        Retrieved context sources se LLM answer banwata hai.
        Strict grounding rules lagata hai taaki AI hallucinate na kare.
        """
        if not sources:
            return "No relevant audit issues or insight records were found for your query."

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
            "2. When explaining why a row was flagged, explicitly state:\n"
            "   - Which dataset and row index it occurred in\n"
            "   - The specific column name\n"
            "   - The original invalid value\n"
            "   - The exact reason it was flagged\n"
            "3. Be concise, objective, and professional. Do not invent facts."
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
            # Fallback agar LLM offline ho
            return self._deterministic_fallback_answer(question, sources)

    def _deterministic_fallback_answer(
        self, question: str, sources: List[Dict[str, Any]]
    ) -> str:
        """Offline hone par sources me se direct factual line extract karta hai."""
        top_source = sources[0]["text"]
        row_match = re.search(r"(?i)\brow\s*#?(\d+)\b", question)
        if row_match:
            r = row_match.group(1)
            matching = [s["text"] for s in sources if re.search(r'\brow\s*#?' + re.escape(r) + r'\b', s['text'], re.I)]
            if matching:
                return f"Based on the audit records: {matching[0]}"

        if len(sources) == 1:
            return f"Retrieved record: {top_source}"

        answer_lines = ["Based on the retrieved analysis records:"]
        for s in sources[:3]:
            answer_lines.append(f"• {s['text']}")
        return "\n".join(answer_lines)

    def get_suggested_questions(
        self,
        current_dataset_id: Optional[int] = None,
        scope: str = "current",
        db_session=None,
    ) -> List[str]:
        """
        Indexed audit chunks ko dekh kar UI ke liye dynamic suggested demo questions banata hai.
        Example: Agar Row 22 flag hui hai, to 'Why was row 22 flagged?' suggest karta hai.
        """
        if scope not in {'current', 'all_history'}:
            raise ValueError('Invalid knowledge scope')
        if scope == 'current' and current_dataset_id is None:
            raise ValueError('Current scope requires a dataset ID')

        session = db_session
        own_session = False
        if session is None:
            session = SessionLocal()
            own_session = True

        questions: List[str] = []
        try:
            if current_dataset_id is not None and session.get(Dataset, current_dataset_id) is None:
                raise ValueError('Dataset not found')

            query = session.query(KnowledgeChunk)
            if scope == "current" and current_dataset_id is not None:
                query = query.filter(KnowledgeChunk.dataset_id == current_dataset_id)
            chunks = query.all()

            flagged_rows: List[str] = []
            flagged_cols: List[str] = []
            for c in chunks:
                if c.chunk_type == "audit_issue":
                    m_row = re.search(r"Row\s+(\d+)", c.chunk_text, re.IGNORECASE)
                    if m_row and m_row.group(1) not in flagged_rows:
                        flagged_rows.append(m_row.group(1))
                    m_col = re.search(r"column\s+'([^']+)'", c.chunk_text, re.IGNORECASE)
                    if m_col and m_col.group(1) not in flagged_cols:
                        flagged_cols.append(m_col.group(1))

            if scope == "all_history":
                questions.append("Compare flagged issue counts across all uploaded datasets.")
                questions.append("Which uploaded dataset had the cleanest data?")
                if flagged_cols:
                    questions.append(f"Which column had the most data quality issues across datasets?")
                else:
                    questions.append("How does data quality compare across all uploads?")
                questions.append("Compare executive recommendations across all datasets.")
            else:
                if flagged_rows:
                    questions.append(f"Why was row {flagged_rows[0]} flagged?")
                    if len(flagged_rows) > 1:
                        questions.append(f"Why was row {flagged_rows[1]} flagged?")
                    elif flagged_cols:
                        questions.append(f"What data issues were found in column '{flagged_cols[0]}'?")
                else:
                    questions.append("Were any records flagged during data cleaning?")

                questions.append("What data quality issues were found in this dataset?")
                questions.append("What was the executive recommendation for this dataset?")
                questions.append("How does this dataset's data quality compare to my previous upload?")

            return questions[:4]
        finally:
            if own_session:
                session.close()
