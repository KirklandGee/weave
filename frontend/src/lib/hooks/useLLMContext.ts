import { useActiveNode } from './useActiveNode'
import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'
import { htmlToMd } from '../md'

export function useLLMContext(campaign: string, nodeId: string) {
  // 1. content of the active node
  const { htmlContent, title } = useActiveNode(campaign, nodeId)

  // 2. edges from Dexie (already in camelCase)
  const db = getDb()
  const edges = useLiveQuery(() => 
    db.edges.where('fromId').equals(nodeId)
      .or('toId').equals(nodeId)
      .toArray(), 
    [nodeId]
  ) ?? []

  // 3. get all related node IDs and fetch their content
  const relatedNodes = useLiveQuery(async () => {
    if (!edges.length) return []
    
    // Get all unique node IDs that are related to this node
    const relatedNodeIds = [...new Set([
      ...edges.map(e => e.fromId).filter(id => id !== nodeId),
      ...edges.map(e => e.toId).filter(id => id !== nodeId)
    ])]
    
    // Fetch all related nodes in one query
    const nodes = await db.nodes.where('id').anyOf(relatedNodeIds).toArray()
    return nodes
  }, [edges, nodeId]) ?? []

  // 4. Convert to plain text context string with full content
  const contextString = (() => {
    let context = ''
    
    // Add the current note title and content
    if (title) {
      context += `Current Note: ${title}\n`
    }
    
    if (htmlContent) {
      const markdown = htmlToMd(htmlContent)
      context += `${markdown}\n\n`
    }
    
    // Add related notes with their full content
    if (relatedNodes.length > 0) {
      context += `Related Notes:\n\n`
      
      relatedNodes.forEach(node => {
        if (node.title && node.title !== '(untitled)') {
          context += `## ${node.title}\n`
          
          if (node.markdown) {
            context += `${node.markdown}\n\n`
          }
        }
      })
    }
    
    return context.trim()
  })()

  return contextString
}