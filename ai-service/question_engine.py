import re
from speech_normalizer import normalize_campus_speech

def is_tamil_text(text):
    """Check if text contains Tamil Unicode script characters."""
    return bool(re.search(r'[\u0B80-\u0BFF]', text or ''))

def detect_category_from_text(text):
    """
    Identifies the most suitable grievance category from spoken or typed complaint text.
    Supports English and Tamil grievance vocabulary matching the 10 official categories.
    """
    if not text:
        return 'Other'
    normalized = normalize_campus_speech(text)
    clean = normalized.lower()
    
    # 1. Canteen Dish Issue
    if any(k in clean for k in [
        'canteen', 'mess', 'food', 'dish', 'biryani', 'tea', 'hygiene', 
        'foreign object', 'cockroach', 'meal', 'taste', 'stale', 'snack',
        'உணவு', 'சாப்பாடு', 'கேண்டீன்', 'மெஸ்', 'பிரியாணி', 'சுவை', 'பூச்சி'
    ]):
        return 'Canteen Dish Issue'
    
    # 2. Internet / Wi-Fi
    elif any(k in clean for k in [
        'wifi', 'wi-fi', 'wi fi', 'why fi', 'internet', 'speed', 'network', 'connectivity', 'router', 'lan', 'ethernet',
        'வைஃபை', 'இணையம்', 'நெட்வொர்க்', 'இணையதள', 'நெட்'
    ]):
        return 'Internet/Wi-Fi'
        
    # 3. Transport
    elif any(k in clean for k in [
        'bus', 'transport', 'driver', 'route', 'pickup', 'shuttle', 'bus pass',
        'பேருந்து', 'பஸ்', 'போக்குவரத்து', 'டிரைவர்'
    ]):
        return 'Transport'
        
    # 4. Hostel
    elif any(k in clean for k in [
        'hostel', 'room', 'bed', 'bathroom', 'cleaning', 'washroom', 'geyser', 'dormitory', 'warden',
        'விடுதி', 'தங்குமிடம்', 'குளியலறை', 'கழிப்பறை', 'வார்டன்', 'ஹோஸ்டல்', 'ரூம்'
    ]):
        return 'Hostel'
        
    # 5. Infrastructure
    elif any(k in clean for k in [
        'fan', 'light', 'door', 'window', 'leak', 'water', 'bench', 'chair', 'projector', 'lift', 'elevator', 'ac', 'switch', 'pipe',
        'மின்விசிறி', 'விசிறி', 'விளக்கு', 'மேஜை', 'கட்டிடம்', 'ஏசி', 'கதவு', 'ஜன்னல்', 'ஃபேன்', 'லைட்', 'பெஞ்ச்', 'லிப்ட்'
    ]):
        return 'Infrastructure'
        
    # 6. Academic
    elif any(k in clean for k in [
        'exam', 'mark', 'grade', 'result', 'faculty', 'attendance', 'syllabus', 'hall ticket', 'professor', 'revaluation', 'internal',
        'தேர்வு', 'மதிப்பெண்', 'வருகைப்பதிவு', 'பேராசிரியர்', 'படிப்பு', 'சான்றிதழ்', 'எக்ஸாம்', 'மார்க்'
    ]):
        return 'Academic'

    # 7. Ragging
    elif any(k in clean for k in [
        'ragging', 'rag', 'seniors forcing', 'humiliating',
        'ராகிங்', 'கேலி'
    ]):
        return 'Ragging'
        
    # 8. Harassment
    elif any(k in clean for k in [
        'harass', 'harassment', 'abuse', 'threat', 'bully', 'stalking',
        'துன்புறுத்தல்', 'பயமுறுத்தல்', 'மிரட்டல்'
    ]):
        return 'Harassment'

    # 9. Safety
    elif any(k in clean for k in [
        'safety', 'hazard', 'fire', 'live wire', 'emergency exit', 'injury', 'shock',
        'பாதுகாப்பு', 'தீ', 'விபத்து', 'அபாயம்'
    ]):
        return 'Safety'
        
    else:
        return 'Other'

