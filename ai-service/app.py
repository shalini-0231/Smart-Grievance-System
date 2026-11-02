from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from priority_engine import analyze_complaint
from question_engine import get_guided_question, detect_category_from_text, expand_complaint_description
from speech_normalizer import normalize_campus_speech
from campus_knowledge import query_campus_ai
from ml_classifier import classify_complaint_ml
from semantic_similarity import match_duplicates_semantic, compute_semantic_similarity

app = Flask(__name__)
# Enable CORS for cross-origin requests
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "scgrs-ai-service", "ml_engine": "active"})

@app.route('/api/ai/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' parameter in request body"}), 400
        
        text = data['text']
        event_date = data.get('eventDate')
        issue_type = data.get('issueType')
        analysis = analyze_complaint(text, event_date_str=event_date, issue_type=issue_type)
        
        # Augment with Machine Learning classifier prediction
        ml_result = classify_complaint_ml(text)
        analysis['mlAnalysis'] = ml_result
        if 'reason' in analysis:
            analysis['reason'] += f" [ML: {ml_result.get('predicted_category')} ({int(ml_result.get('confidence', 0)*100)}% conf via {ml_result.get('model_engine')})]"
        return jsonify(analysis)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/ml-classify', methods=['POST'])
def ml_classify():
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "Missing 'text' parameter"}), 400
        result = classify_complaint_ml(text)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/voice-process', methods=['POST'])
def voice_process():
    """
    Voice-Based Complaint Entry Processor:
    1. Analyzes recognized speech to identify the most suitable Category.
    2. Automatically generates an expanded, professional Detailed Description.
    3. Runs AI priority and sentiment assessment.
    """
    try:
        data = request.get_json() or {}
        raw_text = (data.get('text') or '').strip()
        speech_text = normalize_campus_speech(raw_text)
        lang = data.get('lang', 'en-IN')
        
        if not speech_text:
            return jsonify({
                "title": "",
                "category": "Other",
                "description": "",
                "confidence": 0
            })

        # Step 1: Detect category using ML classification for English, or keyword detector for Tamil
        is_tamil = any(0x0B80 <= ord(c) <= 0x0BFF for c in speech_text)
        category = "Other"
        ml_res = {}
        
        if is_tamil:
            category = detect_category_from_text(speech_text)
        else:
            ml_res = classify_complaint_ml(speech_text)
            if ml_res and ml_res.get('top_features') and ml_res.get('predicted_category') != 'Other':
                category = ml_res.get('predicted_category')
            else:
                category = detect_category_from_text(speech_text)

        # Step 2: Automatically generate clear, expanded description preserving original meaning
        expanded_desc = expand_complaint_description(speech_text, category)

        # Step 3: Run existing AI priority analysis
        analysis = analyze_complaint(expanded_desc or speech_text)

        return jsonify({
            "title": speech_text,
            "category": category,
            "description": expanded_desc,
            "confidence": ml_res.get('confidence', 0.8),
            "priority": analysis.get('priority', 'MEDIUM'),
            "assignedDepartment": analysis.get('assignedDepartment')
        })
    except Exception as e:
        return jsonify({
            "title": speech_text if 'speech_text' in locals() else "",
            "category": "Other",
            "description": speech_text if 'speech_text' in locals() else "",
            "error": str(e)
        }), 500

@app.route('/api/ai/next-question', methods=['POST'])
def next_question():
    try:
        data = request.get_json() or {}
        text = data.get('text', '')
        category = data.get('category')
        step = int(data.get('step', 1))
        
        question_data = get_guided_question(text, category=category, step=step)
        return jsonify(question_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json() or {}
        message = data.get('message', '')
        role = data.get('role', 'student')
        context = data.get('context')
        
        response = query_campus_ai(message, role=role, user_context=context)
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/semantic-similarity', methods=['POST'])
def semantic_similarity():
    try:
        data = request.get_json() or {}
        query = data.get('query', '')
        candidates = data.get('candidates', [])
        threshold = float(data.get('threshold', 0.50))

        matches = match_duplicates_semantic(query, candidates, threshold=threshold)
        return jsonify({
            "hasMatches": len(matches) > 0,
            "matches": matches
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"SCGRS AI Service running on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=True)
