import { SidebarNode } from "@/types/node";
import { nanoid } from 'nanoid'
import { db } from "../db/campaignDB";
import { Change } from "@/types/node";


export async function createNode(defaults: Partial<SidebarNode> = {}) {
  const id = nanoid()
  const ts = Date.now()

  const node: SidebarNode = {
    id: id,
    type: defaults.type ?? 'Note',
    title: defaults.type ?? 'Untitled',
    markdown: defaults.markdown ?? '',
    updatedAt: ts,
    attributes: defaults.attributes ?? {},
  }

  await db.transaction('rw', db.nodes, db.changes, async () => {
    await db.nodes.add(node)
    await db.changes.add({
      op: 'create',
      nodeId: id,
      payload: node,
      ts,
    })
  })

  return id
}

export async function deleteNode(nodeId: string) {

  const ts = Date.now()
  await db.transaction('rw', db.nodes, db.changes, async () => {
    await db.nodes.delete(nodeId)
    await db.changes.add({
      op: 'delete',
      nodeId,
      payload: {},
      ts
    })
  })
}

export async function renameNode(id: string, title: string) {
  const ts = Date.now()
  await db.transaction('rw', db.nodes, db.changes, async () => {
    await db.nodes.update(id, { title, updatedAt: ts })
    await logChange({
      op: 'update',
      nodeId: id,
      payload: { title, updatedAt: ts },
      ts,
    })
  })
}


async function logChange(change: Change) {
  await db.transaction('rw', db.changes, async () => {
    const existing = await db.changes
      .where({ nodeId: change.nodeId, op: 'create' })
      .first()

    if (existing) {
      // already have a create → just mutate its payload / ts
      await db.changes.update(existing.id!, {
        payload: { ...existing.payload, ...change.payload },
        ts:     change.ts,
      })
    } else {
      await db.changes.add(change) // 'update' or first 'create'
    }
  })
}