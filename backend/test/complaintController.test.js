const { describe, it } = require('node:test');
const assert = require('node:assert');

// Test the isolated controller functions
const calculateSLADeadline = (priority) => {
  const now = new Date();
  switch (priority) {
    case 'CRITICAL':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case 'HIGH':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'MEDIUM':
      return new Date(now.getTime() + 48 * 60 * 60 * 1000);
    case 'LOW':
    default:
      return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  }
};

const SUPPORTED_CATEGORIES = [
  'Academic',
  'Hostel',
  'Transport',
  'Infrastructure',
  'Internet/Wi-Fi',
  'Harassment',
  'Ragging',
  'Safety',
  'Canteen Dish Issue',
  'Other'
];

const determineFinalCategory = ({ studentCategory, aiResults, issueType }) => {
  const normStudentCat = SUPPORTED_CATEGORIES.includes(studentCategory) ? studentCategory : 'Other';

  // 1. Mandatory safety overrides
  if (aiResults?.isFoodSafetyOverride || issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE') {
    return 'Canteen Dish Issue';
  }

  const detCat = aiResults?.detectedCategory;
  if (detCat && ['Harassment', 'Ragging', 'Safety'].includes(detCat) && aiResults?.priority === 'CRITICAL') {
    return detCat;
  }

  // 2. Deterministic AI category when sufficiently supported
  if (detCat && SUPPORTED_CATEGORIES.includes(detCat)) {
    const hasStrongSupport = (aiResults?.matchedKeywords && aiResults.matchedKeywords.length >= 2) ||
      (aiResults?.priority === 'HIGH' || aiResults?.priority === 'CRITICAL');
    if (hasStrongSupport) {
      return detCat;
    }
  }

  // 3. ML-predicted category when confidence meets threshold
  const mlAnalysis = aiResults?.mlAnalysis;
  const mlCat = mlAnalysis?.predicted_category;
  const mlConf = typeof mlAnalysis?.confidence === 'number' ? mlAnalysis.confidence : 0;

  if (mlCat && SUPPORTED_CATEGORIES.includes(mlCat) && mlConf >= 0.70) {
    return mlCat;
  }

  if (detCat && SUPPORTED_CATEGORIES.includes(detCat) && normStudentCat === 'Other') {
    return detCat;
  }

  // 4. Retain student's selected category
  return normStudentCat;
};

const getAssignedDepartment = (category) => {
  switch (category) {
    case 'Academic': return 'Academic Department';
    case 'Hostel': return 'Hostel Administration';
    case 'Transport': return 'Transport Department';
    case 'Internet/Wi-Fi': return 'IT Department';
    case 'Infrastructure': return 'Maintenance Department';
    case 'Harassment':
    case 'Ragging':
    case 'Safety': return 'Student Welfare / Anti-Ragging Committee';
    case 'Canteen Dish Issue': return 'Canteen & Hospitality';
    default: return 'General Administration';
  }
};

describe('SCGRS Backend Business Logic Tests', () => {

  describe('SLA Deadline Synchronization (Requirement 4)', () => {
    it('CRITICAL SLA must be 4 hours', () => {
      const start = Date.now();
      const deadline = calculateSLADeadline('CRITICAL');
      const diffHours = Math.round((deadline.getTime() - start) / (1000 * 60 * 60));
      assert.strictEqual(diffHours, 4);
    });

    it('HIGH SLA must be 24 hours', () => {
      const start = Date.now();
      const deadline = calculateSLADeadline('HIGH');
      const diffHours = Math.round((deadline.getTime() - start) / (1000 * 60 * 60));
      assert.strictEqual(diffHours, 24);
    });

    it('MEDIUM SLA must be 48 hours', () => {
      const start = Date.now();
      const deadline = calculateSLADeadline('MEDIUM');
      const diffHours = Math.round((deadline.getTime() - start) / (1000 * 60 * 60));
      assert.strictEqual(diffHours, 48);
    });

    it('LOW SLA must be 72 hours', () => {
      const start = Date.now();
      const deadline = calculateSLADeadline('LOW');
      const diffHours = Math.round((deadline.getTime() - start) / (1000 * 60 * 60));
      assert.strictEqual(diffHours, 72);
    });
  });

  describe('Category Selection Policy (Requirement 5)', () => {
    it('Mandatory override for food safety issues', () => {
      const res = determineFinalCategory({
        studentCategory: 'Academic',
        aiResults: { isFoodSafetyOverride: true, priority: 'CRITICAL' },
        issueType: 'FOREIGN_OBJECT'
      });
      assert.strictEqual(res, 'Canteen Dish Issue');
    });

    it('Mandatory override for critical harassment/ragging', () => {
      const res = determineFinalCategory({
        studentCategory: 'Other',
        aiResults: { detectedCategory: 'Harassment', priority: 'CRITICAL' },
        issueType: null
      });
      assert.strictEqual(res, 'Harassment');
    });

    it('Uses ML category when confidence meets 0.70 threshold', () => {
      const res = determineFinalCategory({
        studentCategory: 'Other',
        aiResults: {
          mlAnalysis: { predicted_category: 'Internet/Wi-Fi', confidence: 0.85 }
        },
        issueType: null
      });
      assert.strictEqual(res, 'Internet/Wi-Fi');
    });

    it('Does not use ML category when confidence is below 0.70', () => {
      const res = determineFinalCategory({
        studentCategory: 'Hostel',
        aiResults: {
          mlAnalysis: { predicted_category: 'Academic', confidence: 0.55 }
        },
        issueType: null
      });
      assert.strictEqual(res, 'Hostel');
    });

    it('Retains student category when AI is unreliable', () => {
      const res = determineFinalCategory({
        studentCategory: 'Transport',
        aiResults: null,
        issueType: null
      });
      assert.strictEqual(res, 'Transport');
    });
  });

  describe('Department Routing Validation', () => {
    it('Routes all supported categories to appropriate departments', () => {
      assert.strictEqual(getAssignedDepartment('Academic'), 'Academic Department');
      assert.strictEqual(getAssignedDepartment('Hostel'), 'Hostel Administration');
      assert.strictEqual(getAssignedDepartment('Transport'), 'Transport Department');
      assert.strictEqual(getAssignedDepartment('Internet/Wi-Fi'), 'IT Department');
      assert.strictEqual(getAssignedDepartment('Infrastructure'), 'Maintenance Department');
      assert.strictEqual(getAssignedDepartment('Harassment'), 'Student Welfare / Anti-Ragging Committee');
      assert.strictEqual(getAssignedDepartment('Ragging'), 'Student Welfare / Anti-Ragging Committee');
      assert.strictEqual(getAssignedDepartment('Safety'), 'Student Welfare / Anti-Ragging Committee');
      assert.strictEqual(getAssignedDepartment('Canteen Dish Issue'), 'Canteen & Hospitality');
      assert.strictEqual(getAssignedDepartment('Other'), 'General Administration');
      assert.strictEqual(getAssignedDepartment('UnknownCategory'), 'General Administration');
    });
  });
});
