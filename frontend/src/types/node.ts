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