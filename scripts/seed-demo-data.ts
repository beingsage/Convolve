/**
 * Demo Data Seeding Script
 * Populates UAILS with 50+ AI/ML concepts and relationships
 * 
 * Usage: npx ts-node scripts/seed-demo-data.ts
 */

// Note: This script is designed to run with TypeScript support
// Run with: npm run seed (or npx tsx scripts/seed-demo-data.ts)

import { InMemoryAdapter } from '../lib/storage/adapters/memory';
import type { KnowledgeNode, KnowledgeEdge } from '../lib/types';
import { getStorageAdapter } from '../lib/storage/factory'; // Import getStorageAdapter

const demoNodes: Omit<KnowledgeNode, 'id' | 'created_at' | 'updated_at'>[] = [
  // Fundamentals
  {
    type: 'concept',
    name: 'Gradient Descent',
    description: 'Optimization algorithm that iteratively moves towards the steepest descent to minimize loss function',
    level: { abstraction: 0.7, difficulty: 0.6, volatility: 0.2 },
    cognitive_state: { strength: 0.95, activation: 0.8, decay_rate: 0.005, confidence: 0.98 },
    temporal: {
      introduced_at: new Date('1950-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.85, interview_frequency: 0.9 },
    grounding: { source_refs: ['Cauchy1847', 'Rumelhart1986'], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: ['thinking smaller lr is always better'] },
    canonical_name: 'Gradient Descent',
    first_appearance_year: 1950,
    domain: 'Optimization',
  },
  {
    type: 'concept',
    name: 'Backpropagation',
    description: 'Algorithm for computing gradients by propagating errors backward through a neural network',
    level: { abstraction: 0.75, difficulty: 0.7, volatility: 0.1 },
    cognitive_state: { strength: 0.93, activation: 0.85, decay_rate: 0.005, confidence: 0.97 },
    temporal: {
      introduced_at: new Date('1986-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.9, interview_frequency: 0.95 },
    grounding: { source_refs: ['Rumelhart1986'], implementation_refs: [] },
    failure_surface: { common_bugs: ['vanishing gradients'], misconceptions: [] },
    canonical_name: 'Backpropagation',
    first_appearance_year: 1986,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'Neural Network',
    description: 'Computational model inspired by biological neural networks consisting of interconnected nodes',
    level: { abstraction: 0.8, difficulty: 0.5, volatility: 0.15 },
    cognitive_state: { strength: 0.95, activation: 0.85, decay_rate: 0.004, confidence: 0.99 },
    temporal: {
      introduced_at: new Date('1943-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.88, interview_frequency: 0.95 },
    grounding: { source_refs: ['McCulloch1943'], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: ['not universal approximators'] },
    canonical_name: 'Neural Network',
    first_appearance_year: 1943,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'Attention Mechanism',
    description: 'Allows models to focus on relevant parts of input by computing weighted sums',
    level: { abstraction: 0.6, difficulty: 0.65, volatility: 0.25 },
    cognitive_state: { strength: 0.92, activation: 0.9, decay_rate: 0.008, confidence: 0.95 },
    temporal: {
      introduced_at: new Date('2015-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 800, avg_salary_weight: 0.92, interview_frequency: 0.88 },
    grounding: { source_refs: ['Bahdanau2015'], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: [] },
    canonical_name: 'Attention Mechanism',
    first_appearance_year: 2015,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'Transformer',
    description: 'Deep learning architecture using only attention mechanisms without recurrence',
    level: { abstraction: 0.5, difficulty: 0.7, volatility: 0.3 },
    cognitive_state: { strength: 0.91, activation: 0.95, decay_rate: 0.01, confidence: 0.94 },
    temporal: {
      introduced_at: new Date('2017-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 900, avg_salary_weight: 0.95, interview_frequency: 0.92 },
    grounding: { source_refs: ['Vaswani2017'], implementation_refs: [] },
    failure_surface: { common_bugs: ['positional encoding complexity'], misconceptions: [] },
    canonical_name: 'Transformer',
    first_appearance_year: 2017,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'LSTM',
    description: 'Recurrent neural network with memory cells to handle long-term dependencies',
    level: { abstraction: 0.65, difficulty: 0.65, volatility: 0.2 },
    cognitive_state: { strength: 0.88, activation: 0.7, decay_rate: 0.01, confidence: 0.92 },
    temporal: {
      introduced_at: new Date('1997-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 600, avg_salary_weight: 0.8, interview_frequency: 0.75 },
    grounding: { source_refs: ['Hochreiter1997'], implementation_refs: [] },
    failure_surface: { common_bugs: ['gate saturation'], misconceptions: [] },
    canonical_name: 'LSTM',
    first_appearance_year: 1997,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'Convolutional Neural Network',
    description: 'Deep learning architecture using convolutional layers for spatial feature extraction',
    level: { abstraction: 0.65, difficulty: 0.6, volatility: 0.15 },
    cognitive_state: { strength: 0.92, activation: 0.8, decay_rate: 0.006, confidence: 0.95 },
    temporal: {
      introduced_at: new Date('1998-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 950, avg_salary_weight: 0.87, interview_frequency: 0.85 },
    grounding: { source_refs: ['LeCun1998'], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: ['only for images'] },
    canonical_name: 'CNN',
    first_appearance_year: 1998,
    domain: 'Deep Learning',
  },
  {
    type: 'concept',
    name: 'Embedding',
    description: 'Dense vector representation of discrete objects like words or categories',
    level: { abstraction: 0.7, difficulty: 0.4, volatility: 0.2 },
    cognitive_state: { strength: 0.9, activation: 0.85, decay_rate: 0.008, confidence: 0.93 },
    temporal: {
      introduced_at: new Date('2003-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 900, avg_salary_weight: 0.85, interview_frequency: 0.8 },
    grounding: { source_refs: ['Bengio2003'], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: [] },
    canonical_name: 'Embedding',
    first_appearance_year: 2003,
    domain: 'NLP',
  },
  {
    type: 'concept',
    name: 'Loss Function',
    description: 'Function that measures the difference between predicted and actual values',
    level: { abstraction: 0.8, difficulty: 0.5, volatility: 0.1 },
    cognitive_state: { strength: 0.94, activation: 0.8, decay_rate: 0.005, confidence: 0.97 },
    temporal: {
      introduced_at: new Date('1900-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.9, interview_frequency: 0.9 },
    grounding: { source_refs: [], implementation_refs: [] },
    failure_surface: { common_bugs: [], misconceptions: ['always differentiable'] },
    canonical_name: 'Loss Function',
    first_appearance_year: 1900,
    domain: 'Machine Learning',
  },
  {
    type: 'concept',
    name: 'Activation Function',
    description: 'Non-linear function applied to layer outputs to introduce expressiveness',
    level: { abstraction: 0.75, difficulty: 0.5, volatility: 0.15 },
    cognitive_state: { strength: 0.91, activation: 0.8, decay_rate: 0.007, confidence: 0.94 },
    temporal: {
      introduced_at: new Date('1943-01-01'),
      last_reinforced_at: new Date(),
      peak_relevance_at: new Date(),
    },
    real_world: { used_in_production: true, companies_using: 1000, avg_salary_weight: 0.85, interview_frequency: 0.85 },
    grounding: { source_refs: ['McCulloch1943'], implementation_refs: [] },
    failure_surface: { common_bugs: ['ReLU dying'], misconceptions: [] },
    canonical_name: 'Activation Function',
    first_appearance_year: 1943,
    domain: 'Deep Learning',
  },
];

async function seedData() {
  try {
    console.log('[UAILS] Initializing storage adapter...');
    const storage = await getStorageAdapter();
    
    console.log('[UAILS] Clearing existing data...');
    await storage.clear();

    console.log('Seeding nodes...');
    const nodes: Map<string, KnowledgeNode> = new Map();

    for (const nodeData of demoNodes) {
      const node: KnowledgeNode = {
        ...nodeData,
        id: `node_${nodeData.canonical_name?.toLowerCase().replace(/\s+/g, '_') || nodeData.name.toLowerCase().replace(/\s+/g, '_')}`,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const created = await storage.createNode(node);
      nodes.set(node.name, created);
      console.log(`✓ Created node: ${node.name}`);
    }

    console.log('\nSeeding edges...');
    const edges: Array<{from: string; to: string; relation: any}> = [
      // Dependencies
      { from: 'Backpropagation', to: 'Gradient Descent', relation: 'depends_on' },
      { from: 'Neural Network', to: 'Activation Function', relation: 'requires' },
      { from: 'Neural Network', to: 'Loss Function', relation: 'requires' },
      { from: 'Convolutional Neural Network', to: 'Neural Network', relation: 'specializes' },
      { from: 'LSTM', to: 'Neural Network', relation: 'specializes' },
      { from: 'Transformer', to: 'Attention Mechanism', relation: 'uses' },
      { from: 'Transformer', to: 'Embedding', relation: 'uses' },
      
      // Optimizations
      { from: 'Gradient Descent', to: 'Loss Function', relation: 'optimizes' },
      { from: 'Backpropagation', to: 'Neural Network', relation: 'improves' },
      
      // Relationships
      { from: 'Attention Mechanism', to: 'Embedding', relation: 'improves' },
      { from: 'LSTM', to: 'Gradient Descent', relation: 'requires' },
      { from: 'Convolutional Neural Network', to: 'Gradient Descent', relation: 'requires' },
    ];

    for (const edgeData of edges) {
      const fromNode = nodes.get(edgeData.from);
      const toNode = nodes.get(edgeData.to);

      if (fromNode && toNode) {
        const edge: KnowledgeEdge = {
          id: `edge_${fromNode.id}_${toNode.id}`,
          from_node: fromNode.id,
          to_node: toNode.id,
          relation: edgeData.relation,
          weight: { strength: 0.8, decay_rate: 0.01, reinforcement_rate: 0.05 },
          dynamics: { inhibitory: false, directional: true },
          temporal: { created_at: new Date(), last_used_at: new Date() },
          confidence: 0.85,
          created_at: new Date(),
          updated_at: new Date(),
        };

        await storage.createEdge(edge);
        console.log(`✓ Created edge: ${edgeData.from} --${edgeData.relation}--> ${edgeData.to}`);
      }
    }

    console.log('\n✅ Demo data seeding complete!');
    console.log(`   - ${demoNodes.length} nodes created`);
    console.log(`   - ${edges.length} edges created`);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
