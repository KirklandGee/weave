'use client'
import { useAuth } from '@clerk/nextjs';

export function useAuthFetch() {
  const { getToken } = useAuth();
  
  return async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  };
}