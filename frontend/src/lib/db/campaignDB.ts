import Dexie, { Table } from 'dexie'
import { CAMPAIGN_SLUG } from '@/lib/constants'
import type { SidebarNode, Change } from '@/types/node'

class CampaignDB extends Dexie {
  nodes!: Table<SidebarNode, string>
  changes!: Table<Change, number>

  constructor() {
    super(`dnd-campaign-${CAMPAIGN_SLUG}`)           // ← no mismatch
    this.version(1).stores({
      nodes: 'id, type, updatedAt',
      changes: '++id, nodeId, ts',
    })
  }
}

export const db = new CampaignDB()