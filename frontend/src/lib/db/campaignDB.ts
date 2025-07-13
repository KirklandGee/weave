import Dexie, { Table } from 'dexie'
import { CAMPAIGN_SLUG } from '@/lib/constants'
import type { Note, Change, Relationship } from '@/types/node'

class CampaignDB extends Dexie {
  nodes!: Table<Note, string>
  edges!: Table<Relationship, string>
  changes!: Table<Change, number>
  constructor() {
    super(`dnd-campaign-${CAMPAIGN_SLUG}`)
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
  
  }
}

let _db: CampaignDB | undefined;

export function getDb(): CampaignDB {
  if (_db) return _db;
  _db = new CampaignDB();
  return _db;
}