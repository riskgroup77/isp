/** ISP Backend API manzili (VITE_API_URL orqali o'zgartiriladi) */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
).replace(/\/$/, '');
