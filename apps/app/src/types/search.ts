
export type VectorSearchRequest = {
  queryText: string
  campaignId: string
  nodeTypes?: string[] // optional filter by node types
  limit?: number // default 10
  similarityThreshold?: number // default 0.7
}

export type VectorSearchResult = {
  nodeId: string
  title: string
  type: string
  similarityScore: number
  markdown?: string | null
}
