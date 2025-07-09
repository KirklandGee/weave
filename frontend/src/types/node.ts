export type SidebarNode = {
  id: string
  type: string
  title: string
  markdown?: string
  attributes: Record<string, unknown>
  updatedAt: number
  createdAt?: number
}

export type Change = {
  id?: number                 // Dexie auto-key
  op: 'create' | 'update' | 'delete'
  nodeId: string
  payload: Partial<SidebarNode>
  ts: number                  // epoch ms
}

export enum RelationshipType {
  DEPICTS,
  FOLLOWS,
  FROM,
  INVOLVES,
  KNOWS,
  LIVES_IN,
  MENTIONS,
  OCCURS_IN,
  PART_OF,
  WITHIN
}

export type Relationship = {
  id: string
  updatedAt: number
  from: string
  to: string, 
  relType: RelationshipType
}