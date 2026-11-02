/**
 * Campus Domain Phonetic Speech Normalizer
 * Corrects common Web Speech API acoustic mis-hearings in Indian English & Tamil campus contexts.
 *
 * Examples:
 * - "The college wife is not working properly" -> "The college Wi-Fi is not working properly"
 * - "hostel mens food is bad" -> "hostel mess food is bad"
 * - "mens is not clean" -> "mess is not clean"
 * - "why fi in library is down" -> "Wi-Fi in library is down"
 * - "arrow water purifier broken" -> "RO water purifier broken"
 * - "computer lap ac is off" -> "computer lab ac is off"
 * - "gezer not heating in hostel" -> "geyser not heating in hostel"
 */

export const normalizeCampusSpeech = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;

  // 1. Wi-Fi / Internet phonetics (wife / why fi / waif -> Wi-Fi)
  s = s.replace(/\b(college|campus|hostel|room|library|department|block|lab|class)\s+wife\b/gi, '$1 Wi-Fi');
  s = s.replace(/\bthe\s+wife\s+(is|not|down|slow|working|broken)\b/gi, 'the Wi-Fi $1');
  s = s.replace(/\bwife\s+(is|not|down|slow|speed|issue|problem|connection|network|signal|password|router|connectivity|working)\b/gi, 'Wi-Fi $1');
  s = s.replace(/\b(connect\s+to|connect|fix\s+the|access\s+the)\s+wife\b/gi, '$1 Wi-Fi');
  s = s.replace(/\bwife\b(?=.*\b(working|signal|router|internet|slow|speed|connect|network|password|down|frequency|connectivity|modem|lan)\b)/gi, 'Wi-Fi');
  s = s.replace(/\b(wi\s*fi|why\s*fi|why-fi|y\s*fi|waif|white\s*fi|why\s*fight)\b/gi, 'Wi-Fi');

  // 2. Mess phonetics (mens / men's / mesh / mass -> mess)
  s = s.replace(/\b(college|hostel|campus|boys|girls|block\s+[a-z0-9]+)\s+(mens|men\'s|mesh|mass)\b/gi, '$1 mess');
  s = s.replace(/\b(mens|men\'s|mesh)\s+(food|dish|meal|lunch|dinner|breakfast|canteen|hygiene|taste|quality|timing|menu|hall|cleanliness|cook|caterer|worker|tea|snack|tiffin)\b/gi, 'mess $2');
  s = s.replace(/\b(in|at|to)\s+(the\s+)?(mens|men\'s|mesh)\b/gi, '$1 $2mess');
  s = s.replace(/\b(mens|men\'s)\s+(is|was|has|are|food)\b/gi, 'mess $2');
  s = s.replace(/\b(mens|men\'s)\b/gi, 'mess');

  // 3. Canteen & Dish phonetics
  s = s.replace(/\bcan\s+teen\b/gi, 'canteen');
  s = s.replace(/\bcanteen\s+this\b/gi, 'canteen dish');
  s = s.replace(/\bcontain\s+food\b/gi, 'canteen food');

  // 4. Lab phonetics (lap -> lab in academic contexts)
  s = s.replace(/\b(computer|chemistry|physics|mechanical|electrical|cad|programming|coding|science|hardware|software|networking)\s+lap\b/gi, '$1 lab');

  // 5. Water / Utilities / Infrastructure
  s = s.replace(/\b(arrow|our|arvo|ar\s*o|r\s*o)\s+water\b/gi, 'RO water');
  s = s.replace(/\b(gyser|gezer|gazer|geaser|gezar)\b/gi, 'geyser');
  s = s.replace(/\bwash\s+basin\b/gi, 'washbasin');
  s = s.replace(/\btube\s+light\b/gi, 'tubelight');
  s = s.replace(/\bwater\s+purifire\b/gi, 'water purifier');

  // 6. Academics
  s = s.replace(/\b(all|whole)\s+ticket\b/gi, 'hall ticket');
  s = s.replace(/\bsemister\b/gi, 'semester');
  s = s.replace(/\b(meet|talk\s+to|inform)\s+hot\b/gi, '$1 HOD');

  // 7. Ragging / Harassment
  s = s.replace(/\b(rag\s+in|ranking)\s+(in|at|by|the)\b/gi, 'ragging $2');
  s = s.replace(/\b(herasment|harasment|herassment)\b/gi, 'harassment');

  return s;
};

