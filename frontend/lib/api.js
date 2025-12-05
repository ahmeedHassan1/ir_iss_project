import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getCurrentUser = () => api.get('/auth/me');

// Documents
export const uploadDocuments = (formData) => 
  api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
export const getDocuments = () => api.get('/documents');
export const getDocument = (id) => api.get(`/documents/${id}`);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Indexing
export const buildIndex = () => api.post('/index/build');
export const getIndex = () => api.get('/index');
export const getIndexStats = () => api.get('/index/stats');
export const getSparkStatus = () => api.get('/index/status');

// TF-IDF & Search
export const getTermFrequency = () => api.get('/search/tf');
export const getIDF = () => api.get('/search/idf');
export const getTFIDFMatrix = () => api.get('/search/tfidf');
export const getNormalizedTFIDF = () => api.get('/search/normalized');
export const searchQuery = (query) => api.post('/search/query', { query });

export default api;
