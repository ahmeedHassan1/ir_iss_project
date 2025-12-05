'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { motion } from 'framer-motion';
import { Database, Loader2, AlertCircle, CheckCircle, Search as SearchIcon } from 'lucide-react';
import { buildIndex, getIndex, getIndexStats } from '../../lib/api';

export default function IndexPage() {
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(null);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadIndex();
    loadStats();
  }, []);

  const loadIndex = async () => {
    try {
      const response = await getIndex();
      setIndex(response.data.data.index);
    } catch (error) {
      console.error('Error loading index:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await getIndexStats();
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleBuildIndex = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await buildIndex();
      setMessage({ type: 'success', text: 'Index built successfully!' });
      loadIndex();
      loadStats();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to build index',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredIndex = index
    ? Object.entries(index).filter(([term]) =>
        term.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Positional Index</h1>
            <p className="text-lg text-gray-600">
              Build and view the positional index using Apache Spark
            </p>
          </motion.div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg flex items-start ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              )}
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {message.text}
              </p>
            </motion.div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <button
              onClick={handleBuildIndex}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-6 w-6 mr-2" />
                  Building index with Spark...
                </>
              ) : (
                <>
                  <Database className="w-6 h-6 mr-2" />
                  Build Index
                </>
              )}
            </button>
          </div>

          {stats && (
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Terms', value: stats.totalTerms },
                { label: 'Total Documents', value: stats.totalDocuments },
                { label: 'Total Entries', value: stats.totalEntries },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-indigo-600">{stat.value}</p>
                </motion.div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Index Entries</h2>
              </div>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search terms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 max-h-[600px] overflow-y-auto">
              {filteredIndex.length > 0 ? (
                <div className="space-y-3">
                  {filteredIndex.map(([term, docs]) => {
                    const docCount = Object.keys(docs).length;
                    return (
                      <div
                        key={term}
                        className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-mono text-lg font-semibold text-indigo-600">
                            {term}
                          </h3>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {docCount} doc{docCount > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="font-mono text-sm text-gray-700">
                          &lt; {term}{' '}
                          {Object.entries(docs).map(([docId, positions], idx) => (
                            <span key={docId}>
                              <span className="text-blue-600">{docId}</span>:{' '}
                              <span className="text-gray-600">
                                {positions.join(', ')}
                              </span>
                              {idx < Object.entries(docs).length - 1 && ' ; '}
                            </span>
                          ))}{' '}
                          &gt;
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : index ? (
                <div className="text-center py-12">
                  <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No terms match your search</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No index built yet. Click "Build Index" to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
