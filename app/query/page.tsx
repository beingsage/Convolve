'use client';

import React from "react"

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function QueryPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { data, isLoading, error } = useSWR(
    submitted && query ? `/api/query?q=${encodeURIComponent(query)}` : null,
    fetcher
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setQuery('');
    setSubmitted(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-slate-900">
              UAILS
            </Link>
            <nav className="space-x-4">
              <Link href="/query" className="text-blue-600 font-medium">
                Query
              </Link>
              <Link href="/graph" className="text-slate-600 hover:text-slate-900">
                Graph
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Search Box */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Semantic Query</h1>
            <p className="text-slate-600 mb-6">
              Ask about AI concepts with vector-powered search using Qdrant
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g., 'What is backpropagation?' or 'How do transformers work?'"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>

              {submitted && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Clear search
                </button>
              )}
            </form>
          </div>

          {/* Results */}
          {isLoading && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
              <p className="mt-4 text-slate-600">Searching knowledge graph...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6">
              <p className="font-medium text-red-900">Error searching</p>
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          )}

          {data?.success && data?.results && (
            <div className="space-y-6">
              <div className="text-sm text-slate-600">
                Found {data.results.length} concept(s)
              </div>

              {data.results.map((result: any) => (
                <div
                  key={result.node.id}
                  className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-slate-900">{result.node.name}</h3>
                    <div className="flex gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {result.node.type}
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {(result.relevance_score * 100).toFixed(0)}% match
                      </span>
                    </div>
                  </div>

                  <p className="mb-4 text-slate-700">{result.node.description}</p>

                  <div className="grid gap-3 mb-4 md:grid-cols-3 text-sm">
                    <div>
                      <div className="text-slate-600">Difficulty</div>
                      <div className="font-medium text-slate-900">
                        {(result.node.level.difficulty * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Confidence</div>
                      <div className="font-medium text-slate-900">
                        {(result.node.cognitive_state.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Volatility</div>
                      <div className="font-medium text-slate-900">
                        {(result.node.level.volatility * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {result.node.grounding?.source_refs?.length > 0 && (
                    <div className="text-xs text-slate-600 mb-4">
                      Sources: {result.node.grounding.source_refs.length}
                    </div>
                  )}

                  {result.explanation && (
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                        View explanation
                      </summary>
                      <pre className="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
                        {result.explanation}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {submitted && !isLoading && (!data?.success || data?.results?.length === 0) && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">No concepts found for "{query}"</p>
              <p className="mt-2 text-sm text-slate-500">
                Try searching for: "gradient descent", "backpropagation", "transformer", "neural network"
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
