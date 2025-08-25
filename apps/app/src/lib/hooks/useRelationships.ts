import { useState, useCallback, useMemo } from 'react';
import { Note as Note, Relationship, RelationshipType } from '@/types/node';
import { getDb } from '../db/campaignDB';
import { createEdgeOps } from './useEdgeOps';
import { VectorSearchResult } from '@/types/search';
import { useAuthFetch } from '@/utils/authFetch.client';
import { useUser } from '@clerk/nextjs';
import { updateLastActivity } from '../utils/activityTracker';
// import {} from '@/lib/search'

type UseRelationshipsProps = {
  currentNote: Note;
  campaignSlug?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nodeSnakeToCamel(node: any): VectorSearchResult {
  return {
    nodeId: node.node_id,
    title: node.title,
    type: node.type,
    similarityScore: node.similarity_score,
    markdown: node.markdown ?? null,
  };
}

export function useRelationships({ currentNote, campaignSlug }: UseRelationshipsProps) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const db = getDb(campaignSlug);
  const { user } = useUser();
  const edgeOps = campaignSlug ? createEdgeOps(campaignSlug) : null;

  const authFetch = useAuthFetch() 

  // Get relationships for a specific note
  const getRelationshipsForNote = useCallback(async (noteId: string): Promise<Relationship[]> => {
    try {

      // Need to filter out campaign relations from this for now since we do everything in the UI by campaign
      const outgoingRelationships = await db.edges
        .where('fromId')
        .equals(noteId)
        .toArray();

      const incomingRelationships = await db.edges
        .where('toId')
        .equals(noteId)
        .toArray();

      const relationships = [...outgoingRelationships, ...incomingRelationships]

      return relationships.filter(rel => rel.relType !== 'PART_OF');
    } catch {
      return [];
    }
  }, [db]);

  // Get 2-hop suggestions
  const getTwoHopSuggestions = useCallback(async (noteId: string): Promise<Note[]> => {
    try {
      // Get all relationships for the current note
      const currentRelationships = await getRelationshipsForNote(noteId);

      // Get all notes that are connected to the current note's connections
      const connectedNoteIds = currentRelationships.map(rel => rel.toId);
      const twoHopConnections = new Set<string>();

      // For each connected note, get their relationships
      for (const connectedId of connectedNoteIds) {
        const connectedRelationships = await getRelationshipsForNote(connectedId);
        connectedRelationships.forEach(rel => {
          // Don't suggest the current note or already connected notes
          if (rel.toId !== noteId && !connectedNoteIds.includes(rel.toId)) {
            twoHopConnections.add(rel.toId);
          }
        });
      }

      // Get the actual note objects
      const allNotes = await db.nodes
        .toArray();

      return allNotes.filter(note => twoHopConnections.has(note.id));
    } catch {
      return [];
    }
  }, [getRelationshipsForNote, db]);

  const getSimilarContentSuggestions = useCallback(async (noteId: string, limit: number = 5): Promise<Note[]> => {
    try {
      // Add campaign_id parameter to filter results to current campaign
      const response = await authFetch(
        `/api/search/similar/${noteId}?limit=${limit}&threshold=0.6&campaign_id=${campaignSlug}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        }
      );
      if (response.ok) {
        const rawResults: VectorSearchResult[] = await response.json();

        if (rawResults && rawResults.length > 0) {
          const vectorResults = rawResults.map(result => nodeSnakeToCamel(result));

          // Filter out current note's relationships 
          const currentRelationships = await getRelationshipsForNote(noteId);
          const connectedNoteIds = new Set([
            ...currentRelationships.map(rel => rel.toId),
            ...currentRelationships.map(rel => rel.fromId),
            noteId // Ignore the current note
          ]);

          const filteredResults = vectorResults.filter(result =>
            !connectedNoteIds.has(result.nodeId)
          );
          // Get note objects from DB
          const noteIds = filteredResults.map(result => result.nodeId);

          const notes = await db.nodes
            .where('id')
            .anyOf(noteIds)
            .toArray();

          // Sort by similarity score
          const sortedNotes = notes.sort((a, b): number => {
            const aScore = filteredResults.find(r => r.nodeId === a.id)?.similarityScore || 0;
            const bScore = filteredResults.find(r => r.nodeId === b.id)?.similarityScore || 0; // Fixed typo: bscore -> bScore
            return bScore - aScore;
          });


          return sortedNotes;
        }
      }
    } catch {
      // Vector search failed, falling back to 2-hop suggestions
    }

    // Fallback to 2-hop suggestions
    return getTwoHopSuggestions(noteId);
  }, [getRelationshipsForNote, db, getTwoHopSuggestions, authFetch, campaignSlug]); // Added missing dependencies



  // Add relationship using your createEdge function
  const addRelationship = useCallback(async (targetNote: Note, relationshipType: RelationshipType) => {
    try {
      if (!edgeOps) throw new Error('Campaign not selected')

      const relationshipId = await edgeOps.createEdge({
        fromId: currentNote.id,
        toId: targetNote.id,
        fromTitle: currentNote.title,
        toTitle: targetNote.title,
        relType: relationshipType,
      });

      if (!user) {
       throw new Error('User must be authenticated to create relationships');
      }

      // Create the relationship object for local state
      const newRelationship: Relationship = {
        id: relationshipId,
        ownerId: user.id,
        campaignId: campaignSlug || null,
        campaignIds: campaignSlug ? [campaignSlug] : [],
        updatedAt: Date.now(),
        fromId: currentNote.id,
        toId: targetNote.id,
        fromTitle: currentNote.title,
        toTitle: targetNote.title,
        relType: relationshipType,
        attributes: {}
      };

      // Update local state
      setRelationships(prev => [...prev, newRelationship]);

      // Track user activity (edgeOps.createEdge already tracks local changes)
      if (campaignSlug) {
        await updateLastActivity(campaignSlug);
      }

      return newRelationship;
    } catch (error) {
      throw error;
    }
  }, [currentNote, user, campaignSlug, edgeOps]);

  // Remove relationship using your deleteEdge function
  const removeRelationship = useCallback(async (relationshipId: string) => {
    try {
      if (!edgeOps) throw new Error('Campaign not selected')
      await edgeOps.deleteEdge(relationshipId);
      setRelationships(prev => prev.filter(rel => rel.id !== relationshipId));
      
      // Track user activity (edgeOps.deleteEdge already tracks local changes)
      if (campaignSlug) {
        await updateLastActivity(campaignSlug);
      }
    } catch (error) {
      console.error('Error removing relationship:', error);
      throw error;
    }
  }, [edgeOps, campaignSlug]);

  // Load relationships for current note
  const loadRelationships = useCallback(async () => {
    if (!currentNote.id) return;

    setIsLoading(true);
    try {
      const noteRelationships = await getRelationshipsForNote(currentNote.id);
      setRelationships(noteRelationships);
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentNote.id, getRelationshipsForNote]);

  // Check if a relationship already exists
  const hasRelationship = useCallback((targetNoteId: string, relationshipType?: RelationshipType) => {
    return relationships.some(rel =>
      rel.toId === targetNoteId &&
      (relationshipType ? rel.relType === relationshipType : true)
    );
  }, [relationships]);

  // Get relationships grouped by type
  const relationshipsByType = useMemo(() => {
    const grouped: Record<RelationshipType, Relationship[]> = {
      'DEPICTS': [],
      'FOLLOWS': [],
      'FROM': [],
      'INVOLVES': [],
      'KNOWS': [],
      'LIVES_IN': [],
      'MENTIONS': [],
      'OCCURS_IN': [],
      'PART_OF': [],
      'WITHIN': [],
    };

    relationships.forEach(rel => {
      if (grouped[rel.relType]) {
        grouped[rel.relType].push(rel);
      }
    });

    return grouped;
  }, [relationships]);

  return {
    relationships,
    relationshipsByType,
    isLoading,
    getSimilarContentSuggestions,
    getTwoHopSuggestions,
    addRelationship,
    removeRelationship,
    loadRelationships,
    hasRelationship,
  };
}