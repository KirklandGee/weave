import { useState, useEffect } from 'react';
import { templateService } from '@/lib/services/templateService';
import { TemplateInfo } from '@/lib/db/templateDB';
import { useAuthFetch } from '@/utils/authFetch.client';

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authFetch = useAuthFetch();

  useEffect(() => {
    let mounted = true;

    const loadTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize templates (will sync if needed)
        await templateService.initializeTemplates(authFetch);
        
        if (mounted) {
          const templateList = await templateService.getAllTemplates();
          setTemplates(templateList);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load templates');
          console.error('Error loading templates:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      mounted = false;
    };
  }, [authFetch]); // Include authFetch dependency

  return {
    templates,
    loading,
    error
  };
}