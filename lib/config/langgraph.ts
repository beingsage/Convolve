/**
 * LangGraph Service Configuration
 */

export interface LangGraphConfig {
  service_url: string;
  timeout_ms: number;
  retry_attempts: number;
  health_check_interval_ms: number;
}

export function getLangGraphConfig(): LangGraphConfig {
  return {
    service_url: process.env.LANGGRAPH_SERVICE_URL || 'http://localhost:8000',
    timeout_ms: parseInt(process.env.LANGGRAPH_TIMEOUT_MS || '30000'),
    retry_attempts: parseInt(process.env.LANGGRAPH_RETRY_ATTEMPTS || '3'),
    health_check_interval_ms: parseInt(process.env.LANGGRAPH_HEALTH_CHECK_INTERVAL_MS || '30000'),
  };
}

export function validateLangGraphConfig(): { valid: boolean; errors: string[] } {
  const config = getLangGraphConfig();
  const errors: string[] = [];

  try {
    new URL(config.service_url);
  } catch {
    errors.push('Invalid LANGGRAPH_SERVICE_URL');
  }

  if (config.timeout_ms < 1000) {
    errors.push('LANGGRAPH_TIMEOUT_MS must be at least 1000ms');
  }

  if (config.retry_attempts < 0) {
    errors.push('LANGGRAPH_RETRY_ATTEMPTS must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}