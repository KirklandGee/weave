export interface SidebarNode {
  id: string
  ownerId: string
  campaignId: string | null        // null == “global”
  type: string
  title: string
  markdown: string
  updatedAt: number
  createdAt: number
  attributes: Record<string, unknown>
}

export type Change = {
  id?: number                 // Dexie auto-key
  op: 'create' | 'update' | 'delete'
  entity: 'node' | 'edge'
  entityId: string,
  payload: Partial<SidebarNode>
  ts: number                  // epoch ms
}

export type RelationshipType = 'DEPICTS' | 'FOLLOWS' | 'FROM' | 'INVOLVES' | 'KNOWS' | 'LIVES_IN' | 'MENTIONS' | 'OCCURS_IN' | 'PART_OF' | 'WITHIN'

export type Relationship = {
  id: string
  ownerId: string
  campaignId: string | null    
  updatedAt: number
  fromId: string
  toId: string, 
  fromTitle: string,
  toTitle: string,
  relType: RelationshipType
  attributes?: Record<string, unknown>
}
