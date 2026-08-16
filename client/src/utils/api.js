import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Request: attach the bearer token to every outgoing call.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: a 401 means the token is gone, invalid, or expired. Clear the
// stored session and send the user to login - except when they are already
// on an auth page, where a 401 just means "wrong password" and redirecting
// would blow away the error message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthPage = ['/login', '/signup'].includes(window.location.pathname);

    if (error.response?.status === 401 && !isAuthPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

/** Pulls the server's message out of an Axios error, with sane fallbacks. */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running on port 5000?';
  return error?.message || fallback;
};

export default api;
