from datetime import datetime
from typing import Any
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from db.database import Base


class Dataset(Base):
    """Represents an uploaded dataset."""
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    row_count = Column(Integer, nullable=False, default=0)
    validated_row_count = Column(Integer, nullable=False, default=0)
    flagged_count = Column(Integer, nullable=False, default=0)

    # Relationships
    pipeline_runs = relationship("PipelineRun", back_populates="dataset", cascade="all, delete-orphan")
    audit_issues = relationship("AuditIssue", back_populates="dataset", cascade="all, delete-orphan")
    knowledge_chunks = relationship("KnowledgeChunk", back_populates="dataset", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "row_count": self.row_count,
            "validated_row_count": self.validated_row_count,
            "flagged_count": self.flagged_count,
        }


class PipelineRun(Base):
    """Represents a completed LangGraph pipeline execution run for a dataset."""
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)

    dataset_summary = Column(JSON, nullable=True)
    eda_result = Column(JSON, nullable=True)
    ml_result = Column(JSON, nullable=True)
    insight_result = Column(JSON, nullable=True)
    visualization_result = Column(JSON, nullable=True)
    audit_report = Column(JSON, nullable=True)
    validated_data = Column(JSON, nullable=True)
    cleaned_data = Column(JSON, nullable=True)
    data_health_score = Column(JSON, nullable=True)
    suggested_questions = Column(JSON, nullable=True)
    execution_logs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    dataset = relationship("Dataset", back_populates="pipeline_runs")


class AuditIssue(Base):
    """Represents an individual flagged data quality issue in an uploaded dataset."""
    __tablename__ = "audit_issues"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=True)
    column_name = Column(String(255), nullable=True)
    original_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=False)

    # Relationship
    dataset = relationship("Dataset", back_populates="audit_issues")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "dataset_id": self.dataset_id,
            "row_index": self.row_index,
            "column_name": self.column_name,
            "original_value": self.original_value,
            "reason": self.reason,
        }


class KnowledgeChunk(Base):
    """Represents an indexed text chunk for RAG knowledge retrieval."""
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_text = Column(Text, nullable=False)
    chunk_type = Column(String(50), nullable=False)  # "audit_issue" | "insight_summary"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    dataset = relationship("Dataset", back_populates="knowledge_chunks")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "dataset_id": self.dataset_id,
            "chunk_text": self.chunk_text,
            "chunk_type": self.chunk_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
