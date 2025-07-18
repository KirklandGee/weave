import Dexie, { Table } from 'dexie'
import type { Note, Change, Relationship } from '@/types/node'

interface MetadataRow {
  id: string
  value: number | string | boolean
  updatedAt: number
}

class CampaignDB extends Dexie {
  nodes!: Table<Note, string>
  edges!: Table<Relationship, string>
  changes!: Table<Change, number>
  metadata!: Table<MetadataRow, string>
  constructor(campaignSlug: string) {
    super(`dnd-campaign-${campaignSlug}`)
    this.version(1).stores({
      nodes: 'id, type, updatedAt',
      edges: 'id, from, to, relType, updatedAt',
      changes: '++id, nodeId, ts',
    })
    
    this.version(2).stores({
      nodes:   'id, ownerId, campaignId, type, updatedAt, [ownerId+campaignId]',
      edges:   'id, ownerId, campaignId, from, to, relType, updatedAt, [ownerId+campaignId]',
      changes: '++id, nodeId, op, ts'
    })
  
    this.version(3).stores({
      nodes:   'id, ownerId, campaignId, type, updatedAt, [ownerId+campaignId]',
      edges:   'id, ownerId, campaignId, from, to, relType, updatedAt, [ownerId+campaignId]',
      changes: '++id, entity, entityId, op, ts'
    })
  
    this.version(4).stores({
      nodes:   'id, ownerId, campaignId, type, updatedAt, [ownerId+campaignId]',
      edges: 'id, fromId, toId, relType, updatedAt, [ownerId+campaignId]',
      changes: '++id, entity, entityId, op, ts'
    })
  
    this.version(5).stores({
      nodes:   'id, ownerId, campaignId, type, updatedAt, hasEmbedding, [ownerId+campaignId]',
      edges: 'id, fromId, toId, relType, updatedAt, [ownerId+campaignId]',
      changes: '++id, entity, entityId, op, ts'
    })
  
    this.version(6).stores({
      nodes:   'id, ownerId, campaignId, type, updatedAt, hasEmbedding, [ownerId+campaignId]',
      edges: 'id, fromId, toId, relType, updatedAt, [ownerId+campaignId]',
      changes: '++id, entity, entityId, op, ts',
      metadata: 'id, updatedAt'
    })
  
  }
}

const _dbCache = new Map<string, CampaignDB>();

export function getDb(campaignSlug?: string): CampaignDB {
  // Default to empty string if no campaign slug provided (for backward compatibility)
  const slug = campaignSlug || 'default';
  
  if (_dbCache.has(slug)) {
    return _dbCache.get(slug)!;
  }
  
  const db = new CampaignDB(slug);
  _dbCache.set(slug, db);
  return db;
}