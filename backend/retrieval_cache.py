"""Bounded, thread-safe TF-IDF cache keyed by content and persisted chunk identity."""
import hashlib
import threading
from collections import OrderedDict
from sklearn.feature_extraction.text import TfidfVectorizer

_entries = OrderedDict()
_lock = threading.RLock()
MAX_ENTRIES = 8
MAX_BYTES = 32*1024*1024

def invalidate():
    with _lock:
        _entries.clear()

def index(chunks):
    corpus = [c.chunk_text for c in chunks]
    digest = hashlib.sha256()
    for chunk in chunks:
        value = f'{chunk.dataset_id}:{chunk.id}:{chunk.chunk_text}'.encode('utf-8')
        digest.update(len(value).to_bytes(8,'big'))
        digest.update(value)
    key = digest.digest()
    with _lock:
        if key in _entries:
            _entries.move_to_end(key)
            return _entries[key][0:2]
        vectorizer = TfidfVectorizer(ngram_range=(1,2),stop_words='english',lowercase=True,max_features=2500)
        matrix = vectorizer.fit_transform(corpus)
        size = matrix.data.nbytes+matrix.indices.nbytes+matrix.indptr.nbytes+sum(len(k.encode('utf-8'))+64 for k in vectorizer.vocabulary_)
        if size<=MAX_BYTES:
            while _entries and (len(_entries)>=MAX_ENTRIES or sum(v[2] for v in _entries.values())+size>MAX_BYTES):
                _entries.popitem(last=False)
            _entries[key] = (vectorizer,matrix,size)
        return vectorizer,matrix
