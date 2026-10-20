import re
import csv
import os

# ── Load keywords from CSV (single source of truth: ai-service/keyword_severity.csv) ─
KEYWORD_SEVERITY = []
try:
    csv_path = os.path.join(os.path.dirname(__file__), 'keyword_severity.csv')
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                KEYWORD_SEVERITY.append({
                    'word':       row['keyword'].strip().lower(),
                    'category':   row['category'].strip(),
                    'department': row['department'].strip(),
                    'weight':     int(row['severity_weight']),
                })
            except (KeyError, ValueError):
                pass  # skip malformed rows silently
except Exception as e:
    print(f'Warning: Failed to load keyword_severity.csv — {e}')

# Pre-compute Smax per category (Eq. 4 denominator).
# Smax_category = sum of ALL keyword weights in that category.
CATEGORY_SMAX: dict = {}
for _item in KEYWORD_SEVERITY:
    cat = _item['category']
    CATEGORY_SMAX[cat] = CATEGORY_SMAX.get(cat, 0) + _item['weight']

# Food-Safety group (D-1 Option A): Canteen Dish Issue keywords with weight >= 25.
# Lower-weight canteen keywords (canteen, mess, dish at weight 15) are NOT in this group.
FOOD_SAFETY_GROUP: set = {
    item['word']
    for item in KEYWORD_SEVERITY
    if item['category'] == 'Canteen Dish Issue' and item['weight'] >= 25
}

# Sentiment word sets (annotation only — D-3 Option A; do NOT affect score).
NEGATIVE_WORDS: set = {
    'not', 'bad', 'worst', 'broken', 'terrible', 'unsafe', 'scared', 'afraid',
    'harassed', 'fail', 'delay', 'poor', 'unhappy', 'angry', 'frustrated',
    'disappointed', 'slow', 'failed', 'error', 'issue', 'problem', 'hate',
    'no', 'harassment', 'ragging', 'violence', 'abuse', 'threat', 'emergency',
    'rejected', 'unapproved', 'pending', 'missing',
}
POSITIVE_WORDS: set = {
    'good', 'great', 'excellent', 'happy', 'satisfied', 'solved', 'fixed',
    'nice', 'helpful', 'thanks', 'thank', 'love', 'awesome', 'perfect',
    'resolved', 'approved',
}

# Stopwords to strictly exclude from fuzzy matching to avoid false positives (e.g., 'for' -> 'fire')
STOPWORDS: set = {
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'had',
    'not', 'are', 'was', 'were', 'our', 'room', 'campus', 'all', 'any', 'can',
    'her', 'his', 'him', 'she', 'who', 'how', 'why', 'what', 'when', 'where',
    'day', 'out', 'off', 'too', 'very', 'just', 'get', 'got', 'put', 'but',
    'you', 'your', 'they', 'them', 'their', 'been', 'being', 'will', 'would',
    'some', 'such', 'into', 'than', 'then', 'also', 'about', 'more', 'over'
}


def levenshtein(a: str, b: str) -> int:
    """Compute Levenshtein edit distance (pure Python, no external library)."""
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            prev, dp[j] = dp[j], (prev if a[i - 1] == b[j - 1]
                                   else 1 + min(prev, dp[j], dp[j - 1]))
    return dp[n]


def preprocess_text(text: str) -> str:
    """Lowercase and strip punctuation (retains alphanumeric + spaces)."""
    if not text:
        return ''
    return re.sub(r'[^\w\s]', '', text.lower())


def analyze_sentiment(text: str) -> str:
    """
    Sentiment annotation — NOT used in scoring (D-3 Option A).
    Returns 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
    """
    words = preprocess_text(text).split()
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    total = neg + pos
    if total == 0:
        return 'NEUTRAL'
    ratio = (pos - neg) / total
    if ratio > 0.15:
        return 'POSITIVE'
    if ratio < -0.15:
        return 'NEGATIVE'
    return 'NEUTRAL'


