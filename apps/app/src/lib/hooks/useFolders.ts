import { useState, useEffect, useCallback, useMemo } from 'react'
import { FolderService, type FolderTreeNode } from '@/lib/folders'

export function useFolders(
  campaignSlug: string,
  campaignId: string,
  ownerId: string
) {
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [uncategorizedNoteIds, setUncategorizedNoteIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const folderService = useMemo(
    () => new FolderService(campaignSlug, campaignId, ownerId),
    [campaignSlug, campaignId, ownerId]
  )

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [tree, uncategorized] = await Promise.all([
        folderService.getFolderTree(),
        folderService.getUncategorizedNotes(),
      ])
      
      setFolderTree(tree)
      setUncategorizedNoteIds(uncategorized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders')
    } finally {
      setIsLoading(false)
    }
  }, [folderService])

  // Load folders on mount and when dependencies change
  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  // Load expanded state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`folder-expanded-${campaignSlug}`)
    if (stored) {
      try {
        const expandedIds = JSON.parse(stored)
        setExpandedFolders(new Set(expandedIds))
      } catch (e) {
        console.warn('Failed to parse stored folder expansion state:', e)
      }
    }
  }, [campaignSlug])

  // Save expanded state to localStorage
  const saveExpandedState = useCallback((expanded: Set<string>) => {
    localStorage.setItem(`folder-expanded-${campaignSlug}`, JSON.stringify([...expanded]))
  }, [campaignSlug])

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(folderId)) {
        newExpanded.delete(folderId)
      } else {
        newExpanded.add(folderId)
      }
      saveExpandedState(newExpanded)
      return newExpanded
    })
  }, [saveExpandedState])

  const createFolder = useCallback(async (name: string, parentId?: string) => {
    try {
      const newFolder = await folderService.createFolder(name, parentId)
      await loadFolders()
      return newFolder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
      throw err
    }
  }, [folderService, loadFolders])

  const renameFolder = useCallback(async (id: string, name: string) => {
    try {
      await folderService.updateFolder(id, { name })
      await loadFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder')
      throw err
    }
  }, [folderService, loadFolders])

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await folderService.deleteFolder(id, true)
      await loadFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder')
      throw err
    }
  }, [folderService, loadFolders])

  const moveNoteToFolder = useCallback(async (noteId: string, folderId: string | null) => {
    try {
      await folderService.moveNoteToFolder(noteId, folderId)
      await loadFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move note')
      throw err
    }
  }, [folderService, loadFolders])

  const reorderFolders = useCallback(async (updates: { id: string; parentId?: string; position: number }[]) => {
    try {
      await folderService.organizeFolders(updates)
      await loadFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder folders')
      throw err
    }
  }, [folderService, loadFolders])

  const ensureUncategorizedFolder = useCallback(async () => {
    try {
      return await folderService.ensureUncategorizedFolder()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure uncategorized folder')
      throw err
    }
  }, [folderService])


  const moveFolder = useCallback(async (folderId: string, newParentId?: string) => {
    try {
      await folderService.updateFolder(folderId, { parentId: newParentId })
      await loadFolders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move folder')
      throw err
    }
  }, [folderService, loadFolders])

  return {
    folderTree,
    expandedFolders,
    uncategorizedNoteIds,
    isLoading,
    error,
    toggleFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNoteToFolder,
    moveFolder,
    reorderFolders,
    ensureUncategorizedFolder,
    refreshFolders: loadFolders,
  }
}