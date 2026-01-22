/**
 * Temporal Reasoning Engine
 * Enhancement #6: Understand how knowledge evolves over time
 * Temporal points, intervals, emergence tracking
 */

export interface TemporalPoint {
  timestamp: Date;
  event: string;
  confidence: number;
}

export interface TemporalInterval {
  start: Date;
  end: Date;
  type: 'validity_period' | 'dominance' | 'emergence';
}

export interface TemporalConcept {
  id: string;
  introduced_at: Date;
  evolved_at: TemporalPoint[];
  validity_period: TemporalInterval[];
  successor: string | null; // What replaced this concept
  predecessor: string | null; // What this concept replaced
}

export class TemporalReasoningEngine {
  private concepts: Map<string, TemporalConcept> = new Map();

  /**
   * Register concept emergence
   */
  registerConcept(id: string, introduced_at: Date): void {
    this.concepts.set(id, {
      id,
      introduced_at,
      evolved_at: [],
      validity_period: [],
      successor: null,
      predecessor: null,
    });
  }

  /**
   * Record evolution event (e.g., concept refinement)
   */
  recordEvolution(id: string, event: string, confidence: number = 0.9): void {
    const concept = this.concepts.get(id);
    if (!concept) return;

    concept.evolved_at.push({
      timestamp: new Date(),
      event,
      confidence,
    });
  }

  /**
   * Set validity period (when concept was relevant)
   */
  setValidityPeriod(id: string, start: Date, end: Date): void {
    const concept = this.concepts.get(id);
    if (!concept) return;

    concept.validity_period.push({
      start,
      end,
      type: 'validity_period',
    });
  }

  /**
   * Mark concept replacement
   */
  recordReplacement(oldId: string, newId: string): void {
    const oldConcept = this.concepts.get(oldId);
    const newConcept = this.concepts.get(newId);

    if (oldConcept) oldConcept.successor = newId;
    if (newConcept) newConcept.predecessor = oldId;
  }

  /**
   * Check if concept was relevant at time
   */
  isRelevantAt(id: string, time: Date): boolean {
    const concept = this.concepts.get(id);
    if (!concept) return false;

    // Must have existed at time
    if (time < concept.introduced_at) return false;

    // Check validity periods
    for (const period of concept.validity_period) {
      if (time >= period.start && time <= period.end) {
        return true;
      }
    }

    // No explicit period: relevant from introduction to now
    return true;
  }

  /**
   * Get timeline of concept evolution
   */
  getTimeline(id: string): Array<{ timestamp: Date; event: string }> {
    const concept = this.concepts.get(id);
    if (!concept) return [];

    const timeline: Array<{ timestamp: Date; event: string }> = [
      {
        timestamp: concept.introduced_at,
        event: 'Introduced',
      },
    ];

    timeline.push(
      ...concept.evolved_at.map((e) => ({
        timestamp: e.timestamp,
        event: e.event,
      }))
    );

    if (concept.successor) {
      timeline.push({
        timestamp: new Date(), // Approximate
        event: `Replaced by ${concept.successor}`,
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Trace what enabled a concept
   * "What enabled transformers?" → Sequence of concepts
   */
  traceEnablingPath(id: string, maxDepth: number = 10): string[] {
    const concept = this.concepts.get(id);
    if (!concept) return [];

    const path: string[] = [];
    let current = concept.predecessor;
    let depth = 0;

    while (current && depth < maxDepth) {
      path.unshift(current);
      const currentConcept = this.concepts.get(current);
      if (!currentConcept) break;

      current = currentConcept.predecessor;
      depth++;
    }

    path.push(id);
    return path;
  }

  /**
   * Find concepts that were active in time range
   */
  getConceptsActiveIn(start: Date, end: Date): string[] {
    const active: string[] = [];

    for (const [id, concept] of this.concepts.entries()) {
      // Concept must have been introduced by end date
      if (concept.introduced_at > end) continue;

      // Check if it overlaps with range
      let overlaps = false;

      if (concept.validity_period.length === 0) {
        // Always active from introduction onwards
        overlaps = true;
      } else {
        for (const period of concept.validity_period) {
          if (period.start <= end && period.end >= start) {
            overlaps = true;
            break;
          }
        }
      }

      if (overlaps) {
        active.push(id);
      }
    }

    return active;
  }

  /**
   * Identify concept emergence era
   * "When did X become important?"
   */
  getEmergenceDate(id: string): Date | null {
    const concept = this.concepts.get(id);
    if (!concept) return null;

    // First evolution event marks emergence (becomes important)
    if (concept.evolved_at.length > 0) {
      // Find first high-confidence evolution
      for (const event of concept.evolved_at) {
        if (event.confidence > 0.7) {
          return event.timestamp;
        }
      }
    }

    return concept.introduced_at;
  }

  /**
   * Get all temporal relationships
   */
  getTemporalGraph(): Record<string, any> {
    const relationships: Array<{
      from: string;
      to: string;
      type: 'predecessor' | 'successor' | 'contemporary';
    }> = [];

    for (const [id, concept] of this.concepts.entries()) {
      if (concept.predecessor) {
        relationships.push({
          from: concept.predecessor,
          to: id,
          type: 'predecessor',
        });
      }
    }

    return {
      concepts: this.concepts.size,
      relationships,
      timespan: this.getTimespanInfo(),
    };
  }

  private getTimespanInfo(): { earliest: Date; latest: Date } | null {
    const dates = Array.from(this.concepts.values()).map((c) => c.introduced_at);

    if (dates.length === 0) return null;

    return {
      earliest: new Date(Math.min(...dates.map((d) => d.getTime()))),
      latest: new Date(Math.max(...dates.map((d) => d.getTime()))),
    };
  }
}

// Singleton instance
let temporalReasoningInstance: TemporalReasoningEngine | null = null;

export function getTemporalReasoningEngine(): TemporalReasoningEngine {
  if (!temporalReasoningInstance) {
    temporalReasoningInstance = new TemporalReasoningEngine();
  }
  return temporalReasoningInstance;
}
