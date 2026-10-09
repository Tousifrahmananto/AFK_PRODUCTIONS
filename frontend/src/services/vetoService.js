import { API_BASE } from './apiConfig';
export async function vetoRequest(path, token, body, method) {
  const response = await fetch(API_BASE + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: response.status });
  return data;
}
