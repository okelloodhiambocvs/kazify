export interface GeminiEstimateResponse {
  estimated_amount: number;
  duration_estimate: string;
  standard_risk_score: number;
  price_breakdown: string[];
  fraud_flags: string[];
}

export const FALLBACK_ESTIMATE: GeminiEstimateResponse = {
  estimated_amount: 1800,
  duration_estimate: "2 - 4 hours",
  standard_risk_score: 2,
  price_breakdown: [
    "Plumbing call-out diagnostics and troubleshooting standard rates: KES 1,000",
    "Minor pipe leaks, fittings, and retrofitting materials allowance: KES 800"
  ],
  fraud_flags: []
};

/**
 * Validates the structure and type of the response returned by the Gemini AI API.
 */
export function validateGeminiEstimateResponse(data: any): boolean {
  if (!data || typeof data !== 'object') {
    console.error('[Schema Validation] Data is not a valid object:', data);
    return false;
  }
  if (typeof data.estimated_amount !== 'number' || isNaN(data.estimated_amount)) {
    console.error('[Schema Validation] estimated_amount is missing or not a valid number:', data.estimated_amount);
    return false;
  }
  if (typeof data.duration_estimate !== 'string' || data.duration_estimate.trim() === '') {
    console.error('[Schema Validation] duration_estimate is missing or not a non-empty string:', data.duration_estimate);
    return false;
  }
  if (typeof data.standard_risk_score !== 'number' || isNaN(data.standard_risk_score)) {
    console.error('[Schema Validation] standard_risk_score is missing or not a valid number:', data.standard_risk_score);
    return false;
  }
  if (data.standard_risk_score < 1 || data.standard_risk_score > 10) {
    console.error('[Schema Validation] standard_risk_score is out of bounds (1-10):', data.standard_risk_score);
    return false;
  }
  if (!Array.isArray(data.price_breakdown) || !data.price_breakdown.every((item: any) => typeof item === 'string')) {
    console.error('[Schema Validation] price_breakdown is missing, not an array, or contains non-string values:', data.price_breakdown);
    return false;
  }
  if (!Array.isArray(data.fraud_flags) || !data.fraud_flags.every((item: any) => typeof item === 'string')) {
    console.error('[Schema Validation] fraud_flags is missing, not an array, or contains non-string values:', data.fraud_flags);
    return false;
  }
  return true;
}

/**
 * Cleans a raw text string by removing potential markdown wrapping blocks
 * (such as ```json ... ```) and parses it into an object.
 */
export function cleanGeminiJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Input raw text is empty or not a string.');
  }

  let cleaned = rawText.trim();
  
  // Remove starting ```json or ``` code block markers
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop();
    }
    cleaned = lines.join('\n').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
}
