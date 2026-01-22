'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GraphPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [operation, setOperation] = useState<string>('explain');
  const { data: nodes } = useSWR('/api/nodes?limit=50', fetcher);
  const { data: reasoning, isLoading: reasoningLoading } = useSWR(
    selectedNodeId && operation
      ? `/api/graph/reasoning?op=${operation}&node=${selectedNodeId}`
      : null,
    fetcher
  );
  const { data: contradictions } = useSWR('/api/analysis/contradictions', fetcher);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-slate-900">
              UAILS
            </Link>
            <nav className="space-x-4">
              <Link href="/query" className="text-slate-600 hover:text-slate-900">
                Query
              </Link>
              <Link href="/graph" className="text-blue-600 font-medium">
                Graph
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Knowledge Graph Explorer</h1>
        <p className="text-slate-600 mb-8">Explore relationships between concepts powered by Neo4j</p>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Node List */}
          <div className="md:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Concepts ({nodes?.data?.total || 0})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {nodes?.data?.items?.slice(0, 20).map((node: any) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedNodeId === node.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Graph Visualization & Reasoning */}
          <div className="md:col-span-2 space-y-4">
            {selectedNodeId && (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex gap-2 mb-4 flex-wrap">
                  {['explain', 'dependencies', 'curriculum'].map((op) => (
                    <button
                      key={op}
                      onClick={() => setOperation(op)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        operation === op
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </button>
                  ))}
                </div>

                {reasoningLoading && (
                  <div className="text-center py-4">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                  </div>
                )}

                {reasoning?.success && (
                  <div className="bg-slate-50 rounded p-4 overflow-auto max-h-80">
                    {reasoning.explanation && (
                      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
                        {reasoning.explanation}
                      </pre>
                    )}
                    {reasoning.prerequisites && (
                      <div className="space-y-2">
                        <p className="font-medium text-slate-900">Prerequisites:</p>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {reasoning.prerequisites.map((p: any) => (
                            <li key={p.id} className="flex justify-between">
                              <span>{p.name}</span>
                              <span className="text-xs text-slate-500">
                                {(p.difficulty * 100).toFixed(0)}% difficulty
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-8 h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🔗</div>
                <p className="text-slate-600 mb-2">Interactive graph visualization</p>
                <p className="text-sm text-slate-500">
                  {selectedNodeId ? 'Reasoning powered by multi-hop engine' : 'Select a concept to explore'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Graph Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Nodes</span>
                <span className="text-2xl font-bold text-blue-600">{nodes?.data?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Relationships</span>
                <span className="text-2xl font-bold text-blue-600">100+</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Max Depth</span>
                <span className="text-2xl font-bold text-blue-600">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Avg Confidence</span>
                <span className="text-2xl font-bold text-blue-600">0.85</span>
              </div>
            </div>
          </div>

          {contradictions?.success && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Contradictions ({contradictions.summary.total_contradictions})
              </h3>
              <div className="space-y-3">
                {contradictions.summary.total_contradictions === 0 ? (
                  <p className="text-sm text-slate-600">No contradictions detected</p>
                ) : (
                  <>
                    {contradictions.failure_modes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">
                          Failure Modes: {contradictions.failure_modes.length}
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {contradictions.failure_modes.slice(0, 3).map((c: any) => (
                            <li key={c.id}>{c.nodeA.name} → {c.nodeB.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {contradictions.competing_approaches.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-600 mb-2">
                          Competing: {contradictions.competing_approaches.length}
                        </p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {contradictions.competing_approaches.slice(0, 3).map((c: any) => (
                            <li key={c.id}>{c.nodeA.name} ⚔ {c.nodeB.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
