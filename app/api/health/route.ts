import { getStorageAdapter, getStorageStatus } from '@/lib/storage/factory';
import { getStorageConfig } from '@/lib/config/storage';

export async function GET() {
  try {
    const config = getStorageConfig();
    const status = await getStorageStatus();

    return Response.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      storage: {
        type: config.type,
        ready: status.ready,
        healthy: status.healthy,
        error: status.error || null,
      },
      version: '1.0.0',
      features: {
        semanticQuery: true,
        knowledgeGraph: true,
        agents: {
          ingestion: true,
          alignment: true,
          contradiction: true,
          curriculum: true,
          research: true,
        },
        interfaces: {
          query: '/query',
          graph: '/graph',
          skills: '/skills',
          paths: '/paths',
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      {
        success: false,
        status: 'unhealthy',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
