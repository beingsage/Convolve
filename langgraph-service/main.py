"""
UAILS LangGraph Service
FastAPI application providing LangGraph workflows for knowledge processing
"""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uvicorn

from workflows.knowledge_workflow import KnowledgeWorkflow
from workflows.reasoning_workflow import ReasoningWorkflow
from storage.qdrant_client import QdrantClient
from storage.neo4j_client import Neo4jClient

# Global instances
qdrant_client: Optional[QdrantClient] = None
neo4j_client: Optional[Neo4jClient] = None
knowledge_workflow: Optional[KnowledgeWorkflow] = None
reasoning_workflow: Optional[ReasoningWorkflow] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global qdrant_client, neo4j_client, knowledge_workflow, reasoning_workflow

    # Initialize clients
    try:
        qdrant_client = QdrantClient()
        neo4j_client = Neo4jClient()
        await neo4j_client.connect()

        # Initialize workflows
        knowledge_workflow = KnowledgeWorkflow(qdrant_client, neo4j_client)
        reasoning_workflow = ReasoningWorkflow(qdrant_client, neo4j_client)

        print("✅ LangGraph service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize service: {e}")
        raise

    yield

    # Cleanup
    if neo4j_client:
        await neo4j_client.disconnect()

# Create FastAPI app
app = FastAPI(
    title="UAILS LangGraph Service",
    description="LangGraph-powered knowledge processing workflows",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class IngestionRequest(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = None
    source: Optional[str] = None

class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None

# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "qdrant": qdrant_client is not None,
            "neo4j": neo4j_client is not None,
            "knowledge_workflow": knowledge_workflow is not None,
            "reasoning_workflow": reasoning_workflow is not None
        }
    }

@app.post("/workflows/ingest", response_model=WorkflowResponse)
async def ingest_knowledge(request: IngestionRequest, background_tasks: BackgroundTasks):
    """Trigger knowledge ingestion workflow"""
    if not knowledge_workflow:
        raise HTTPException(status_code=503, detail="Knowledge workflow not initialized")

    try:
        # Start workflow in background
        workflow_id = f"ingest_{asyncio.get_event_loop().time()}"
        background_tasks.add_task(
            knowledge_workflow.run,
            workflow_id,
            request.content,
            request.metadata or {},
            request.source
        )

        return WorkflowResponse(
            workflow_id=workflow_id,
            status="running"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start ingestion: {str(e)}")

@app.post("/workflows/reason", response_model=WorkflowResponse)
async def reason_query(request: QueryRequest, background_tasks: BackgroundTasks):
    """Trigger reasoning workflow"""
    if not reasoning_workflow:
        raise HTTPException(status_code=503, detail="Reasoning workflow not initialized")

    try:
        # Start workflow in background
        workflow_id = f"reason_{asyncio.get_event_loop().time()}"
        background_tasks.add_task(
            reasoning_workflow.run,
            workflow_id,
            request.query,
            request.context or {}
        )

        return WorkflowResponse(
            workflow_id=workflow_id,
            status="running"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start reasoning: {str(e)}")

@app.get("/workflows/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Get workflow execution status"""
    # For now, return a mock status
    # In production, you'd track workflow state
    return {
        "workflow_id": workflow_id,
        "status": "completed",
        "result": {"message": "Workflow completed successfully"}
    }

def main():
    """Main entry point"""
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )

if __name__ == "__main__":
    main()