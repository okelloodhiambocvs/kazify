import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateGeminiEstimateResponse, 
  cleanGeminiJson, 
  FALLBACK_ESTIMATE 
} from './geminiValidation';

describe('validateGeminiEstimateResponse', () => {
  // Suppress console.error in tests for cleaner output
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return true for a perfectly valid response structure', () => {
    const validResponse = {
      estimated_amount: 2500,
      duration_estimate: "3 - 5 hours",
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostic fee: KES 1,500", "Part replacement: KES 1,000"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(validResponse)).toBe(true);
  });

  it('should return false if data is null, undefined, or not an object', () => {
    expect(validateGeminiEstimateResponse(null)).toBe(false);
    expect(validateGeminiEstimateResponse(undefined)).toBe(false);
    expect(validateGeminiEstimateResponse("some string")).toBe(false);
    expect(validateGeminiEstimateResponse(42)).toBe(false);
  });

  it('should return false if estimated_amount is missing, not a number, or NaN', () => {
    const invalidAmt = {
      estimated_amount: "2500", // String instead of number
      duration_estimate: "3 - 5 hours",
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(invalidAmt)).toBe(false);

    const missingAmt = {
      duration_estimate: "3 - 5 hours",
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(missingAmt)).toBe(false);

    const nanAmt = {
      estimated_amount: NaN,
      duration_estimate: "3 - 5 hours",
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(nanAmt)).toBe(false);
  });

  it('should return false if duration_estimate is missing, not a string, or empty', () => {
    const invalidDuration = {
      estimated_amount: 2500,
      duration_estimate: 120, // number instead of string
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(invalidDuration)).toBe(false);

    const emptyDuration = {
      estimated_amount: 2500,
      duration_estimate: "   ", // whitespace string
      standard_risk_score: 4,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(emptyDuration)).toBe(false);
  });

  it('should return false if standard_risk_score is out of bounds (1-10)', () => {
    const zeroScore = {
      estimated_amount: 2500,
      duration_estimate: "2 hours",
      standard_risk_score: 0, // out of bounds
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(zeroScore)).toBe(false);

    const highScore = {
      estimated_amount: 2500,
      duration_estimate: "2 hours",
      standard_risk_score: 11, // out of bounds
      price_breakdown: ["Base diagnostics"],
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(highScore)).toBe(false);
  });

  it('should return false if price_breakdown is missing, not an array, or has non-string values', () => {
    const nonArrayBreakdown = {
      estimated_amount: 2500,
      duration_estimate: "2 hours",
      standard_risk_score: 5,
      price_breakdown: "1500 materials, 1000 labor", // string instead of array
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(nonArrayBreakdown)).toBe(false);

    const wrongTypesBreakdown = {
      estimated_amount: 2500,
      duration_estimate: "2 hours",
      standard_risk_score: 5,
      price_breakdown: [1500, 1000], // numbers instead of strings
      fraud_flags: []
    };
    expect(validateGeminiEstimateResponse(wrongTypesBreakdown)).toBe(false);
  });

  it('should return false if fraud_flags is missing or has non-string values', () => {
    const nonArrayFlags = {
      estimated_amount: 2500,
      duration_estimate: "2 hours",
      standard_risk_score: 5,
      price_breakdown: ["Base diagnostics"],
      fraud_flags: null // null instead of array
    };
    expect(validateGeminiEstimateResponse(nonArrayFlags)).toBe(false);
  });
});

describe('cleanGeminiJson', () => {
  it('should correctly parse a clean JSON string', () => {
    const input = '{"test": 123}';
    expect(cleanGeminiJson(input)).toEqual({ test: 123 });
  });

  it('should correctly remove markdown code blocks and parse', () => {
    const input = '```json\n{\n  "amount": 1000\n}\n```';
    expect(cleanGeminiJson(input)).toEqual({ amount: 1000 });
  });

  it('should handle code blocks without the json identifier', () => {
    const input = '```\n{\n  "amount": 2000\n}\n```';
    expect(cleanGeminiJson(input)).toEqual({ amount: 2000 });
  });

  it('should throw an error for malformed JSON strings', () => {
    const malformed = '{"amount": 1000'; // Missing closing brace
    expect(() => cleanGeminiJson(malformed)).toThrow(/JSON parsing failed/);
  });

  it('should throw an error for empty or invalid inputs', () => {
    expect(() => cleanGeminiJson('')).toThrow('Input raw text is empty or not a string.');
    expect(() => cleanGeminiJson(null as any)).toThrow('Input raw text is empty or not a string.');
  });
});
