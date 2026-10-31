"""
semantic_similarity.py — Semantic Duplicate Grievance Detector for SCGRS
Uses Sentence Transformers with caching, cosine similarity, and TF-IDF fallback.
"""

import os
import re
import numpy as np

# In-memory LRU-like embedding cache to avoid recomputing vectors
_EMBEDDING_CACHE = {}
_CACHE_MAX_SIZE = 1000

_MODEL = None
_MODEL_FAILED = False
DEFAULT_MODEL_NAME = os.environ.get('SEMANTIC_EMBEDDING_MODEL', 'all-MiniLM-L6-v2')


def _get_sentence_transformer():
    """Singleton loader for SentenceTransformer with graceful error handling."""
    global _MODEL, _MODEL_FAILED
    if _MODEL is not None:
        return _MODEL
    if _MODEL_FAILED:
        return None

    try:
        from sentence_transformers import SentenceTransformer
        print(f"Loading Semantic Embedding Model: {DEFAULT_MODEL_NAME}...")
        _MODEL = SentenceTransformer(DEFAULT_MODEL_NAME)
        print("Semantic Embedding Model loaded successfully.")
        return _MODEL
    except Exception as e:
        print(f"Warning: Could not load SentenceTransformer ({e}). Falling back to TF-IDF semantic matching.")
        _MODEL_FAILED = True
        return None


def _clean_text(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'\s+', ' ', text.strip().lower())


def get_embedding(text: str):
    """Retrieve normalized embedding vector with caching."""
    clean = _clean_text(text)
    if not clean:
        return None

    if clean in _EMBEDDING_CACHE:
        return _EMBEDDING_CACHE[clean]

    model = _get_sentence_transformer()
    if model is not None:
        try:
            emb = model.encode(clean, convert_to_numpy=True, normalize_embeddings=True)
            if len(_EMBEDDING_CACHE) >= _CACHE_MAX_SIZE:
                # Evict oldest entry
                _EMBEDDING_CACHE.pop(next(iter(_EMBEDDING_CACHE)))
            _EMBEDDING_CACHE[clean] = emb
            return emb
        except Exception as e:
            print(f"Error generating embedding: {e}")

    return None


def compute_semantic_similarity(text1: str, text2: str) -> float:
    """Computes cosine similarity between two texts (0.0 to 1.0)."""
    clean1 = _clean_text(text1)
    clean2 = _clean_text(text2)
    if not clean1 or not clean2:
        return 0.0
    if clean1 == clean2:
        return 1.0

    emb1 = get_embedding(clean1)
    emb2 = get_embedding(clean2)

    if emb1 is not None and emb2 is not None:
        # Cosine similarity for normalized vectors is just the dot product
        cos_sim = float(np.dot(emb1, emb2))
        return max(0.0, min(1.0, cos_sim))

    # Resilient TF-IDF character + word n-gram fallback
    return _tfidf_fallback_similarity(clean1, clean2)


def _tfidf_fallback_similarity(t1: str, t2: str) -> float:
    """Fallback cosine similarity using scikit-learn TfidfVectorizer."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        vec = TfidfVectorizer(ngram_range=(1, 2))
        matrix = vec.fit_transform([t1, t2])
        sim = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
        return max(0.0, min(1.0, sim))
    except Exception:
        # Simple Jaccard word fallback
        words1 = set(t1.split())
        words2 = set(t2.split())
        inter = words1.intersection(words2)
        union = words1.union(words2)
        return float(len(inter)) / max(1, len(union))


def match_duplicates_semantic(query_text: str, candidates: list, threshold: float = 0.45) -> list:
    """
    Evaluates semantic similarity between query_text and candidates.
    candidates is a list of dicts: [{'id': ..., 'text': ...}, ...]
    Returns list of matched dicts sorted by similarity descending.
    """
    if not query_text or not candidates:
        return []

    query_emb = get_embedding(query_text)
    model = _get_sentence_transformer()
    engine_name = f"SentenceTransformers ({DEFAULT_MODEL_NAME})" if model is not None else "TF-IDF N-gram Cosine"

    results = []

    # If we have query embedding, batch evaluate candidates
    for cand in candidates:
        cand_id = cand.get('id')
        cand_text = cand.get('text', '')
        if not cand_text:
            continue

        cand_emb = get_embedding(cand_text) if query_emb is not None else None
        if query_emb is not None and cand_emb is not None:
            sim = float(np.dot(query_emb, cand_emb))
        else:
            sim = compute_semantic_similarity(query_text, cand_text)

        if sim >= threshold:
            results.append({
                "id": cand_id,
                "similarity": round(sim, 3),
                "similarityPercent": min(99, max(5, round(sim * 100))),
                "engine": engine_name
            })

    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results
