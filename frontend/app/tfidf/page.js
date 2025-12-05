'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import { motion } from 'framer-motion';
import { Loader2, Download } from 'lucide-react';
import { getTermFrequency, getIDF, getTFIDFMatrix, getNormalizedTFIDF } from '../../lib/api';

export default function TFIDFPage() {
  const [activeTab, setActiveTab] = useState('tf');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'tf', label: 'Term Frequency', api: getTermFrequency },
    { id: 'idf', label: 'IDF Values', api: getIDF },
    { id: 'tfidf', label: 'TF-IDF Matrix', api: getTFIDFMatrix },
    { id: 'normalized', label: 'Normalized TF-IDF', api: getNormalizedTFIDF },
  ];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentTab = tabs.find((t) => t.id === activeTab);
      const response = await currentTab.api();
      setData(response.data.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    let csvContent = '';

    if (activeTab === 'idf' && data.idf) {
      csvContent = 'Term,IDF\n';
      Object.entries(data.idf).forEach(([term, value]) => {
        csvContent += `${term},${value}\n`;
      });
    } else if (data.matrix && data.documents && data.terms) {
      csvContent = 'Term,' + data.documents.join(',') + '\n';
      data.terms.forEach((term) => {
        const row = [term];
        data.documents.forEach((doc) => {
          row.push(data.matrix[term][doc] || 0);
        });
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_data.csv`;
    a.click();
  };

  const renderMatrix = () => {
    if (!data || !data.matrix || !data.documents || !data.terms) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                Term
              </th>
              {data.documents.map((doc) => (
                <th
                  key={doc}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                >
                  {doc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.terms.map((term, idx) => (
              <tr key={term} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                  {term}
                </td>
                {data.documents.map((doc) => {
                  const value = data.matrix[term][doc] || 0;
                  const intensity = Math.min(value * 100, 100);
                  return (
                    <td
                      key={doc}
                      className="px-4 py-3 text-center whitespace-nowrap"
                      style={{
                        backgroundColor: value > 0 ? `rgba(79, 70, 229, ${intensity / 200})` : 'transparent',
                      }}
                      title={value.toFixed(4)}
                    >
                      {value.toFixed(4)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderIDF = () => {
    if (!data || !data.idf) return null;

    const sortedEntries = Object.entries(data.idf).sort(([, a], [, b]) => b - a);

    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {sortedEntries.map(([term, value]) => (
            <div
              key={term}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-900">{term}</span>
              <div className="flex items-center">
                <div
                  className="h-2 bg-indigo-600 rounded mr-3"
                  style={{ width: `${value * 100}px` }}
                />
                <span className="text-sm text-gray-600 font-mono">{value.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
        {data.totalDocuments && (
          <p className="text-sm text-gray-600 mt-4">
            Total Documents: {data.totalDocuments}
          </p>
        )}
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">TF-IDF Analysis</h1>
            <p className="text-lg text-gray-600">
              View term frequency, IDF values, and TF-IDF matrices
            </p>
          </motion.div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <button
                  onClick={exportToCSV}
                  disabled={!data}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
              ) : activeTab === 'idf' ? (
                renderIDF()
              ) : (
                <div className="max-h-[600px] overflow-auto">{renderMatrix()}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
