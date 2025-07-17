import { Relationship } from "@/types/node";
import { nanoid } from 'nanoid'
import { getDb } from "../db/campaignDB";
import { Change } from "@/types/node";
import { USER_ID } from "../constants";

const currentUserId = USER_ID

export function createEdgeOps(campaignSlug: string) {
  const activeCampaignId = campaignSlug
  const db = getDb(campaignSlug)

  async function createEdge(defaults: Partial<Relationship> = {}) {
  const id = nanoid()
  const ts = Date.now()

  const edge: Relationship = {
    id,
    ownerId: currentUserId,
    campaignId: activeCampaignId,
    campaignIds: [activeCampaignId],
    fromId: defaults.fromId ?? '',
    toId: defaults.toId ?? '',
    fromTitle: defaults.fromTitle ?? '',
    toTitle: defaults.toTitle ?? '',
    relType: defaults.relType ?? 'MENTIONS',
    updatedAt: ts,
    attributes: defaults.attributes ?? {}
  }

  await db.transaction('rw', db.edges, db.changes, async () => { // <- include edges
    await db.edges.add(edge)
    await logChange({
      op: 'create',
      entity: 'edge',
      entityId: edge.id,
      payload: edge,
      ts,
    })
  })

  return id
  }

  async function deleteEdge(id: string) {
    const ts = Date.now()
    await db.transaction('rw', db.nodes, db.changes, async () => {
      await db.edges.delete(id)
      await logChange({
        op: 'delete',
        entity: 'edge',
        entityId: id,
        payload: {},
        ts
      })
    })
  }

  async function logChange(change: Change) {
    await db.transaction('rw', db.changes, async () => {
      const existing = await db.changes
        .where({ entity: 'edge', entityId: change.entityId, op: 'create' })
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
    createEdge,
    deleteEdge,
  }
}

// Backward compatibility exports
export async function createEdge(defaults: Partial<Relationship> = {}) {
  const ops = createEdgeOps('default')
  return ops.createEdge(defaults)
}

export async function deleteEdge(id: string) {
  const ops = createEdgeOps('default')
  return ops.deleteEdge(id)
}