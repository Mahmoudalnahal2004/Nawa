import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token dynamically
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const { supabase } = await import('./supabase');
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Fallback for legacy local JWT token
        const localToken = localStorage.getItem('access_token');
        if (localToken) {
          config.headers.Authorization = `Bearer ${localToken}`;
        }
      }
    } catch (err) {
      console.error('Error fetching session in api interceptor:', err);
    }
  }
  return config;
});

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/me') || error.config?.url?.includes('/auth/sync-profile');
    if (error.response?.status === 401 && !isAuthRoute) {
      // Clear storage and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
