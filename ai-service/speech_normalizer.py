import re

def normalize_campus_speech(text: str) -> str:
    """
    Campus Domain Phonetic Speech Normalizer.
    Corrects common speech recognition acoustic mis-hearings in Indian English & Tamil campus contexts.
    
    Examples:
    - 'The college wife is not working properly' -> 'The college Wi-Fi is not working properly'
    - 'hostel mens food is bad' -> 'hostel mess food is bad'
    - 'mens is not clean' -> 'mess is not clean'
    - 'why fi in library is down' -> 'Wi-Fi in library is down'
    - 'arrow water purifier broken' -> 'RO water purifier broken'
    - 'computer lap ac is off' -> 'computer lab ac is off'
    - 'gezer not heating' -> 'geyser not heating'
    """
    if not text or not isinstance(text, str):
        return text or ""
    
    s = text

    # 1. Wi-Fi / Internet phonetics (wife / why fi / waif -> Wi-Fi)
    s = re.sub(r'\b(college|campus|hostel|room|library|department|block|lab|class)\s+wife\b', r'\1 Wi-Fi', s, flags=re.I)
    s = re.sub(r'\bthe\s+wife\s+(is|not|down|slow|working|broken)\b', r'the Wi-Fi \1', s, flags=re.I)
    s = re.sub(r'\bwife\s+(is|not|down|slow|speed|issue|problem|connection|network|signal|password|router|connectivity|working)\b', r'Wi-Fi \1', s, flags=re.I)
    s = re.sub(r'\b(connect\s+to|connect|fix\s+the|access\s+the)\s+wife\b', r'\1 Wi-Fi', s, flags=re.I)
    s = re.sub(r'\bwife\b(?=.*\b(working|signal|router|internet|slow|speed|connect|network|password|down|frequency|connectivity|modem|lan)\b)', r'Wi-Fi', s, flags=re.I)
    s = re.sub(r'\b(wi\s*fi|why\s*fi|why-fi|y\s*fi|waif|white\s*fi|why\s*fight)\b', r'Wi-Fi', s, flags=re.I)

    # 2. Mess phonetics (mens / men's / mesh / mass -> mess)
    s = re.sub(r'\b(college|hostel|campus|boys|girls|block\s+[a-z0-9]+)\s+(mens|men\'s|mesh|mass)\b', r'\1 mess', s, flags=re.I)
    s = re.sub(r'\b(mens|men\'s|mesh)\s+(food|dish|meal|lunch|dinner|breakfast|canteen|hygiene|taste|quality|timing|menu|hall|cleanliness|cook|caterer|worker|tea|snack|tiffin)\b', r'mess \2', s, flags=re.I)
    s = re.sub(r'\b(in|at|to)\s+(the\s+)?(mens|men\'s|mesh)\b', r'\1 \2mess', s, flags=re.I)
    s = re.sub(r'\b(mens|men\'s)\s+(is|was|has|are|food)\b', r'mess \2', s, flags=re.I)
    s = re.sub(r'\b(mens|men\'s)\b', r'mess', s, flags=re.I)

    # 3. Canteen & Dish phonetics
    s = re.sub(r'\bcan\s+teen\b', r'canteen', s, flags=re.I)
    s = re.sub(r'\bcanteen\s+this\b', r'canteen dish', s, flags=re.I)
    s = re.sub(r'\bcontain\s+food\b', r'canteen food', s, flags=re.I)

    # 4. Lab phonetics (lap -> lab in academic contexts)
    s = re.sub(r'\b(computer|chemistry|physics|mechanical|electrical|cad|programming|coding|science|hardware|software|networking)\s+lap\b', r'\1 lab', s, flags=re.I)

    # 5. Water / Utilities / Infrastructure
    s = re.sub(r'\b(arrow|our|arvo|ar\s*o|r\s*o)\s+water\b', r'RO water', s, flags=re.I)
    s = re.sub(r'\b(gyser|gezer|gazer|geaser|gezar)\b', r'geyser', s, flags=re.I)
    s = re.sub(r'\bwash\s+basin\b', r'washbasin', s, flags=re.I)
    s = re.sub(r'\btube\s+light\b', r'tubelight', s, flags=re.I)
    s = re.sub(r'\bwater\s+purifire\b', r'water purifier', s, flags=re.I)

    # 6. Academics
    s = re.sub(r'\b(all|whole)\s+ticket\b', r'hall ticket', s, flags=re.I)
    s = re.sub(r'\bsemister\b', r'semester', s, flags=re.I)
    s = re.sub(r'\b(meet|talk\s+to|inform)\s+hot\b', r'\1 HOD', s, flags=re.I)

    # 7. Ragging / Harassment
    s = re.sub(r'\b(rag\s+in|ranking)\s+(in|at|by|the)\b', r'ragging \2', s, flags=re.I)
    s = re.sub(r'\b(herasment|harasment|herassment)\b', r'harassment', s, flags=re.I)

    return s

