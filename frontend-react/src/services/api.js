import { API_BASE_URL } from './config.js';
import { getToken } from './session.js';

async function parseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('Réponse non JSON reçue', error);
    return text;
  }
}

export async function safeFetch(path, { method = 'GET', body = null, headers = {} } = {}) {
  if (!path.startsWith('/')) {
    throw new Error('Les requêtes doivent utiliser un chemin relatif commençant par /.');
  }
  if (/^https?:\/\//i.test(path)) {
    throw new Error('Les URL absolues sont interdites dans safeFetch.');
  }
  const url = `${API_BASE_URL}${path}`;
  const fetchHeaders = new Headers(headers);
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    if (!fetchHeaders.has('Content-Type')) {
      fetchHeaders.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(body);
  }

  const token = getToken();
  if (token && !fetchHeaders.has('Authorization')) {
    fetchHeaders.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, { method, body, headers: fetchHeaders });
    const data = await parseBody(response);
    if (!response.ok) {
      const error = new Error((data && data.message) || 'Une erreur est survenue.');
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    console.info(`[API] ${method} ${path} -> ${response.status}`);
    return data;
  } catch (error) {
    console.warn(`[API] ${method} ${path} -> échec`, error);
    throw error;
  }
}
