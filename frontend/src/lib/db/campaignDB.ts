import Dexie, { Table } from 'dexie'
import { CAMPAIGN_SLUG } from '@/lib/constants'
import type { SidebarNode, Change, Relationship } from '@/types/node'

class CampaignDB extends Dexie {
  nodes!: Table<SidebarNode, string>
  edges!: Table<Relationship, string>
  changes!: Table<Change, number>

  constructor() {
    super(`dnd-campaign-${CAMPAIGN_SLUG}`)           // ← no mismatch
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

  }
}
export const db = new CampaignDB()