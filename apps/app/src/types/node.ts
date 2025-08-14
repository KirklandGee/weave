export interface Note {
  id: string
  ownerId: string
  campaignId: string | null        // null == "global" (legacy field for backward compatibility)
  campaignIds: string[]            // array of campaign IDs this node belongs to
  type: string
  title: string
  markdown: string
  updatedAt: number
  createdAt: number
  hasEmbedding?: boolean
  embeddedAt?: number
  contentHash?: string
  attributes: Record<string, unknown>
}

export type Change = {
  id?: number                 // Dexie auto-key
  op: 'create' | 'update' | 'delete' | 'upsert'
  entity: 'node' | 'edge' | 'folders' | 'chats' | 'chatMessages'
  entityId: string,
  payload: Partial<Note> | Record<string, unknown> // Can be note data or folder data
  ts: number                  // epoch ms
}

export type RelationshipType = 'DEPICTS' | 'FOLLOWS' | 'FROM' | 'INVOLVES' | 'KNOWS' | 'LIVES_IN' | 'MENTIONS' | 'OCCURS_IN' | 'PART_OF' | 'WITHIN'

export type Relationship = {
  id: string
  ownerId: string
  campaignId: string | null    // legacy field for backward compatibility
  campaignIds: string[]        // array of campaign IDs this relationship belongs to
  updatedAt: number
  fromId: string
  toId: string, 
  fromTitle: string,
  toTitle: string,
  relType: RelationshipType
  attributes?: Record<string, unknown>
}
