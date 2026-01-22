import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">UAILS</h1>
              <p className="text-sm text-slate-600">
                Unified Artificial Intelligence Language System
              </p>
            </div>
            <nav className="space-x-4">
              <Link
                href="/query"
                className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Query
              </Link>
              <Link
                href="/graph"
                className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Graph
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Feature Cards */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-slate-900">Semantic Query</h2>
            <p className="mt-2 text-slate-600">
              Ask natural language questions about AI concepts and get intelligent,
              contextualized answers.
            </p>
            <Link
              href="/query"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium"
            >
              Try it →
            </Link>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-slate-900">Knowledge Graph</h2>
            <p className="mt-2 text-slate-600">
              Visualize relationships between concepts, explore dependencies, and understand
              multi-hop reasoning paths.
            </p>
            <Link
              href="/graph"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium"
            >
              Explore →
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 rounded-lg bg-white p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">System Status</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">50+</div>
              <div className="text-sm text-slate-600">Core Concepts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">100+</div>
              <div className="text-sm text-slate-600">Relationships</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-sm text-slate-600">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">Live</div>
              <div className="text-sm text-slate-600">Neo4j + Qdrant</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-600">
        <p>UAILS - Built with TypeScript, Next.js, Neo4j, and Qdrant</p>
      </footer>
    </main>
  );
}
