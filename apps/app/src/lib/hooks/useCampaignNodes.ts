'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { getDb } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { useAuthFetch } from '@/utils/authFetch.client'

export const useCampaignNodes = (campaignSlug?: string) => {
  const authFetch = useAuthFetch()
  
  // Always create db instance but use null slug if not provided
  const db = getDb(campaignSlug || 'default')
  
  // Always call useLiveQuery, but return empty array if no campaign slug
  const nodes = useLiveQuery(() => {
    if (!campaignSlug) {
      return Promise.resolve([])
    }
    return db.nodes.toArray()
  }, [db], [campaignSlug, db])

  // 1. First-load seed
  useEffect(() => {
    if (!campaignSlug) {
      return
    }
    
    if (nodes && nodes.length > 0) {
      return
    }
    
    ;(async () => {
      try {
        const fresh = await authFetch(
          `/api/sync/${campaignSlug}/sidebar`
        ).then(r => r.json())
        if (fresh.length) {
          // Ensure nodes have the new campaignIds field
          const processedNodes = fresh.map((node: any) => ({
            ...node,
            campaignIds: node.campaignIds || (node.campaignId ? [node.campaignId] : [])
          }))
          await db.nodes.bulkPut(processedNodes)
        }
      } catch (error) {
        console.error('Error fetching nodes:', error)
      }
    })()
  }, [nodes, authFetch, db.nodes, campaignSlug])

  // 2. Background delta sync 
  useEffect(() => {
    if (!campaignSlug) return
    
    let stop = false
    const loop = async () => {
      if (stop) return
      await pushPull(authFetch, campaignSlug)
      setTimeout(loop, 5000)
    }
    loop()
    return () => { stop = true }
  }, [authFetch, campaignSlug])

  // Return undefined if no campaign slug, otherwise return nodes
  return campaignSlug ? nodes : undefined
}