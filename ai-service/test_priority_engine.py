import unittest
from priority_engine import analyze_complaint

class TestPriorityEngine(unittest.TestCase):

    def test_empty_complaint(self):
        """Empty input should assign baseline LOW priority (score 0.30) without crashes."""
        res = analyze_complaint("")
        self.assertEqual(res['priority'], 'LOW')
        self.assertEqual(res['score'], 0.30)
        self.assertEqual(res['matchedKeywords'], [])
        self.assertEqual(res['sentiment'], 'NEUTRAL')

    def test_academic_complaints(self):
        """Single academic issue (weight 25) is LOW (0-39), multiple academic keywords escalate appropriately."""
        # Single keyword: exam issue (weight 25 -> LOW)
        res = analyze_complaint("I have an exam issue")
        self.assertEqual(res['priority'], 'LOW')
        self.assertTrue(any('exam issue' in kw for kw in res['matchedKeywords']))
        self.assertEqual(res['detectedCategory'], 'Academic')
        self.assertEqual(res['assignedDepartment'], 'Academic Department')

        # Multiple academic keywords: academic emergency (30) + exam issue (25) + fees (25) = 80 -> CRITICAL
        res_multi = analyze_complaint("Academic emergency regarding my exam issue and unpaid fees")
        self.assertEqual(res_multi['priority'], 'CRITICAL')
        self.assertGreaterEqual(res_multi['score'], 0.88)

    def test_infrastructure_complaints(self):
        """Infrastructure keywords match accurately and sum correctly."""
        # fan (10) + broken (15) = 25 -> LOW
        res_low = analyze_complaint("The classroom fan is broken")
        self.assertEqual(res_low['priority'], 'LOW')
        self.assertTrue(any('fan' in kw for kw in res_low['matchedKeywords']))
        self.assertTrue(any('broken' in kw for kw in res_low['matchedKeywords']))
        self.assertEqual(res_low['detectedCategory'], 'Infrastructure')

        # fire (40) + broken door (25) = 65 -> HIGH (60-79)
        res_high = analyze_complaint("There is a fire near the broken door")
        self.assertEqual(res_high['priority'], 'HIGH')
        self.assertGreaterEqual(res_high['score'], 0.76)

    def test_multiple_severity_keywords(self):
        """Combinations exceeding 80 produce CRITICAL priority."""
        res = analyze_complaint("Harassment and ragging with violence and threat in hostel")
        self.assertEqual(res['priority'], 'CRITICAL')
        self.assertGreaterEqual(res['score'], 0.90)
        self.assertEqual(res['detectedCategory'], 'Harassment')

    def test_serious_food_safety_complaints(self):
        """Cockroach, foreign objects, or food poisoning must trigger CRITICAL food safety override."""
        res = analyze_complaint("I found a cockroach in my food")
        self.assertEqual(res['priority'], 'CRITICAL')
        self.assertTrue(res['isFoodSafetyOverride'])
        self.assertGreaterEqual(res['score'], 0.92)
        self.assertEqual(res['detectedCategory'], 'Canteen Dish Issue')
        self.assertEqual(res['assignedDepartment'], 'Canteen & Hospitality')

        res_foreign = analyze_complaint("Foreign object in dal", issue_type="FOREIGN_OBJECT")
        self.assertEqual(res_foreign['priority'], 'CRITICAL')
        self.assertTrue(res_foreign['isFoodSafetyOverride'])

    def test_ordinary_food_quality_complaints(self):
        """Ordinary canteen/food complaints do NOT trigger CRITICAL food safety override."""
        # Ordinary canteen complaint: canteen (15) + dish (15) = 30 -> LOW (0-39)
        res_ordinary = analyze_complaint("The food in the canteen was cold and the dish was salty")
        self.assertFalse(res_ordinary['isFoodSafetyOverride'])
        self.assertEqual(res_ordinary['priority'], 'LOW')

        # High hygiene complaint: issue_type="HYGIENE" -> escalated to HIGH (not CRITICAL)
        res_hygiene = analyze_complaint("The stale food in mess", issue_type="HYGIENE")
        self.assertTrue(res_hygiene['isFoodSafetyOverride'])
        self.assertEqual(res_hygiene['priority'], 'HIGH')
        self.assertGreaterEqual(res_hygiene['score'], 0.76)

    def test_false_fuzzy_matching(self):
        """'food' must NOT fuzzy-match 'flood', and stopwords like 'for' must NOT match 'fire'."""
        res_food = analyze_complaint("The food served today was very good")
        # Ensure 'flood' was not matched
        for kw in res_food['matchedKeywords']:
            self.assertNotIn('flood', kw.lower())
        self.assertNotEqual(res_food['detectedCategory'], 'Infrastructure')

        res_for = analyze_complaint("Study materials for examination")
        for kw in res_for['matchedKeywords']:
            self.assertNotIn('fire', kw.lower())

    def test_negative_sentiment(self):
        """Negative sentiment words must be correctly labeled as NEGATIVE."""
        res = analyze_complaint("This is the worst terrible broken experience and awful service")
        self.assertEqual(res['sentiment'], 'NEGATIVE')

    def test_positive_sentiment(self):
        """Positive sentiment words must be correctly labeled as POSITIVE."""
        res = analyze_complaint("Thanks for fixing the issue great helpful support awesome")
        self.assertEqual(res['sentiment'], 'POSITIVE')

    def test_sentiment_not_affecting_priority(self):
        """Sentiment must NOT independently modify score or priority (Requirement 2)."""
        res_neg = analyze_complaint("This is a terrible bad exam")
        res_pos = analyze_complaint("Thanks for the great exam")
        res_neu = analyze_complaint("Please review the exam schedule")

        self.assertEqual(res_neg['priority'], res_neu['priority'])
        self.assertEqual(res_pos['priority'], res_neu['priority'])
        self.assertEqual(res_neg['score'], res_neu['score'])
        self.assertEqual(res_pos['score'], res_neu['score'])

        # Verify sentiments are annotated separately
        self.assertEqual(res_neg['sentiment'], 'NEGATIVE')
        self.assertEqual(res_pos['sentiment'], 'POSITIVE')
        self.assertEqual(res_neu['sentiment'], 'NEUTRAL')


if __name__ == '__main__':
    unittest.main()
