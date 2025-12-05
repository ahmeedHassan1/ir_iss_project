'use client';

import { useState } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Loader2, FileText, TrendingUp } from 'lucide-react';
import { searchQuery } from '../../lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exampleQueries = [
    { text: 'fools fear in', type: 'Phrase Query' },
    { text: 'fools AND fear', type: 'Boolean AND' },
    { text: 'angels AND NOT fear', type: 'Boolean AND NOT' },
  ];

  const handleSearch = async (queryText = query) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await searchQuery(queryText);
      setResults(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery) => {
    setQuery(exampleQuery);
    handleSearch(exampleQuery);
  };

  const highlightTerms = (text, terms) => {
    if (!terms || terms.length === 0) return text;

    let highlightedText = text;
    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    });

    return highlightedText;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Search Documents</h1>
            <p className="text-lg text-gray-600">
              Use phrase queries and boolean operators to find relevant documents
            </p>
          </motion.div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="relative mb-6">
              <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder='Enter query (e.g., "fools fear in" or "fools AND fear")'
                className="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </button>

            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">Example queries:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQueries.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example.text)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                  >
                    <span className="font-mono">{example.text}</span>
                    <span className="ml-2 text-xs text-gray-500">({example.type})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">Supported operators:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono mr-2">
                    AND
                  </span>
                  <span className="text-blue-800">Both terms must be present</span>
                </div>
                <div className="flex items-center">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono mr-2">
                    AND NOT
                  </span>
                  <span className="text-blue-800">First term but not second</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {results.resultCount} result{results.resultCount !== 1 ? 's' : ''} found
                </h2>
                <p className="text-sm text-gray-600">
                  Query: <span className="font-mono">{results.query}</span>
                </p>
              </div>

              {results.results.length > 0 ? (
                <div className="space-y-4">
                  {results.results.map((result, index) => (
                    <motion.div
                      key={result.doc_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {result.doc_id}: {result.filename}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {result.word_count} words
                          </p>
                        </div>
                        <div className="flex items-center bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-2 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                          <span className="text-lg font-bold text-indigo-600">
                            {(result.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div
                        className="text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: highlightTerms(result.snippet, result.matched_terms),
                        }}
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.matched_terms.map((term, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">
                    Try a different query or check your spelling
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
