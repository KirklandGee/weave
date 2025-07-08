import { SidebarNode } from "@/types/node";
import { nanoid } from 'nanoid'
import { db } from "../db/campaignDB";


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