import { nanoid } from 'nanoid'
import { getDb } from '../db/campaignDB'
import type { Folder, FolderTreeNode } from './types'
import type { FolderCache } from '../db/campaignDB'

const UNCATEGORIZED_FOLDER_NAME = 'Uncategorized'

export class FolderService {
  constructor(
    private campaignSlug: string,
    private campaignId: string,
    private ownerId: string
  ) {}

  private get db() {
    return getDb(this.campaignSlug)
  }

  async createFolder(
    name: string, 
    parentId?: string, 
    position?: number
  ): Promise<Folder> {
    const now = Date.now()
    
    // Validate required fields
    if (!this.campaignId || !this.ownerId) {
      throw new Error(`Missing required fields: campaignId=${this.campaignId}, ownerId=${this.ownerId}`)
    }
    
    // Calculate position if not provided
    if (position === undefined) {
      const folders = await this.db.folders
        .filter(folder => 
          // Campaign folders belonging to this campaign
          (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
          // Legacy folders without campaign association
          (!folder.campaignId && !folder.ownerId)
        )
        .toArray()
      const siblings = folders.filter(f => 
        (parentId && f.parentId === parentId) || (!parentId && !f.parentId)
      )
      position = siblings.length
    }

    const folder: Folder = {
      id: nanoid(),
      name,
      parentId,
      position,
      campaignId: this.campaignId,
      ownerId: this.ownerId,
      createdAt: now,
      updatedAt: now,
    }

    // Store in local cache
    const folderCache: FolderCache = {
      ...folder,
      noteIds: [],
      childFolderIds: [],
    }

    await this.db.folders.put(folderCache)

    // Track change for sync
    await this.db.changes.add({
      entity: 'folders',
      entityId: folder.id,
      op: 'upsert',
      payload: folder,
      ts: now,
    })

    return folder
  }

  async updateFolder(id: string, updates: Partial<Pick<Folder, 'name' | 'position' | 'parentId'>>): Promise<void> {
    const folder = await this.db.folders.get(id)
    if (!folder) throw new Error('Folder not found')
    
    // Verify folder belongs to this campaign or is legacy data
    const belongsToCampaign = (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId)
    const isLegacyFolder = (!folder.campaignId && !folder.ownerId)
    
    if (!belongsToCampaign && !isLegacyFolder) {
      throw new Error('Folder does not belong to current campaign')
    }

    const updatedFolder = {
      ...folder,
      ...updates,
      updatedAt: Date.now(),
    }

    await this.db.folders.put(updatedFolder)

    // Track change for sync
    await this.db.changes.add({
      entity: 'folders',
      entityId: id,
      op: 'upsert',
      payload: updatedFolder,
      ts: updatedFolder.updatedAt,
    })
  }

  async deleteFolder(id: string, moveContentsToParent = true): Promise<void> {
    const folder = await this.db.folders.get(id)
    if (!folder) throw new Error('Folder not found')
    
    // Verify folder belongs to this campaign or is legacy data
    const belongsToCampaign = (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId)
    const isLegacyFolder = (!folder.campaignId && !folder.ownerId)
    
    if (!belongsToCampaign && !isLegacyFolder) {
      throw new Error('Folder does not belong to current campaign')
    }

    if (moveContentsToParent) {
      // Move all child folders to parent
      const childFolders = await this.db.folders
        .filter(folder => 
          folder.parentId === id && (
            // Campaign folders belonging to this campaign
            (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
            // Legacy folders without campaign association
            (!folder.campaignId && !folder.ownerId)
          )
        )
        .toArray()
      for (const child of childFolders) {
        await this.updateFolder(child.id, { parentId: folder.parentId })
      }

      // Move all notes to parent folder or leave uncategorized (no folder)
      const targetParentId = folder.parentId || null
      for (const noteId of folder.noteIds) {
        await this.moveNoteToFolder(noteId, targetParentId)
      }
    }

    await this.db.folders.delete(id)

    // Track change for sync
    await this.db.changes.add({
      entity: 'folders',
      entityId: id,
      op: 'delete',
      payload: {},
      ts: Date.now(),
    })
  }

  async moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
    // Remove note from all relevant folders (campaign folders OR legacy folders)
    const folders = await this.db.folders
      .filter(folder => 
        // Campaign folders belonging to this campaign
        (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
        // Legacy folders without campaign association
        (!folder.campaignId && !folder.ownerId)
      )
      .toArray()
    for (const folder of folders) {
      if (folder.noteIds.includes(noteId)) {
        folder.noteIds = folder.noteIds.filter(id => id !== noteId)
        folder.updatedAt = Date.now()
        await this.db.folders.put(folder)
        
        await this.db.changes.add({
          entity: 'folders',
          entityId: folder.id,
          op: 'upsert',
          payload: folder,
          ts: folder.updatedAt,
        })
      }
    }

    // Add to target folder
    if (folderId) {
      const targetFolder = await this.db.folders.get(folderId)
      if (targetFolder) {
        targetFolder.noteIds.push(noteId)
        targetFolder.updatedAt = Date.now()
        await this.db.folders.put(targetFolder)

        await this.db.changes.add({
          entity: 'folders',
          entityId: targetFolder.id,
          op: 'upsert',
          payload: targetFolder,
          ts: targetFolder.updatedAt,
        })
      }
    }
  }

  async getFolderTree(): Promise<FolderTreeNode[]> {
    // Get folders for this campaign OR legacy folders without campaign association
    const folders = await this.db.folders
      .filter(folder => 
        // Campaign folders belonging to this campaign
        (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
        // Legacy folders without campaign association
        (!folder.campaignId && !folder.ownerId)
      )
      .toArray()
    
    // Build tree structure
    const rootNodes: FolderTreeNode[] = []
    
    const buildNode = (folder: FolderCache, depth = 0): FolderTreeNode => {
      const children = folders
        .filter(f => f.parentId === folder.id)
        .sort((a, b) => a.position - b.position)
        .map(child => buildNode(child, depth + 1))

      return {
        folder: {
          id: folder.id,
          name: folder.name,
          parentId: folder.parentId,
          position: folder.position,
          campaignId: folder.campaignId,
          ownerId: folder.ownerId,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        },
        children,
        notes: [...folder.noteIds],
        depth,
      }
    }

    // Get root folders (no parent)
    const rootFolders = folders
      .filter(f => !f.parentId)
      .sort((a, b) => a.position - b.position)

    for (const folder of rootFolders) {
      rootNodes.push(buildNode(folder))
    }

    return rootNodes
  }

  async ensureUncategorizedFolder(): Promise<string> {
    // Check if uncategorized folder exists - campaign folders OR legacy folders
    const folders = await this.db.folders
      .filter(folder => 
        // Campaign folders belonging to this campaign
        (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
        // Legacy folders without campaign association
        (!folder.campaignId && !folder.ownerId)
      )
      .toArray()
    const existing = folders.find(f => 
      f.name === UNCATEGORIZED_FOLDER_NAME && !f.parentId
    )
    
    if (existing) {
      return existing.id
    }

    // Create uncategorized folder
    const folder = await this.createFolder(UNCATEGORIZED_FOLDER_NAME)
    return folder.id
  }

  async getUncategorizedNotes(): Promise<string[]> {
    // Get all folders (campaign + legacy)
    const folders = await this.db.folders
      .filter(folder => 
        // Campaign folders belonging to this campaign
        (folder.campaignId === this.campaignId && folder.ownerId === this.ownerId) ||
        // Legacy folders without campaign association
        (!folder.campaignId && !folder.ownerId)
      )
      .toArray()
    const allFolderNoteIds = new Set(folders.flatMap(f => f.noteIds))
    
    // Get ALL notes (campaign + legacy) - same pattern as folders
    const allNotes = await this.db.nodes
      .filter(note => 
        // Campaign notes belonging to this campaign
        (note.campaignId === this.campaignId && note.ownerId === this.ownerId) ||
        // Legacy notes without campaign association
        (!note.campaignId && !note.ownerId)
      )
      .toArray()
    
    // Return notes that aren't in any folder
    return allNotes
      .filter(note => !allFolderNoteIds.has(note.id))
      .map(note => note.id)
  }

  async organizeFolders(newOrder: { id: string; parentId?: string; position: number }[]): Promise<void> {
    for (const update of newOrder) {
      await this.updateFolder(update.id, {
        parentId: update.parentId,
        position: update.position,
      })
    }
  }

}