/**
 * UAILS Storage Configuration
 * Single source of truth for backend selection and settings
 */

import { StorageType, StorageConfig, UAILSConfig, DecayConfig } from '@/lib/types';

// ============================================================================
// Configuration Loading
// ============================================================================

export function getStorageType(): StorageType {
  const type = process.env.STORAGE_TYPE || 'memory';
  return type as StorageType;
}

export function getStorageConfig(): StorageConfig {
  const type = getStorageType();
  
  // Load environment-specific configurations
  switch (type) {
    case 'mongodb':
      return {
        type: 'mongodb',
        connection_string: process.env.MONGODB_URI || 'mongodb://localhost:27017/uails',
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        },
      };
    
    case 'neo4j':
      return {
        type: 'neo4j',
        connection_string: process.env.NEO4J_URI || 'neo4j://localhost:7687',
        credentials: {
          username: process.env.NEO4J_USERNAME || 'neo4j',
          password: process.env.NEO4J_PASSWORD || 'password',
        },
      };
    
    case 'qdrant':
      return {
        type: 'qdrant',
        connection_string: process.env.QDRANT_URL || 'http://localhost:6333',
        credentials: {
          password: process.env.QDRANT_API_KEY,
        },
      };
    
    case 'postgres':
      return {
        type: 'postgres',
        connection_string: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/uails',
      };
    
    case 'memory':
    default:
      return {
        type: 'memory',
      };
  }
}

// ============================================================================
// Decay Configuration
// ============================================================================

export function getDecayConfig(): DecayConfig {
  return {
    base_lambda: 0.693 / (30 * 24 * 60 * 60 * 1000), // half-life = 30 days in ms
    reinforcement_boost: 0.1, // 10% strength increase on access
    citation_weight: 0.05, // citations slow decay by 5%
    foundational_bonus: 0.5, // foundational concepts decay 50% slower
  };
}

// ============================================================================
// Full UAILS Configuration
// ============================================================================

export function getUAILSConfig(): UAILSConfig {
  return {
    storage: getStorageConfig(),
    embedding_model: {
      provider: process.env.EMBEDDING_PROVIDER || 'openai',
      model_name: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
    },
    decay: getDecayConfig(),
    feature_flags: {
      enable_vector_search: process.env.ENABLE_VECTOR_SEARCH !== 'false',
      enable_graph_reasoning: process.env.ENABLE_GRAPH_REASONING !== 'false',
      auto_concept_extraction: process.env.AUTO_CONCEPT_EXTRACTION !== 'false',
    },
  };
}

// ============================================================================
// Demo Configuration (for local testing)
// ============================================================================

export const DEMO_CONFIG: UAILSConfig = {
  storage: {
    type: 'memory',
  },
  embedding_model: {
    provider: 'local',
    model_name: 'demo-embeddings',
    dimension: 128,
  },
  decay: getDecayConfig(),
  feature_flags: {
    enable_vector_search: true,
    enable_graph_reasoning: true,
    auto_concept_extraction: true,
  },
};

// ============================================================================
// Environment Variable Validation
// ============================================================================

export function validateStorageConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const type = getStorageType();

  switch (type) {
    case 'mongodb':
      if (!process.env.MONGODB_URI && !process.env.DATABASE_URL) {
        errors.push('MONGODB_URI or DATABASE_URL environment variable required');
      }
      break;

    case 'neo4j':
      if (!process.env.NEO4J_URI) {
        errors.push('NEO4J_URI environment variable required');
      }
      if (!process.env.NEO4J_USERNAME) {
        errors.push('NEO4J_USERNAME environment variable required');
      }
      if (!process.env.NEO4J_PASSWORD) {
        errors.push('NEO4J_PASSWORD environment variable required');
      }
      break;

    case 'qdrant':
      if (!process.env.QDRANT_URL) {
        errors.push('QDRANT_URL environment variable required');
      }
      break;

    case 'postgres':
      if (!process.env.DATABASE_URL) {
        errors.push('DATABASE_URL environment variable required');
      }
      break;

    case 'memory':
      // No validation needed for memory storage
      break;

    default:
      errors.push(`Unknown storage type: ${type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Configuration Display (for debugging)
// ============================================================================

export function getConfigSummary(): string {
  const config = getUAILSConfig();
  return `
UAILS Configuration Summary:
===========================
Storage Type: ${config.storage.type}
Embedding Provider: ${config.embedding_model.provider}
Embedding Model: ${config.embedding_model.model_name}
Embedding Dimension: ${config.embedding_model.dimension}
Vector Search: ${config.feature_flags?.enable_vector_search ? 'Enabled' : 'Disabled'}
Graph Reasoning: ${config.feature_flags?.enable_graph_reasoning ? 'Enabled' : 'Disabled'}
Auto Extraction: ${config.feature_flags?.auto_concept_extraction ? 'Enabled' : 'Disabled'}
Decay Lambda: ${config.decay.base_lambda}
===========================
  `.trim();
}
