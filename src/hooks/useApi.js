import { useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbwMOAbUnRDCjhwPL-Uu3ziFZFPNyQMx67gZcTNNSF7A5Krpj6-W3F9BSNuyZs1u9NFG/exec';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiGet = useCallback(async (action, params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(API_URL);
      url.searchParams.append('action', action);
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
      const response = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
      const data = await response.json();
      return data;
    } catch (err) {
      setError('Error de conexión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const apiPost = useCallback(async (action, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data })
      });
      const result = await response.json();
      return result;
    } catch (err) {
      setError('Error de conexión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { apiGet, apiPost, loading, error, setError, clearError };
};

export default useApi;
