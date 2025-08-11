export interface Folder {
  id: string
  name: string
  parentId?: string
  position: number
  campaignId: string
  ownerId: string
  createdAt: number
  updatedAt: number
}

export interface FolderWithChildren extends Folder {
  children: FolderWithChildren[]
  noteIds: string[]
}

export interface FolderTreeNode {
  folder: Folder
  children: FolderTreeNode[]
  notes: string[]
  depth: number
}