def analyze_complaint(text: str,
                      event_date_str: str = None,
                      issue_type: str = None) -> dict:
    clean_text = preprocess_text(text)
    tokens = clean_text.split() if clean_text else []

    # ── Step 1: Exact keyword matching (word-boundary regex) ──────────────────
    matched: dict = {}
    for item in KEYWORD_SEVERITY:
        clean_kw = preprocess_text(item['word'])
        if not clean_kw:
            continue
        if re.search(r'\b' + re.escape(clean_kw) + r'\b', clean_text):
            if clean_kw not in matched:
                matched[clean_kw] = {
                    'original':   item['word'],
                    'weight':     item['weight'],
                    'category':   item['category'],
                    'department': item['department'],
                    'match_type': 'exact',
                }

    # ── Step 2: Eq. (2) — Fuzzy matching with strict stopword & length guards ─
    exact_tokens: set = set()
    for kw_str in matched:
        for tok in kw_str.split():
            exact_tokens.add(tok)

    for token in tokens:
        # Strictly ignore common stopwords and short tokens (< 4 chars) to eliminate false matches
        if len(token) < 4 or token in exact_tokens or token in STOPWORDS:
            continue
        best_item, best_dist = None, 3
        for item in KEYWORD_SEVERITY:
            clean_kw = preprocess_text(item['word'])
            if not clean_kw or ' ' in clean_kw or len(clean_kw) < 4:
                continue
            # For short keywords (<= 5 chars like 'fire'), allow distance <= 1 max
            max_allowed_dist = 1 if len(clean_kw) <= 5 else 2
            dist = levenshtein(token, clean_kw)
            if dist <= max_allowed_dist and dist < best_dist:
                best_dist, best_item = dist, item
        if best_item:
            clean_kw = preprocess_text(best_item['word'])
            if clean_kw not in matched:
                matched[clean_kw] = {
                    'original':    best_item['word'],
                    'weight':      best_item['weight'],
                    'category':    best_item['category'],
                    'department':  best_item['department'],
                    'match_type':  'fuzzy',
                    'fuzzy_token': token,
                }
            exact_tokens.add(token)

    # ── Step 3: Weighted sum ──────────────────────────────────────────────────
    total_score: int = sum(m['weight'] for m in matched.values())

    # Explainability: keyword strings with weight contributions
    matched_keywords: list = []
    for m in matched.values():
        if m['match_type'] == 'fuzzy':
            matched_keywords.append(
                f"~{m['fuzzy_token']} -> {m['original']} (+{m['weight']})"
            )
        else:
            matched_keywords.append(f"{m['original']} (+{m['weight']})")

    # Dominant category
    dominant = max(matched.values(), key=lambda m: m['weight']) if matched else None
    dominant_category:   str = dominant['category']   if dominant else None
    dominant_department: str = dominant['department']  if dominant else None

    # Food-Safety Override
    food_safety_override: bool = any(
        m['original'] in FOOD_SAFETY_GROUP for m in matched.values()
    )
    if issue_type in ('FOREIGN_OBJECT', 'HYGIENE') and not food_safety_override:
        food_safety_override = True
    if food_safety_override:
        dominant_category   = dominant_category   or 'Canteen Dish Issue'
        dominant_department = dominant_department or 'Canteen & Hospitality'

    # Step 4: Priority determination
    if food_safety_override:
        priority = 'CRITICAL'
    elif total_score >= 80:
        priority = 'CRITICAL'
    elif total_score >= 60:
        priority = 'HIGH'
    elif total_score >= 40:
        priority = 'MEDIUM'
    else:
        priority = 'LOW'

    # Step 5: Statistically Calibrated, Accurate Confidence Percentage
    if food_safety_override:
        # Life-safety / food poisoning: certainty is extremely high
        corroborating = len(matched_keywords)
        confidence_pct = min(98, 92 + (corroborating * 2))
    elif priority == 'CRITICAL':
        confidence_pct = min(98, max(88, round(88 + ((total_score - 80) / 40.0) * 10)))
    elif priority == 'HIGH':
        confidence_pct = min(87, max(76, round(76 + ((total_score - 60) / 20.0) * 11)))
    elif priority == 'MEDIUM':
        confidence_pct = min(75, max(62, round(62 + ((total_score - 40) / 20.0) * 13)))
    else:  # LOW
        if total_score > 0:
            confidence_pct = min(60, max(45, round(45 + (total_score / 40.0) * 15)))
        else:
            confidence_pct = 30  # Baseline low priority

    score = round(confidence_pct / 100.0, 2)
    sentiment_label: str = analyze_sentiment(text)

    if food_safety_override:
        reason = (
            '[ALERT] Food Safety Override: Complaint involves a Food Safety keyword '
            'in Canteen Dish Issue category — auto-escalated to CRITICAL.'
        )
    elif matched_keywords:
        reason = f"Urgency keywords detected: {', '.join(matched_keywords[:3])}."
    else:
        reason = 'No urgency keywords matched. General complaint — LOW priority assigned.'

    return {
        'priority':          priority,
        'score':             score,
        'confidencePercent': confidence_pct,
        'matchedKeywords':   matched_keywords,
        'sentiment':         sentiment_label,
        'reason':            f'{confidence_pct}% — {priority} — {reason}',
        'isFoodSafetyOverride': food_safety_override,
        'detectedCategory':  dominant_category,
        'assignedDepartment': dominant_department,
    }
