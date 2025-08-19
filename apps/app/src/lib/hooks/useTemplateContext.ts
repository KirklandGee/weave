import { useLiveQuery } from 'dexie-react-hooks'
import { getDb } from '@/lib/db/campaignDB'

export function useTemplateContext(campaign: string, nodeId: string) {
  // 1. database connection and current node
  const db = getDb(campaign)
  const currentNode = useLiveQuery(() => db.nodes.get(nodeId), [nodeId])
  const title = currentNode?.title ?? 'Untitled'

  // 2. edges from Dexie (already in camelCase)
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

  // 4. get all session notes from current campaign
  const sessionNotes = useLiveQuery(async () => {
    const sessions = await db.nodes
      .where('type')
      .equals('Session')
      .toArray()
    
    // Sort by creation date for chronological order
    return sessions.sort((a, b) => a.createdAt - b.createdAt)
  }, []) ?? []

  // 5. Convert to comprehensive context string with current note, relationships, and all sessions
  const contextString = (() => {
    let context = ''
    
    // Add the current note title and content
    if (title) {
      context += `Current Note: ${title}\n`
    }
    
    if (currentNode?.markdown) {
      context += `<currentNote>${currentNode.markdown}\n</currentNote>`
    }

    // Add related nodes with relationships
    if (relatedNodes.length > 0) {
      relatedNodes.forEach(node => {
        if (!node.title || node.title === '(untitled)') return;

        // 1) sanitize title into a valid XML tag (no spaces or invalid chars)
        const tagName = node.title
          .trim()
          .replace(/\s+/g, '_')        // spaces → underscores
          .replace(/[^\w\-]/g, '');    // strip anything but letters, numbers, _ or -

        // 2) find all edges connecting the active note ↔ this node
        const connectingEdges = edges.filter(e =>
          (e.fromId === nodeId && e.toId === node.id) ||
          (e.toId   === nodeId && e.fromId === node.id)
        );

        if (connectingEdges.length === 0) return;

        // 3) build one or more relation lines
        const relationLines = connectingEdges.map(e => {
          // if fromId matches nodeId, current node is the source; else it's the target
          if (e.fromId === nodeId) {
            return `${title} -> ${e.relType} -> ${node.title}`;
          } else {
            return `${node.title} -> ${e.relType} -> ${title}`;
          }
        }).join('\n');

        // 4) append your XML block
        context += `<${tagName}>\n`;
        context += `${relationLines}\n\n`;
        context += `${node.markdown?.trim() || ''}\n`;
        context += `</${tagName}>\n\n`;
      });
    }

    // Add all session notes
    if (sessionNotes.length > 0) {
      context += `\nSession Notes:\n`;
      sessionNotes.forEach((session, index) => {
        if (!session.title || session.title === '(untitled)') return;

        // Create sanitized tag name for session
        const sessionTagName = `session_${index + 1}`;
        
        // Format creation date
        const createdDate = new Date(session.createdAt).toLocaleDateString();
        
        context += `<${sessionTagName}>\n`;
        context += `Session: ${session.title} (Created: ${createdDate})\n`;
        context += `${session.markdown?.trim() || ''}\n`;
        context += `</${sessionTagName}>\n\n`;
      });
    }
    
    return context.trim()
  })()

  return contextString
}