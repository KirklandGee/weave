'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '@/lib/db/campaignDB'
import { pushPull } from '@/lib/db/sync'
import { CAMPAIGN_SLUG } from '../constants'

export const useCampaignNodes = () => {
  const nodes = useLiveQuery(() => db.nodes.toArray(), [], [])

  // 1. First-load seed
  useEffect(() => {
    if (nodes.length === 0) {
      (async () => {
        const fresh = await fetch(
          `/api/campaign/${CAMPAIGN_SLUG}/sidebar`
        ).then(r => r.json())
        if (fresh.length) await db.nodes.bulkPut(fresh)
      })()
    }
  }, [nodes])

  // 2. Background delta sync (unchanged)
  useEffect(() => {
    let stop = false
    const loop = async () => {
      if (stop) return
      await pushPull()      // still hits /since/{last}
      setTimeout(loop, 5000)
    }
    loop()
    return () => { stop = true }
  }, [])

  return nodes
}