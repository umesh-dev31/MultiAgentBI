"""Load configuration before database engines or provider clients."""
import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

@dataclass
class Settings:
    data_dir: Path = field(default_factory=lambda: Path(os.getenv('INSIGHT_DATA_DIR', Path(__file__).parent / 'data')).resolve())
    database_url: str = field(default_factory=lambda: os.getenv('DATABASE_URL', ''))
    max_upload_bytes: int = field(default_factory=lambda: int(os.getenv('MAX_UPLOAD_BYTES', 20 * 1024 * 1024)))
    max_rows: int = field(default_factory=lambda: int(os.getenv('MAX_DATASET_ROWS', 100000)))
    max_columns: int = field(default_factory=lambda: int(os.getenv('MAX_DATASET_COLUMNS', 200)))
    max_excel_bytes: int = field(default_factory=lambda: int(os.getenv('MAX_EXCEL_BYTES', 100 * 1024 * 1024)))
    queue_size: int = field(default_factory=lambda: int(os.getenv('JOB_QUEUE_SIZE', 8)))
    job_timeout: float = field(default_factory=lambda: float(os.getenv('JOB_TIMEOUT_SECONDS', 300)))
    llm_timeout: float = field(default_factory=lambda: float(os.getenv('LLM_TIMEOUT_SECONDS', 20)))

    def prepare(self):
        if any(v<=0 for v in (self.max_upload_bytes,self.max_rows,self.max_columns,self.max_excel_bytes,self.job_timeout,self.llm_timeout)) or self.queue_size<0:
            raise ValueError('Resource limits must be positive and queue size nonnegative.')
        if os.getenv('VERCEL') or os.getenv('AWS_LAMBDA_FUNCTION_NAME'):
            raise RuntimeError('Serverless mode is unsupported. Run a persistent backend with durable storage.')
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.data_dir / 'uploads').mkdir(exist_ok=True)
        if not self.database_url:
            self.database_url = 'sqlite:///' + str(self.data_dir / 'agentinsight.db')
        return self
