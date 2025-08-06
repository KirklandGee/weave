'use client'
import { useAuth } from '@clerk/nextjs';
import { useCallback } from 'react';

export function useAuthFetch() {
  const { getToken } = useAuth();
  
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  }, [getToken]);
}