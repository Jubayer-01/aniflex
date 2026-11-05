import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Automatically inject JWT bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aniflex_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 unauthorized (auto-logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if invalid or expired
      localStorage.removeItem('aniflex_token');
      localStorage.removeItem('aniflex_user');
    }
    return Promise.reject(error);
  }
);

// Auth Service Endpoints
export const authAPI = {
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  getMe: () =>
    api.get('/auth/me'),
  updateProfile: (data) =>
    api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Watchlist Service Endpoints
export const watchlistAPI = {
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (animeId, status = 'watching') => api.post('/watchlist', { animeId, status }),
  removeFromWatchlist: (animeId) => api.delete(`/watchlist/${animeId}`),
};

// History Service Endpoints
export const historyAPI = {
  getHistory: () => api.get('/history'),
  saveProgress: (episodeId, progressSeconds, durationSeconds, isCompleted) =>
    api.post('/history', { episodeId, progressSeconds, durationSeconds, isCompleted }),
};

export default api;

