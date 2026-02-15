/**
 * Procedural Knowledge Generator
 * Algorithmically generates large-scale knowledge graphs
 */

import type { KnowledgeNode } from '../types';

export class ProceduralKnowledgeGenerator {
  private domainVocabulary: Record<string, string[]> = {
    'Fundamentals': [
      'Linear Algebra', 'Calculus', 'Probability', 'Statistics',
      'Information Theory', 'Graph Theory', 'Optimization', 'Logic'
    ],
    'Neural Networks': [
      'Perceptron', 'MLP', 'CNN', 'RNN', 'LSTM', 'GRU', 'Attention',
      'Transformer', 'Vision Transformer', 'Graph Neural Network'
    ],
    'NLP & LLMs': [
      'Tokenization', 'Embedding', 'Word2Vec', 'GloVe', 'BERT',
      'GPT', 'T5', 'Language Model', 'Sequence-to-Sequence', 'Machine Translation'
    ],
    'Computer Vision': [
      'Image Classification', 'Object Detection', 'Semantic Segmentation',
      'Instance Segmentation', 'Face Recognition', 'Pose Estimation', 'Optical Flow'
    ],
    'Reinforcement Learning': [
      'Q-Learning', 'Policy Gradient', 'Actor-Critic', 'DQN', 'PPO',
      'A3C', 'Model-Based RL', 'Exploration-Exploitation', 'Reward Shaping'
    ],
    'Generative Models': [
      'GAN', 'VAE', 'Autoencoder', 'Diffusion Model', 'Flow-based',
      'Energy-based', 'Latent Variable Model', 'Denoising'
    ],
    'Optimization': [
      'SGD', 'Adam', 'RMSprop', 'Momentum', 'Learning Rate Scheduling',
      'Gradient Clipping', 'Weight Decay', 'Batch Normalization'
    ],
    'Probabilistic Methods': [
      'Bayesian Networks', 'Hidden Markov Model', 'Gaussian Process',
      'Mixture Model', 'Variational Inference', 'Markov Chain Monte Carlo'
    ],
    'Graph Learning': [
      'Graph Convolutional Network', 'GraphSAGE', 'Graph Attention',
      'Message Passing', 'Node Embedding', 'Knowledge Graph Embedding'
    ],
    'Time Series': [
      'ARIMA', 'Exponential Smoothing', 'LSTM for Sequences', 'Temporal CNN',
      'Attention for Time Series', 'Transformer for Time Series', 'Forecasting'
    ]
  };

  /**
   * Generate 100K+ nodes across domains
   */
  generateLargeScale(config: {
    nodeCount: number;
    domains: string[];
    edgesPerNode: number;
  }): KnowledgeNode[] {
    const nodes: KnowledgeNode[] = [];
    const timestamp = new Date();

    for (let i = 0; i < config.nodeCount; i++) {
      const domain = config.domains[i % config.domains.length];
      const conceptIndex = Math.floor(i / config.domains.length);
      const abstraction = (conceptIndex % 100) / 100;

      nodes.push(this.generateNode(
        i,
        domain,
        abstraction,
        timestamp
      ));

      if ((i + 1) % 10000 === 0) {
        console.log(`Generated ${i + 1}/${config.nodeCount} nodes...`);
      }
    }

    return nodes;
  }

  /**
   * Generate single concept node
   */
  private generateNode(
    index: number,
    domain: string,
    abstraction: number,
    timestamp: Date
  ): KnowledgeNode {
    const vocabulary = this.domainVocabulary[domain] || ['Unknown Concept'];
    const conceptName = vocabulary[index % vocabulary.length];
    const variant = Math.floor(index / vocabulary.length);

    const nodeId = `node_${domain.toLowerCase().replace(/\s/g, '_')}_${variant}`;
    const difficulty = 0.2 + (abstraction * 0.6) + (Math.random() * 0.2);
    const strength = 0.7 + Math.random() * 0.25;

    return {
      id: nodeId,
      type: this.selectType(abstraction),
      name: variant > 0 ? `${conceptName} (variant ${variant})` : conceptName,
      description: this.generateDescription(conceptName, domain, abstraction),
      level: {
        abstraction: Math.min(abstraction, 1),
        difficulty: Math.min(difficulty, 1),
        volatility: 0.1 + Math.random() * 0.3
      },
      cognitive_state: {
        strength: strength,
        activation: Math.random() * 0.8 + 0.2,
        decay_rate: 0.003 + Math.random() * 0.007,
        confidence: strength * 0.95
      },
      temporal: {
        introduced_at: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1),
        last_reinforced_at: new Date(),
        peak_relevance_at: new Date()
      },
      real_world: {
        used_in_production: Math.random() > 0.3,
        companies_using: Math.floor(Math.random() * 1000) + 100,
        avg_salary_weight: Math.random() * 0.5 + 0.5,
        interview_frequency: Math.random()
      },
      grounding: {
        source_refs: [this.generateSourceRef(domain, variant)],
        implementation_refs: []
      },
      failure_surface: {
        common_bugs: this.generateCommonBugs(conceptName),
        misconceptions: this.generateMisconceptions(conceptName)
      },
      canonical_name: conceptName,
      first_appearance_year: 1950 + Math.floor(Math.random() * 75),
      domain: domain,
      created_at: timestamp,
      updated_at: timestamp
    };
  }

  private selectType(abstraction: number): string {
    if (abstraction < 0.3) return 'concept';
    if (abstraction < 0.6) return 'technique';
    if (abstraction < 0.8) return 'architecture';
    return 'framework';
  }

  private generateDescription(
    name: string,
    domain: string,
    abstraction: number
  ): string {
    const descriptions = [
      `${name} is a fundamental technique in ${domain} used for...`,
      `${name} provides a method for solving problems in ${domain} by...`,
      `This ${domain} approach, ${name}, enables...`,
      `${name} is an advanced concept that builds upon foundations in ${domain}...`,
      `In the context of ${domain}, ${name} represents an approach to...`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private generateSourceRef(domain: string, variant: number): string {
    const years = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
    const year = years[Math.floor(Math.random() * years.length)];
    const authors = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    const author = authors[Math.floor(Math.random() * authors.length)];
    return `${author}${year}`;
  }

  private generateCommonBugs(conceptName: string): string[] {
    const bugs = [
      `Incorrect initialization of ${conceptName}`,
      `Off-by-one error in ${conceptName} implementation`,
      `Gradient explosion in ${conceptName} training`,
      `Memory leak in ${conceptName} computation`
    ];
    return bugs.slice(0, Math.floor(Math.random() * 2) + 1);
  }

  private generateMisconceptions(conceptName: string): string[] {
    const misconceptions = [
      `${conceptName} is only for supervised learning`,
      `${conceptName} always requires large datasets`,
      `${conceptName} is a black box`,
      `${conceptName} is deprecated`
    ];
    return misconceptions.slice(0, Math.floor(Math.random() * 2) + 1);
  }
}