def expand_complaint_description(text, category):
    """
    Automatically generates a clear, meaningful, and professional expanded complaint
    description using the complete recognized speech as source.
    Preserves original meaning and context without inventing fake details.
    """
    clean = normalize_campus_speech((text or '').strip())
    if not clean:
        return ""
    
    # Capitalize first character
    if clean[0].islower():
        clean = clean[0].upper() + clean[1:]
    if not clean.endswith(('.', '!', '?')):
        clean += '.'

    dept_map = {
        'Academic': 'Academic Affairs / Department HOD',
        'Hostel': 'Hostel Administration & Warden Office',
        'Transport': 'Campus Transport Department',
        'Internet/Wi-Fi': 'IT & Network Infrastructure Team',
        'Infrastructure': 'Campus Maintenance & Works Department',
        'Harassment': 'Student Welfare / Anti-Harassment Cell',
        'Ragging': 'Institutional Anti-Ragging Committee',
        'Safety': 'Campus Safety & Emergency Committee',
        'Canteen Dish Issue': 'Canteen & Hospitality Oversight Committee',
        'Other': 'General Campus Administration'
    }
    target_dept = dept_map.get(category, 'General Campus Administration')

    if is_tamil_text(clean):
        return (
            f"புகார் விவரம் (Grievance Description):\n"
            f"{clean}\n\n"
            f"துறை மற்றும் தாக்கம் (Department & Impact):\n"
            f"மேற்குறிப்பிட்ட பிரச்சனை '{category}' பிரிவைச் சார்ந்தது. இது மாணவர்களின் அன்றாட வளாக நடைமுறைகளை பாதிக்கிறது. சம்பந்தப்பட்ட {target_dept} துறை இதனை ஆய்வு செய்ய வேண்டும்.\n\n"
            f"கோரிக்கை (Requested Action):\n"
            f"மாணவர்களின் நலன் கருதி, இப்பிரச்சனையை உடனடியாக ஆய்வு செய்து தகுந்த தீர்வு காணுமாறு கேட்டுக்கொள்கிறேன்."
        )

    return (
        f"Grievance Summary:\n"
        f"{clean}\n\n"
        f"Context & Impact:\n"
        f"The issue described above has been reported under the '{category}' category. "
        f"This condition is causing disruption to daily campus activities and requires inspection by the {target_dept}.\n\n"
        f"Requested Action:\n"
        f"Kindly inspect the reported location/equipment, verify ground conditions, and initiate the necessary corrective measures at the earliest."
    )

def get_guided_question(text, category=None, step=1):
    detected_cat = category if category else detect_category_from_text(text)
    
    if step == 1:
        if detected_cat == 'Canteen Dish Issue':
            return {
                "category": detected_cat,
                "prompt": "I noticed this is related to food/canteen. Which canteen or mess location did this occur in?",
                "fieldTarget": "canteenLocation",
                "quickReplies": ["Block A Canteen", "Hostel Boys Mess", "Hostel Girls Mess", "Central Food Court", "Library Cafe"]
            }
        elif detected_cat == 'Internet/Wi-Fi':
            return {
                "category": detected_cat,
                "prompt": "Understood, Wi-Fi or network issue. Which building or room is affected?",
                "fieldTarget": "location",
                "quickReplies": ["Central Library", "Academic Block 1", "Hostel Block A", "Main Auditorium"]
            }
        elif detected_cat == 'Hostel':
            return {
                "category": detected_cat,
                "prompt": "Hostel grievance noted. What is your Hostel Block and Room Number?",
                "fieldTarget": "location",
                "quickReplies": ["Hostel Block A, Room 204", "Hostel Block B, Room 102", "Girls Hostel Block C"]
            }
        elif detected_cat == 'Infrastructure':
            return {
                "category": detected_cat,
                "prompt": "Infrastructure maintenance issue detected. Which classroom or facility needs repair?",
                "fieldTarget": "location",
                "quickReplies": ["Academic Block 1 - Room 105", "Computer Lab 3", "Main Auditorium"]
            }
        else:
            return {
                "category": detected_cat,
                "prompt": "Thank you for sharing. Could you specify the exact location or department on campus where this occurred?",
                "fieldTarget": "location",
                "quickReplies": ["Academic Block 1", "Main Campus Premises", "Library", "Administrative Block"]
            }

    elif step == 2:
        if detected_cat == 'Canteen Dish Issue':
            return {
                "category": detected_cat,
                "prompt": "What was the dish name and primary issue type?",
                "fieldTarget": "dishName",
                "quickReplies": ["Chicken Biryani", "Special Thali", "Meals", "Tea / Snacks"]
            }
        else:
            return {
                "category": detected_cat,
                "prompt": "Would you like to submit this grievance anonymously to protect your identity?",
                "fieldTarget": "anonymous",
                "quickReplies": ["Yes, keep me anonymous 🔒", "No, include my name 👤"]
            }

    elif step == 3:
        return {
            "category": detected_cat,
            "prompt": "Would you like to submit this grievance anonymously to protect your identity?",
            "fieldTarget": "anonymous",
            "quickReplies": ["Yes, keep me anonymous 🔒", "No, include my name 👤"]
        }
    
    else:
        return {
            "category": detected_cat,
            "prompt": "Everything is captured! Please review your grievance summary card below before submitting.",
            "fieldTarget": "confirm",
            "quickReplies": ["🚀 Confirm & Submit Grievance", "✏️ Edit Answer"]
        }
