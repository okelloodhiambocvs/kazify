import api from '../services/api';

export interface HandshakeResult {
  status: 'ok' | 'error';
  code?: string;
  message: string;
  latencyMs?: number;
}

/**
 * Performs a diagnostic connection handshake with the backend's Gemini API testing endpoint.
 * Includes timeout handling to ensure quick feedback.
 */
export async function performGeminiHandshake(timeoutMs: number = 8000): Promise<HandshakeResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await api.get('/api/ai/diagnose', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.data && response.data.status === 'ok') {
      return {
        status: 'ok',
        code: response.data.code,
        message: response.data.message || 'Gemini API is fully reachable.',
        latencyMs: response.data.latencyMs
      };
    }

    return {
      status: 'error',
      code: response.data?.code || 'UNKNOWN_DIAGNOSTIC_FAILURE',
      message: response.data?.message || 'Gemini API test handshake returned a failure status.',
      latencyMs: response.data?.latencyMs
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      return {
        status: 'error',
        code: 'TIMEOUT',
        message: `Gemini API connection diagnostics timed out after ${timeoutMs}ms. The server or external model endpoint might be unreachable.`
      };
    }

    const serverMsg = error.response?.data?.message || error.response?.data?.error;
    return {
      status: 'error',
      code: error.response?.data?.code || 'NETWORK_ERROR',
      message: serverMsg || error.message || 'Failed to establish a diagnostic connection to the Gemini endpoint.'
    };
  }
}
