"""
ml_classifier.py — Advanced Machine Learning Text Classifier for SCGRS
Implements TF-IDF vectorization and Multinomial Naive Bayes / Logistic Regression
with a pure-Python resilient fallback and Safety Hybrid Fusion.
"""

import math
import re
from collections import defaultdict
from speech_normalizer import normalize_campus_speech

# ── 1. Comprehensive Campus Grievance Training Corpus ───────────────────────
TRAINING_DATA = [
    # Academic
    ("The professor did not update internal marks on portal and exam is tomorrow", "Academic", "HIGH"),
    ("Attendance was marked absent even though I attended all lectures with medical certificate", "Academic", "MEDIUM"),
    ("Need revaluation for semester 4 data structures exam paper, grade calculation error", "Academic", "LOW"),
    ("Course syllabus not covered before midterm examinations, please schedule extra classes", "Academic", "MEDIUM"),
    ("Faculty not responding to emails regarding final year capstone project review", "Academic", "LOW"),
    ("Transcript request submitted two weeks ago but still pending with registrar office", "Academic", "LOW"),
    ("Clash in final examination timetable between two elective subjects", "Academic", "HIGH"),

    # Hostel
    ("Geyser in block C third floor washroom is completely broken and leaking current", "Hostel", "HIGH"),
    ("Hostel room ceiling is leaking rain water directly onto bed and study desk", "Hostel", "HIGH"),
    ("Severe water shortage in boys hostel block B since yesterday morning", "Hostel", "HIGH"),
    ("Hostel mess food quality is degraded and water dispenser filters are dirty", "Hostel", "MEDIUM"),
    ("Broken door latch and window glass in hostel room 214 leaving room unsecured", "Hostel", "MEDIUM"),
    ("Pest infestation with bed bugs and cockroaches in hostel dormitories", "Hostel", "MEDIUM"),
    ("Room air cooler not functioning during severe summer heatwave", "Hostel", "LOW"),

    # Transport
    ("College bus route number 14 arrived 45 minutes late causing students to miss exams", "Transport", "HIGH"),
    ("Bus driver was driving recklessly and overspeeding on the highway", "Transport", "CRITICAL"),
    ("Campus shuttle bus is extremely overcrowded with students standing on footboard", "Transport", "HIGH"),
    ("Bus pass payment deducted twice from student bank account without receipt", "Transport", "LOW"),
    ("AC in route 7 college bus not working in afternoon heat", "Transport", "LOW"),
    ("No college bus provided for evening laboratory and library shift students", "Transport", "MEDIUM"),

    # Infrastructure
    ("Ceiling fan in room 302 making loud sparks and burning smell, potential fire hazard", "Infrastructure", "CRITICAL"),
    ("Projector and HDMI cable in seminar hall 2 malfunctioning during placement drive", "Infrastructure", "HIGH"),
    ("Elevator in academic block 4 stuck with students inside", "Infrastructure", "CRITICAL"),
    ("Air conditioning in central computer laboratory 3 is completely dead", "Infrastructure", "MEDIUM"),
    ("Broken wooden benches with sharp nails sticking out in classroom 108", "Infrastructure", "MEDIUM"),
    ("Restroom flush tanks broken on second floor, causing unhygienic conditions", "Infrastructure", "MEDIUM"),
    ("Streetlights between girls hostel and main gate are not functioning, completely dark", "Infrastructure", "HIGH"),

    # Internet/Wi-Fi
    ("Campus Wi-Fi is down across all hostels during online assessment submission", "Internet/Wi-Fi", "HIGH"),
    ("Wi-Fi network connection drops every 5 minutes in library reading hall", "Internet/Wi-Fi", "LOW"),
    ("Internet speed in computer lab is below 1 Mbps cannot download lab dependencies", "Internet/Wi-Fi", "LOW"),
    ("College student portal server error 500 when attempting to register courses", "Internet/Wi-Fi", "HIGH"),
    ("Ethernet port in lab bench 12 is physically damaged and has no link", "Internet/Wi-Fi", "LOW"),
    ("Wi-Fi login portal gateway timeout error repeatedly preventing authentication", "Internet/Wi-Fi", "MEDIUM"),

    # Harassment
    ("Student being followed and stalked outside campus library every evening", "Harassment", "CRITICAL"),
    ("Verbal harassment and abusive language directed towards junior students", "Harassment", "CRITICAL"),
    ("Receiving inappropriate and threatening messages on WhatsApp from senior student", "Harassment", "CRITICAL"),
    ("Discriminatory and derogatory remarks made by lab assistant during viva", "Harassment", "HIGH"),
    ("Unwanted physical contact and harassment in college auditorium during cultural fest", "Harassment", "CRITICAL"),

    # Ragging
    ("Seniors forcing first year students to perform humiliating tasks in hostel corridor", "Ragging", "CRITICAL"),
    ("Late night ragging session conducted in room 405 boys hostel with physical threats", "Ragging", "CRITICAL"),
    ("Ragging incident near campus canteen where juniors were forced to surrender money", "Ragging", "CRITICAL"),
    ("Threats of violence made if junior does not write assignments for senior students", "Ragging", "CRITICAL"),

    # Safety
    ("Exposed live electrical wires hanging near water cooler on ground floor", "Safety", "CRITICAL"),
    ("Fire extinguisher expired in 2022 in chemistry chemical storage laboratory", "Safety", "HIGH"),
    ("Staircase emergency exit door is padlocked and blocked by old furniture", "Safety", "CRITICAL"),
    ("Stray aggressive dogs entered campus quadrangle and attacked a student", "Safety", "HIGH"),
    ("Slippery floor without caution sign near chemical lab resulted in student slip and injury", "Safety", "MEDIUM"),

    # Canteen Dish Issue
    ("Found dead cockroach and insect in chicken biryani served at main canteen", "Canteen Dish Issue", "CRITICAL"),
    ("Food poisoning after consuming paneer thali at hostel mess, multiple students sick", "Canteen Dish Issue", "CRITICAL"),
    ("Stale and foul-smelling milk served with morning breakfast tea in canteen", "Canteen Dish Issue", "HIGH"),
    ("Foreign glass shard discovered inside curry bowl at central food court", "Canteen Dish Issue", "CRITICAL"),
    ("Canteen charging 30 percent above maximum retail price on bottled water and juice", "Canteen Dish Issue", "LOW"),
    ("Unwashed utensils and dirty plates being reused in canteen kitchen", "Canteen Dish Issue", "HIGH"),
    ("Undercooked raw chicken served during lunch buffet in hostel dining hall", "Canteen Dish Issue", "HIGH"),

    # Other
    ("Lost student identity card and library clearance slip in sports complex", "Other", "LOW"),
    ("Need bonafide certificate for education loan verification from campus admin", "Other", "LOW"),
    ("Gym equipment treadmill belt is loose and needs routine maintenance", "Other", "LOW"),
    ("Requesting extension of campus library operating hours during final exam week", "Other", "LOW")
]

