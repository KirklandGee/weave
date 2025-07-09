import { SidebarNode } from "@/types/node";
import { nanoid } from 'nanoid'
import { getDb } from "../db/campaignDB";
import { Change } from "@/types/node";
import { CAMPAIGN_SLUG, USER_ID } from "../constants";

const currentUserId = USER_ID
const activeCampaignId = CAMPAIGN_SLUG
const db = getDb()

export async function createNode(defaults: Partial<SidebarNode> = {}) {
  const id = defaults.id ?? nanoid()     // keep caller’s id if provided  
  const ts = Date.now()

  console.log("Defaults:")
  console.log(defaults)

  const node: SidebarNode = {
    id: id,
    ownerId: currentUserId,
    campaignId: activeCampaignId,
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

export async function deleteNode(id: string) {

  const ts = Date.now()
  await db.transaction('rw', db.nodes, db.changes, async () => {
    await db.nodes.delete(id)
    await logChange({
      op: 'update',
      entity: 'node',
      entityId: id,
      payload: {},
      ts,
    })
  })
}

export async function renameNode(id: string, title: string) {
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