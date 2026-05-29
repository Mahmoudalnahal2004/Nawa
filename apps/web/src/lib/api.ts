import axios from 'axios';

export const getApiUrl = () => {
  let envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || 
                        hostname === '127.0.0.1' || 
                        hostname.startsWith('192.168.') || 
                        hostname.startsWith('10.') || 
                        hostname.startsWith('172.');
    if (!isLocalhost) {
      if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://nawa-production-be9b.up.railway.app';
      }
      // Auto-enforce HTTPS on secure pages
      if (window.location.protocol === 'https:' && envUrl.startsWith('http:')) {
        envUrl = envUrl.replace('http:', 'https:');
      }
    }
  }
  return envUrl || 'http://localhost:8000';
};

export const API_BASE = getApiUrl();

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
