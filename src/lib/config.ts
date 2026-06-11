/** ISP Backend API manzili (VITE_API_URL orqali o'zgartiriladi) */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://159.65.234.115:8012'
).replace(/\/$/, '');
