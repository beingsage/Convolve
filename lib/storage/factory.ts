/**
 * Storage Factory & Singleton Pattern
 * Ensures single instance of storage adapter across app
 */

import { IStorageAdapter, createStorageAdapter } from './adapter';
import { getStorageConfig, validateStorageConfig } from '@/lib/config/storage';

// ============================================================================
// Global Singleton Instance
// ============================================================================

let storageInstance: IStorageAdapter | null = null;
let isInitializing = false;
let initError: Error | null = null;

/**
 * Get the singleton storage adapter instance
 * Creates and initializes on first call
 */
export async function getStorageAdapter(): Promise<IStorageAdapter> {
  // Return existing instance if already initialized
  if (storageInstance) {
    return storageInstance;
  }

  // Prevent concurrent initialization attempts
  if (isInitializing) {
    let attempts = 0;
    while (isInitializing && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 50));
      attempts++;
    }
    if (storageInstance) return storageInstance;
    if (initError) throw initError;
  }

  try {
    isInitializing = true;

    // Validate configuration
    const validation = validateStorageConfig();
    if (!validation.valid) {
      throw new Error(`Storage configuration invalid:\n${validation.errors.join('\n')}`);
    }

    // Get storage type and config
    const config = getStorageConfig();
    
    console.log(`[UAILS] Initializing ${config.type} storage adapter...`);

    // Create adapter instance
    storageInstance = createStorageAdapter(config.type, config);

    // Initialize connection
    await storageInstance.initialize();

    // Verify health
    const healthy = await storageInstance.healthCheck();
    if (!healthy) {
      throw new Error(`Storage adapter health check failed for ${config.type}`);
    }

    console.log(`[UAILS] Storage adapter initialized successfully (${config.type})`);
    
    // Seed demo data for in-memory and neo4j storage
    if (config.type === 'memory' || config.type === 'neo4j') {
      await seedDemoData(storageInstance);
    }
    
    return storageInstance;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error('[UAILS] Failed to initialize storage adapter:', initError);
    throw initError;
  } finally {
    isInitializing = false;
  }
}

/**
 * Reset the singleton instance (for testing)
 */
export async function resetStorageAdapter(): Promise<void> {
  if (storageInstance) {
    await storageInstance.disconnect();
    storageInstance = null;
    initError = null;
  }
}

/**
 * Check if storage is ready
 */
export function isStorageReady(): boolean {
  return storageInstance !== null;
}

/**
 * Get storage status
 */
export async function getStorageStatus(): Promise<{
  ready: boolean;
  type: string;
  healthy: boolean;
  error?: string;
}> {
  const config = getStorageConfig();
  
  if (!storageInstance) {
    return {
      ready: false,
      type: config.type,
      healthy: false,
      error: 'Storage not initialized',
    };
  }

  try {
    const healthy = await storageInstance.healthCheck();
    return {
      ready: true,
      type: config.type,
      healthy,
    };
  } catch (error) {
    return {
      ready: true,
      type: config.type,
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Seed demo data for in-memory storage
 */
async function seedDemoData(storage: IStorageAdapter): Promise<void> {
  try {
    // Check if data already exists
    const existingNodes = await storage.listNodes(1, 1);
    if (existingNodes.total > 0) {
      console.log('[UAILS] Demo data already seeded, skipping...');
      return;
    }

    console.log('[UAILS] Seeding demo data...');
    
    // Demo nodes
    const demoNodes = [
      {
        id: 'node_gradient_descent',
        type: 'concept' as const,
        name: 'Gradient Descent',
        description: 'Optimization algorithm that iteratively moves towards the steepest descent to minimize loss function',
        level: { abstraction: 0.7, difficulty: 0.6, volatility: 0.2 },
        cognitive_state: { strength: 0.95, activation: 0.8, decay_rate: 0.005, confidence: 0.98 },
        temporal: { introduced_at: new Date('1950-01-01'), last_reinforced_at: new Date(), peak_relevance_at: new Date() },
        real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.85, interview_frequency: 0.9 },
        grounding: { source_refs: ['Cauchy1847', 'Rumelhart1986'], implementation_refs: [] },
        failure_surface: { common_bugs: [], misconceptions: ['thinking smaller lr is always better'] },
        canonical_name: 'Gradient Descent',
        first_appearance_year: 1950,
        domain: 'Optimization',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'node_backpropagation',
        type: 'concept' as const,
        name: 'Backpropagation',
        description: 'Algorithm for computing gradients by propagating errors backward through a neural network',
        level: { abstraction: 0.75, difficulty: 0.7, volatility: 0.1 },
        cognitive_state: { strength: 0.93, activation: 0.85, decay_rate: 0.005, confidence: 0.97 },
        temporal: { introduced_at: new Date('1986-01-01'), last_reinforced_at: new Date(), peak_relevance_at: new Date() },
        real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.9, interview_frequency: 0.95 },
        grounding: { source_refs: ['Rumelhart1986'], implementation_refs: [] },
        failure_surface: { common_bugs: ['vanishing gradients'], misconceptions: [] },
        canonical_name: 'Backpropagation',
        first_appearance_year: 1986,
        domain: 'Deep Learning',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'node_neural_network',
        type: 'concept' as const,
        name: 'Neural Network',
        description: 'Computational model inspired by biological neural networks',
        level: { abstraction: 0.8, difficulty: 0.7, volatility: 0.15 },
        cognitive_state: { strength: 0.96, activation: 0.9, decay_rate: 0.004, confidence: 0.99 },
        temporal: { introduced_at: new Date('1943-01-01'), last_reinforced_at: new Date(), peak_relevance_at: new Date() },
        real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.95, interview_frequency: 0.98 },
        grounding: { source_refs: ['McCulloch1943'], implementation_refs: [] },
        failure_surface: { common_bugs: ['overfitting'], misconceptions: [] },
        canonical_name: 'Neural Network',
        first_appearance_year: 1943,
        domain: 'Deep Learning',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Create nodes
    for (const node of demoNodes) {
      await storage.createNode(node);
    }

    // Create edges
    const edges = [
      {
        id: 'edge_backprop_gradient',
        from_node: 'node_backpropagation',
        to_node: 'node_gradient_descent',
        relation: 'depends_on',
        weight: { strength: 0.8, decay_rate: 0.01, reinforcement_rate: 0.05 },
        dynamics: { inhibitory: false, directional: true },
        temporal: { created_at: new Date(), last_used_at: new Date() },
        confidence: 0.85,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'edge_backprop_nn',
        from_node: 'node_backpropagation',
        to_node: 'node_neural_network',
        relation: 'improves',
        weight: { strength: 0.9, decay_rate: 0.01, reinforcement_rate: 0.05 },
        dynamics: { inhibitory: false, directional: true },
        temporal: { created_at: new Date(), last_used_at: new Date() },
        confidence: 0.9,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const edge of edges) {
      await storage.createEdge(edge);
    }

    console.log('[UAILS] Demo data seeded successfully');
  } catch (error) {
    console.error('[UAILS] Failed to seed demo data:', error);
  }
}
