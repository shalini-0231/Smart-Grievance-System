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

# Food-Safety groups:
# 1. Serious Food Safety Incidents: life-safety hazards, contamination, poisoning -> auto-escalates to CRITICAL
SERIOUS_FOOD_SAFETY_KEYWORDS: set = {
    'cockroach', 'foreign object', 'poison', 'poisoning', 'poisoned', 'poisonous',
    'food poisoning', 'water poisoning', 'toxic', 'toxicity', 'contamination', 'contaminated',
    'விஷம்', 'நஞ்சு'
}

# 2. Food Hygiene Issues: sanitation, stale/spoiled food -> escalated to HIGH
HIGH_FOOD_HYGIENE_KEYWORDS: set = {
    'hygiene', 'stale food', 'dirty food', 'unhygienic'
}

# Backward-compatibility alias
FOOD_SAFETY_GROUP: set = SERIOUS_FOOD_SAFETY_KEYWORDS | HIGH_FOOD_HYGIENE_KEYWORDS

# Sentiment word sets (annotation only; does NOT modify score or priority).
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

# Stopwords & common domain nouns strictly excluded from fuzzy matching to avoid false positives (e.g. 'food' -> 'flood', 'for' -> 'fire')
STOPWORDS: set = {
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'had',
    'not', 'are', 'was', 'were', 'our', 'room', 'campus', 'all', 'any', 'can',
    'her', 'his', 'him', 'she', 'who', 'how', 'why', 'what', 'when', 'where',
    'day', 'out', 'off', 'too', 'very', 'just', 'get', 'got', 'put', 'but',
    'you', 'your', 'they', 'them', 'their', 'been', 'being', 'will', 'would',
    'some', 'such', 'into', 'than', 'then', 'also', 'about', 'more', 'over',
    'food', 'mess', 'canteen', 'dish', 'meal', 'milk', 'water', 'plate',
    'class', 'desk', 'gate', 'book', 'test', 'exam', 'fees', 'hostel'
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
    Sentiment annotation — recorded separately and does NOT modify priority score.
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

    # ── Step 1: Exact keyword matching (phrases first, non-overlapping spans) ──
    matched: dict = {}
    matched_spans: list = []  # list of (start_idx, end_idx)

    # Sort keywords by length descending so longer phrases (e.g. 'exam issue', 'food poisoning') match first
    sorted_keywords = sorted(KEYWORD_SEVERITY, key=lambda x: len(x['word']), reverse=True)

    for item in sorted_keywords:
        clean_kw = preprocess_text(item['word'])
        if not clean_kw:
            continue
        pattern = r'\b' + re.escape(clean_kw) + r'\b'
        for m in re.finditer(pattern, clean_text):
            start, end = m.start(), m.end()
            # If this span is already covered by a longer matched keyword, don't double count
            if any(s <= start and end <= e for s, e in matched_spans):
                continue
            if clean_kw not in matched:
                matched[clean_kw] = {
                    'original':   item['word'],
                    'weight':     item['weight'],
                    'category':   item['category'],
                    'department': item['department'],
                    'match_type': 'exact',
                }
                matched_spans.append((start, end))

    # ── Step 2: Fuzzy matching with strict length, initial-character, and stopword guards ─
    exact_tokens: set = set()
    for kw_str in matched:
        for tok in kw_str.split():
            exact_tokens.add(tok)

    for token in tokens:
        # Strictly ignore common stopwords, domain nouns, and short tokens (< 5 chars) to eliminate false matches (e.g., 'food' -> 'flood')
        if len(token) < 5 or token in exact_tokens or token in STOPWORDS or token == 'food':
            continue

        best_item, best_dist = None, 3
        for item in sorted_keywords:
            clean_kw = preprocess_text(item['word'])
            # Only single-word keywords with length >= 5 are eligible for fuzzy matching
            if not clean_kw or ' ' in clean_kw or len(clean_kw) < 5:
                continue
            # Must start with the same first character to avoid cross-domain false matches
            if token[0] != clean_kw[0]:
                continue
            # For 5-6 char keywords, allow distance <= 1 max; for >= 7 chars, allow distance <= 2
            max_allowed_dist = 1 if len(clean_kw) <= 6 else 2
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

    # ── Critical Safety Root Keyword Guard ────────────────────────────────────
    # Ensure all forms of poison (poison, poisoning, poisoned, poisonous), toxic, and contamination are recognized
    critical_matches = re.findall(r'\b(poison\w*|toxic\w*|contaminat\w*|விஷம்|நஞ்சு)\b', clean_text)
    for cw in critical_matches:
        if cw not in matched and not any(cw in k for k in matched):
            matched[cw] = {
                'original':   cw,
                'weight':     40,
                'category':   'Canteen Dish Issue',
                'department': 'Canteen & Hospitality',
                'match_type': 'critical_safety_stem',
            }

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

    # Dominant category & department
    dominant = max(matched.values(), key=lambda m: m['weight']) if matched else None
    dominant_category:   str = dominant['category']   if dominant else None
    dominant_department: str = dominant['department']  if dominant else None

    # ── Step 4: Food Safety vs Ordinary Food Quality distinction ──────────────
    has_serious_kw = any(
        m['original'] in SERIOUS_FOOD_SAFETY_KEYWORDS or 
        any(k in m['original'].lower() for k in ['poison', 'toxic', 'contaminat', 'cockroach', 'foreign object', 'விஷம்', 'நஞ்சு'])
        for m in matched.values()
    ) or bool(critical_matches)
    is_serious_food_incident = has_serious_kw or (issue_type == 'FOREIGN_OBJECT')

    has_high_hygiene_kw = any(m['original'] in HIGH_FOOD_HYGIENE_KEYWORDS for m in matched.values())
    is_high_hygiene_incident = (has_high_hygiene_kw or (issue_type == 'HYGIENE')) and not is_serious_food_incident

    is_food_safety_override = is_serious_food_incident or is_high_hygiene_incident

    if is_food_safety_override:
        dominant_category   = dominant_category   or 'Canteen Dish Issue'
        dominant_department = dominant_department or 'Canteen & Hospitality'

    # ── Step 5: Priority determination (Consistent thresholds) ────────────────
    # LOW: 0–39, MEDIUM: 40–59, HIGH: 60–79, CRITICAL: 80+
    if is_serious_food_incident:
        priority = 'CRITICAL'
    elif is_high_hygiene_incident:
        # High food hygiene concern escalates to at least HIGH
        priority = 'CRITICAL' if total_score >= 80 else 'HIGH'
    elif total_score >= 80:
        priority = 'CRITICAL'
    elif total_score >= 60:
        priority = 'HIGH'
    elif total_score >= 40:
        priority = 'MEDIUM'
    else:
        priority = 'LOW'

    # ── Step 6: Statistically Calibrated Confidence Percentage ────────────────
    if is_serious_food_incident:
        corroborating = len(matched_keywords)
        confidence_pct = min(98, 92 + (corroborating * 2))
    elif is_high_hygiene_incident and priority == 'HIGH':
        confidence_pct = min(87, max(76, round(76 + (min(total_score, 60) / 60.0) * 11)))
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

    # Note: Sentiment does NOT modify priority or score (Requirement 2)

    if is_serious_food_incident:
        reason = (
            '[ALERT] Food Safety Override: Critical health hazard detected in Canteen Dish Issue category '
            '— auto-escalated to CRITICAL.'
        )
    elif is_high_hygiene_incident:
        reason = (
            '[ALERT] Food Hygiene Override: Significant hygiene concern detected in Canteen Dish Issue category '
            '— escalated to HIGH priority.'
        )
    elif matched_keywords:
        reason = f"Urgency keywords detected: {', '.join(matched_keywords[:3])}."
    else:
        reason = 'No urgency keywords matched. General complaint — LOW priority assigned.'

    return {
        'priority':             priority,
        'score':                score,
        'confidencePercent':    confidence_pct,
        'matchedKeywords':      matched_keywords,
        'sentiment':            sentiment_label,
        'reason':               f'{confidence_pct}% — {priority} — {reason}',
        'isFoodSafetyOverride': is_food_safety_override,
        'detectedCategory':     dominant_category,
        'assignedDepartment':   dominant_department,
    }
