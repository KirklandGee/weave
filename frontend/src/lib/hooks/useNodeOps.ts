import { Note } from "@/types/node";
import { nanoid } from 'nanoid'
import { getDb } from "../db/campaignDB";
import { Change } from "@/types/node";
import { USER_ID } from "../constants";

const currentUserId = USER_ID

export function createNodeOps(campaignSlug: string) {
  const activeCampaignId = campaignSlug
  const db = getDb(campaignSlug)

  async function createNode(defaults: Partial<Note> = {}) {
    const id = defaults.id ?? nanoid()     // keep caller's id if provided  
    const ts = Date.now()

    const node: Note = {
      id: id,
      ownerId: currentUserId,
      campaignId: activeCampaignId,  // legacy field
      campaignIds: [activeCampaignId], // new array field
      type: defaults.type ?? 'Note',
      title: defaults.title ?? 'Untitled',
      markdown: defaults.markdown ?? '',
      updatedAt: ts,
      createdAt: ts,
      attributes: defaults.attributes ?? {},
    }

    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.nodes.add(node)
      await logChange({
        op: 'create',
        entity: 'node',
        entityId: node.id,
        payload: node,
        ts,
      })
    })

    return id
  }

  async function deleteNode(id: string) {
    const ts = Date.now()
    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.nodes.delete(id)
      await logChange({
        op: 'delete',
        entity: 'node',
        entityId: id,
        payload: {},
        ts,
      })
    })
  }

  async function renameNode(id: string, title: string) {
    const ts = Date.now()
    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.nodes.update(id, { title, updatedAt: ts })
      await logChange({
        op: 'update',
        entity: 'node',
        entityId: id,
        payload: { title, updatedAt: ts },
        ts,
      })
    })
  }

  async function addToCampaign(nodeId: string, campaignId: string) {
    const node = await db.nodes.get(nodeId)
    if (!node) return
    
    const campaignIds = [...new Set([...node.campaignIds, campaignId])]
    const ts = Date.now()
    
    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.nodes.update(nodeId, { campaignIds, updatedAt: ts })
      await logChange({
        op: 'update',
        entity: 'node',
        entityId: nodeId,
        payload: { campaignIds, updatedAt: ts },
        ts,
      })
    })
  }

  async function removeFromCampaign(nodeId: string, campaignId: string) {
    const node = await db.nodes.get(nodeId)
    if (!node) return
    
    const campaignIds = node.campaignIds.filter(id => id !== campaignId)
    const ts = Date.now()
    
    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.nodes.update(nodeId, { campaignIds, updatedAt: ts })
      await logChange({
        op: 'update',
        entity: 'node',
        entityId: nodeId,
        payload: { campaignIds, updatedAt: ts },
        ts,
      })
    })
  }

  async function logChange(change: Change) {
    await db.transaction('rw', db.changes, async () => {
      const existing = await db.changes
        .where({ entity: 'node', entityId: change.entityId, op: 'create' })
        .first()

      if (existing) {
        // already have a create → just mutate its payload / ts
        await db.changes.update(existing.id!, {
          payload: { ...existing.payload, ...change.payload },
          ts: change.ts,
        })
      } else {
        await db.changes.add(change) // 'update' or first 'create'
      }
    })
  }

  return {
    createNode,
    deleteNode,
    renameNode,
    addToCampaign,
    removeFromCampaign,
  }
}

// Backward compatibility exports
export async function createNode(defaults: Partial<Note> = {}) {
  const ops = createNodeOps('default')
  return ops.createNode(defaults)
}

export async function deleteNode(id: string) {
  const ops = createNodeOps('default')
  return ops.deleteNode(id)
}

export async function renameNode(id: string, title: string) {
  const ops = createNodeOps('default')
  return ops.renameNode(id, title)
}