STOP_WORDS = {
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'not',
    'are', 'was', 'were', 'our', 'room', 'campus', 'complaint', 'issue',
    'problem', 'please', 'help', 'there', 'here', 'very', 'all', 'is', 'in',
    'at', 'to', 'of', 'on', 'a', 'an', 'be', 'by', 'it', 'or', 'as', 'we', 'i'
}


def tokenize(text: str):
    """Normalize and tokenize text into informative tokens."""
    clean = re.sub(r'[^\w\s]', ' ', (text or '').lower())
    return [w for w in clean.split() if len(w) >= 3 and w not in STOP_WORDS]


# ── 2. Pure-Python Resilient TF-IDF + Naive Bayes Classifier ─────────────────
class BuiltinNLPClassifier:
    """High-performance, zero-dependency TF-IDF Naive Bayes Classifier."""
    def __init__(self):
        self.doc_count = 0
        self.category_doc_counts = defaultdict(int)
        self.term_freqs = defaultdict(lambda: defaultdict(int))
        self.doc_freqs = defaultdict(int)
        self.vocab = set()
        self.categories = set()
        self.train(TRAINING_DATA)

    def train(self, data):
        self.doc_count = len(data)
        for text, category, _ in data:
            self.category_doc_counts[category] += 1
            self.categories.add(category)
            tokens = set(tokenize(text))
            for tok in tokens:
                self.doc_freqs[tok] += 1
                self.term_freqs[category][tok] += 1
                self.vocab.add(tok)

    def predict_proba(self, text: str):
        tokens = tokenize(text)
        if not tokens:
            even_prob = 1.0 / len(self.categories)
            return {cat: even_prob for cat in self.categories}

        log_scores = {}
        for cat in self.categories:
            prior = math.log(self.category_doc_counts[cat] / self.doc_count)
            score = prior
            total_tokens_in_cat = sum(self.term_freqs[cat].values()) + len(self.vocab)
            for tok in tokens:
                # Laplace smoothing
                count = self.term_freqs[cat].get(tok, 0)
                score += math.log((count + 1) / total_tokens_in_cat)
            log_scores[cat] = score

        # Softmax normalization
        max_log = max(log_scores.values())
        exp_scores = {cat: math.exp(score - max_log) for cat, score in log_scores.items()}
        total_exp = sum(exp_scores.values())
        return {cat: exp_scores[cat] / total_exp for cat in self.categories}

    def predict(self, text: str):
        probs = self.predict_proba(text)
        sorted_probs = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        best_cat, best_prob = sorted_probs[0]

        # Top driving tokens
        tokens = tokenize(text)
        token_impact = []
        for tok in tokens:
            if tok in self.term_freqs[best_cat]:
                token_impact.append(tok)

        return {
            "predicted_category": best_cat,
            "confidence": round(best_prob, 3),
            "distribution": {cat: round(prob, 3) for cat, prob in sorted_probs[:5]},
            "top_features": list(dict.fromkeys(token_impact))[:5],
            "model_engine": "Native TF-IDF Naive Bayes"
        }


