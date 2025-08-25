import { useEffect, useRef, useCallback } from 'react';
import { useAuthFetch } from '@/utils/authFetch.client';
import { getDb } from '@/lib/db/campaignDB';

interface TemplateGenerationStatus {
  task_id: string;
  status: 'running' | 'completed' | 'error';
  template_name: string;
  note_id: string;
  started_at: string;
  completed_at: string | null;
  result: string | { note: string } | null;
  error: string | null;
}

export function useTemplateGeneration(campaignSlug: string) {
  const authFetch = useAuthFetch();
  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const stopPolling = useCallback((taskId: string) => {
    const intervalId = pollingIntervalsRef.current.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      pollingIntervalsRef.current.delete(taskId);
    }
  }, []);

  const handleGenerationComplete = useCallback(async (noteId: string, status: TemplateGenerationStatus) => {
    try {
      const db = getDb(campaignSlug);
      
      // Get the current note
      const note = await db.nodes.get(noteId);
      if (!note) {
        console.error(`Note ${noteId} not found`);
        return;
      }

      // Update the note with the generated content
      // Handle nested result structure - the actual content is in result.note
      const resultContent = typeof status.result === 'object' && status.result?.note 
        ? status.result.note 
        : (typeof status.result === 'string' ? status.result : '');
      
      // Extract title from first line of generated content
      const extractTitleFromContent = (content: string): string => {
        const firstLine = content.split('\n')[0].trim();
        
        // Look for patterns like "**Location:** The Mire of Mirabel" or "**Name:** Something"
        const colonMatch = firstLine.match(/\*\*[^*]+\*\*:\s*(.+)/);
        if (colonMatch) {
          return colonMatch[1].trim();
        }
        
        // Look for patterns like "# Title" or "## Title"
        const headerMatch = firstLine.match(/^#+\s*(.+)/);
        if (headerMatch) {
          return headerMatch[1].trim();
        }
        
        // If first line has bold formatting, extract it
        const boldMatch = firstLine.match(/\*\*([^*]+)\*\*/);
        if (boldMatch) {
          return boldMatch[1].trim();
        }
        
        // Fall back to template name or default
        const templateName = status.template_name || note.attributes?.template_name || 'Template';
        return `${templateName} Result`;
      };
      
      const noteTitle = extractTitleFromContent(resultContent);
      
      const updatedNote = {
        ...note,
        title: noteTitle,
        markdown: resultContent,
        updatedAt: Date.now(),
        attributes: {
          ...note.attributes,
          generation_status: 'completed',
          generation_completed_at: Date.now(),
          generation_task_id: status.task_id
        }
      };

      // Update the note in the database
      await db.nodes.put(updatedNote);
      
      console.log(`Template generation completed for note ${noteId}`);
    } catch (error) {
      console.error(`Error updating note ${noteId} on completion:`, error);
    }
  }, [campaignSlug]);

  const handleGenerationError = useCallback(async (noteId: string, status: TemplateGenerationStatus) => {
    try {
      const db = getDb(campaignSlug);
      
      // Get the current note
      const note = await db.nodes.get(noteId);
      if (!note) {
        console.error(`Note ${noteId} not found`);
        return;
      }

      // Update the note with error information
      // Use template_name from status, or fall back to note attributes, or default
      const templateName = status.template_name || note.attributes?.template_name || 'Template';
      
      const updatedNote = {
        ...note,
        title: `${templateName} - Error`,
        markdown: `# ${templateName} - Generation Failed\n\n**Error:** ${status.error || 'Unknown error occurred during generation'}\n\n*Please try again or contact support if the problem persists.*`,
        updatedAt: Date.now(),
        attributes: {
          ...note.attributes,
          generation_status: 'error',
          generation_completed_at: Date.now(),
          generation_error: status.error,
          generation_task_id: status.task_id
        }
      };

      // Update the note in the database
      await db.nodes.put(updatedNote);
      
      console.error(`Template generation failed for note ${noteId}:`, status.error);
    } catch (error) {
      console.error(`Error updating note ${noteId} on error:`, error);
    }
  }, [campaignSlug]);

  const handleGenerationTimeout = useCallback(async (noteId: string, taskId: string) => {
    try {
      const db = getDb(campaignSlug);
      
      // Get the current note
      const note = await db.nodes.get(noteId);
      if (!note) {
        console.error(`Note ${noteId} not found`);
        return;
      }

      // Update the note with timeout information
      const updatedNote = {
        ...note,
        title: `${note.attributes.template_name} Template - Timeout`,
        markdown: `# ${note.attributes.template_name} Template - Generation Timeout\n\n**Error:** Template generation timed out after 10 minutes.\n\n*The generation took too long to complete. Please try again with a simpler template or contact support if the problem persists.*`,
        updatedAt: Date.now(),
        attributes: {
          ...note.attributes,
          generation_status: 'error',
          generation_completed_at: Date.now(),
          generation_error: 'Generation timed out after 10 minutes',
          generation_task_id: taskId
        }
      };

      // Update the note in the database
      await db.nodes.put(updatedNote);
      
      console.error(`Template generation timed out for note ${noteId}`);
    } catch (error) {
      console.error(`Error updating note ${noteId} on timeout:`, error);
    }
  }, [campaignSlug]);

  const startPolling = useCallback((taskId: string, noteId: string) => {
    // Clear any existing polling for this task
    if (pollingIntervalsRef.current.has(taskId)) {
      clearInterval(pollingIntervalsRef.current.get(taskId));
    }

    const startTime = Date.now();
    const timeoutDuration = 10 * 60 * 1000; // 10 minutes timeout

    const poll = async () => {
      try {
        // Check for timeout
        if (Date.now() - startTime > timeoutDuration) {
          console.error(`Task ${taskId} timed out after ${timeoutDuration / 1000} seconds`);
          await handleGenerationTimeout(noteId, taskId);
          stopPolling(taskId);
          return;
        }

        const response = await authFetch(`/api/llm/template/status/${taskId}`);
        
        if (!response.ok) {
          console.error(`Failed to get status for task ${taskId}:`, response.status);
          return;
        }

        const status: TemplateGenerationStatus = await response.json();
        
        if (status.status === 'completed') {
          await handleGenerationComplete(noteId, status);
          stopPolling(taskId);
        } else if (status.status === 'error') {
          await handleGenerationError(noteId, status);
          stopPolling(taskId);
        }
        // If status is still 'running', keep polling
      } catch (error) {
        console.error(`Error polling task ${taskId}:`, error);
        // Continue polling on error - the task might still complete
      }
    };

    // Start polling every 3 seconds
    const intervalId = setInterval(poll, 3000);
    pollingIntervalsRef.current.set(taskId, intervalId);

    // Do an immediate poll
    poll();
  }, [authFetch, handleGenerationComplete, handleGenerationError, handleGenerationTimeout, stopPolling]);

  // Start polling for notes that are in generating state
  const startPollingForGeneratingNotes = useCallback(async () => {
    try {
      const db = getDb(campaignSlug);
      // Get all notes and filter in memory since attributes is not indexed
      const allNotes = await db.nodes.toArray();
      const generatingNotes = allNotes.filter(note => 
        note.attributes?.generation_status === 'generating'
      );

      generatingNotes.forEach(note => {
        const taskId = note.attributes.generation_task_id as string;
        if (taskId) {
          startPolling(taskId, note.id);
        }
      });
    } catch (error) {
      console.error('Error starting polling for generating notes:', error);
    }
  }, [campaignSlug, startPolling]);

  // Initialize polling for existing generating notes when the hook is created
  useEffect(() => {
    startPollingForGeneratingNotes();

    // Cleanup on unmount - capture the current intervals
    const currentIntervals = pollingIntervalsRef.current;
    return () => {
      currentIntervals.forEach((intervalId) => {
        clearInterval(intervalId);
      });
      currentIntervals.clear();
    };
  }, [campaignSlug, startPollingForGeneratingNotes]);

  return {
    startPolling,
    stopPolling,
    startPollingForGeneratingNotes
  };
}