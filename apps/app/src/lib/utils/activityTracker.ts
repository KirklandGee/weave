import { getDb } from '../db/campaignDB'

export const getSyncInterval = (lastUserActivity: Date): number => {
  const timeSinceActivity = Date.now() - lastUserActivity.getTime()
  
  if (timeSinceActivity < 5000) return 1000    // 1s when very active (just stopped typing)
  if (timeSinceActivity < 30000) return 2000   // 2s when active
  if (timeSinceActivity < 300000) return 10000 // 10s when idle
  if (timeSinceActivity < 1800000) return 30000 // 30s when away
  return 300000 // 5m when inactive
}

export const updateLastActivity = async (campaignSlug: string): Promise<void> => {
  const db = getDb(campaignSlug)
  const now = Date.now()
  
  try {
    await db.metadata.put({
      id: 'lastActivity',
      value: now,
      updatedAt: now
    })
  } catch (error) {
    console.error('Failed to update last activity:', error)
  }
}

export const updateLastLocalChange = async (campaignSlug: string): Promise<void> => {
  const db = getDb(campaignSlug)
  const now = Date.now()
  
  try {
    await db.metadata.put({
      id: 'lastLocalChange',
      value: now,
      updatedAt: now
    })
  } catch (error) {
    console.error('Failed to update last local change:', error)
  }
}

export const getLastActivity = async (campaignSlug: string): Promise<Date> => {
  const db = getDb(campaignSlug)
  
  try {
    const meta = await db.metadata.get('lastActivity')
    return meta ? new Date(meta.value as number) : new Date(0)
  } catch (error) {
    console.error('Failed to get last activity:', error)
    return new Date(0)
  }
}

export const getLastLocalChange = async (campaignSlug: string): Promise<Date> => {
  const db = getDb(campaignSlug)
  
  try {
    const meta = await db.metadata.get('lastLocalChange')
    return meta ? new Date(meta.value as number) : new Date(0)
  } catch (error) {
    console.error('Failed to get last local change:', error)
    return new Date(0)
  }
}

export const hasLocalChanges = async (campaignSlug: string): Promise<boolean> => {
  const db = getDb(campaignSlug)
  
  try {
    const changeCount = await db.changes.count()
    return changeCount > 0
  } catch (error) {
    console.error('Failed to check local changes:', error)
    return false
  }
}

export const shouldSync = async (campaignSlug: string): Promise<boolean> => {
  try {
    const hasChanges = await hasLocalChanges(campaignSlug)
    
    if (!hasChanges) {
      return false
    }
    
    const lastActivity = await getLastActivity(campaignSlug)
    const lastLocalChange = await getLastLocalChange(campaignSlug)
    
    const timeSinceActivity = Date.now() - lastActivity.getTime()
    const timeSinceLastChange = Date.now() - lastLocalChange.getTime()
    
    if (timeSinceActivity < 1000) return false
    
    const syncInterval = getSyncInterval(lastActivity)
    return timeSinceLastChange >= syncInterval
  } catch (error) {
    console.error('Failed to determine if sync is needed:', error)
    return false
  }
}

export const setSyncState = async (campaignSlug: string, state: 'idle' | 'syncing' | 'error'): Promise<void> => {
  const db = getDb(campaignSlug)
  const now = Date.now()
  
  try {
    await db.metadata.put({
      id: 'syncState',
      value: state,
      updatedAt: now
    })
  } catch (error) {
    console.error('Failed to set sync state:', error)
  }
}

export const getSyncState = async (campaignSlug: string): Promise<'idle' | 'syncing' | 'error'> => {
  const db = getDb(campaignSlug)
  
  try {
    const meta = await db.metadata.get('syncState')
    return (meta?.value as 'idle' | 'syncing' | 'error') || 'idle'
  } catch (error) {
    console.error('Failed to get sync state:', error)
    return 'idle'
  }
}