# ── 3. Scikit-Learn Pipeline (Used if sklearn is installed) ─────────────────
SKLEARN_AVAILABLE = False
sklearn_pipeline = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.pipeline import Pipeline
    import numpy as np

    X_train = [item[0] for item in TRAINING_DATA]
    y_train = [item[1] for item in TRAINING_DATA]

    sklearn_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words='english')),
        ('clf', MultinomialNB(alpha=0.5))
    ])
    sklearn_pipeline.fit(X_train, y_train)
    SKLEARN_AVAILABLE = True
except Exception:
    SKLEARN_AVAILABLE = False

native_classifier = BuiltinNLPClassifier()


# ── 4. Unified Hybrid Predictor ─────────────────────────────────────────────
def classify_complaint_ml(text: str) -> dict:
    """
    Classifies grievance text using either Scikit-Learn or Built-in TF-IDF classifier.
    Returns predicted category, confidence, and probability distribution.
    """
    if not text:
        return {
            "predicted_category": "Other",
            "confidence": 0.0,
            "distribution": {},
            "top_features": [],
            "model_engine": "Rule Fallback"
        }
    text = normalize_campus_speech(text)
    if len(text.strip()) < 4:
        return {
            "predicted_category": "Other",
            "confidence": 0.0,
            "distribution": {},
            "top_features": [],
            "model_engine": "Rule Fallback"
        }

    if SKLEARN_AVAILABLE and sklearn_pipeline is not None:
        try:
            probs = sklearn_pipeline.predict_proba([text])[0]
            classes = sklearn_pipeline.classes_
            prob_dict = {classes[i]: float(probs[i]) for i in range(len(classes))}
            sorted_probs = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)
            best_cat, best_prob = sorted_probs[0]
            second_prob = sorted_probs[1][1] if len(sorted_probs) > 1 else 0.0

            # In multi-class classification (7+ categories), raw probability is diluted (prior ~0.14).
            # We calibrate confidence based on separation margin against the 2nd runner-up:
            margin_ratio = (best_prob - second_prob) / max(0.001, best_prob + second_prob)
            calibrated_conf = min(0.98, max(0.45, round(0.55 + margin_ratio * 0.40, 2)))

            # Extract top matching n-grams
            vec = sklearn_pipeline.named_steps['tfidf']
            feature_names = vec.get_feature_names_out()
            x_vec = vec.transform([text]).toarray()[0]
            top_indices = np.argsort(x_vec)[::-1]
            top_words = [feature_names[i] for i in top_indices if x_vec[i] > 0][:5]

            return {
                "predicted_category": best_cat,
                "confidence": calibrated_conf,
                "raw_probability": round(best_prob, 3),
                "distribution": {cat: round(p, 3) for cat, p in sorted_probs[:5]},
                "top_features": top_words,
                "model_engine": "Scikit-Learn TF-IDF + MultinomialNB"
            }
        except Exception:
            pass

    # Use native zero-dependency TF-IDF Naive Bayes
    return native_classifier.predict(text)
