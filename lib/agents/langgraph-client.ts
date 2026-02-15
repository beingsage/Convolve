/**
 * LangGraph Service Client
 * TypeScript client for communicating with the Python LangGraph service
 */

import axios, { AxiosInstance } from 'axios';

export interface IngestionRequest {
  content: string;
  metadata?: Record<string, any>;
  source?: string;
}

export interface QueryRequest {
  query: string;
  context?: Record<string, any>;
}

export interface WorkflowResponse {
  workflow_id: string;
  status: string;
  result?: Record<string, any>;
}

export interface WorkflowStatus {
  workflow_id: string;
  status: string;
  result?: Record<string, any>;
}

export class LangGraphClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = process.env.LANGGRAPH_SERVICE_URL || 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check if the LangGraph service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('LangGraph service health check failed:', error);
      return false;
    }
  }

  /**
   * Start a knowledge ingestion workflow
   */
  async ingestKnowledge(request: IngestionRequest): Promise<WorkflowResponse> {
    try {
      const response = await this.client.post('/workflows/ingest', request);
      return response.data;
    } catch (error) {
      console.error('Failed to start ingestion workflow:', error);
      throw new Error(`Ingestion workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start a reasoning workflow
   */
  async reasonQuery(request: QueryRequest): Promise<WorkflowResponse> {
    try {
      const response = await this.client.post('/workflows/reason', request);
      return response.data;
    } catch (error) {
      console.error('Failed to start reasoning workflow:', error);
      throw new Error(`Reasoning workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    try {
      const response = await this.client.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get workflow status for ${workflowId}:`, error);
      throw new Error(`Workflow status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for workflow completion
   */
  async waitForWorkflow(workflowId: string, timeoutMs: number = 60000): Promise<WorkflowStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getWorkflowStatus(workflowId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Workflow ${workflowId} did not complete within ${timeoutMs}ms`);
  }

  /**
   * Ingest knowledge and wait for completion
   */
  async ingestKnowledgeSync(request: IngestionRequest, timeoutMs: number = 60000): Promise<WorkflowStatus> {
    const response = await this.ingestKnowledge(request);
    return await this.waitForWorkflow(response.workflow_id, timeoutMs);
  }

  /**
   * Reason query and wait for completion
   */
  async reasonQuerySync(request: QueryRequest, timeoutMs: number = 60000): Promise<WorkflowStatus> {
    const response = await this.reasonQuery(request);
    return await this.waitForWorkflow(response.workflow_id, timeoutMs);
  }
}

// Singleton instance
let langGraphClient: LangGraphClient | null = null;

/**
 * Get the singleton LangGraph client instance
 */
export function getLangGraphClient(): LangGraphClient {
  if (!langGraphClient) {
    langGraphClient = new LangGraphClient();
  }
  return langGraphClient;
}

/**
 * Reset the client instance (for testing)
 */
export function resetLangGraphClient(): void {
  langGraphClient = null;
}