import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // needed for httpOnly refresh token cookie
  headers: { 'Content-Type': 'application/json' },
});

export default api;
