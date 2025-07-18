import { auth } from '@clerk/nextjs/server';

export async function authFetch(url: string, options: RequestInit = {}) {
  const { getToken } = await auth();
  const token = await getToken();
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}