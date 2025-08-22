import { Mention } from '@tiptap/extension-mention'
import { Note } from '@/types/node'
import { ReactRenderer } from '@tiptap/react'
import { SuggestionOptions } from '@tiptap/suggestion'
import { MentionList } from './MentionList'
import { computePosition, flip, shift, offset, autoUpdate } from '@floating-ui/dom'

export interface MentionNodeData {
  id: string
  label: string
  type?: string
}

export interface MentionExtensionOptions {
  onMentionCreate?: (mention: MentionNodeData) => void
  onMentionDelete?: (mention: MentionNodeData) => void
  onMentionClick?: (mention: MentionNodeData) => void
  searchNodes: (query: string) => Promise<Note[]>
  currentNodeId?: string
}

export const createMentionExtension = (options: MentionExtensionOptions) => {
  return Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    renderHTML({ node }) {
      return [
        'span',
        {
          class: 'mention inline-flex items-center px-2 py-1 rounded-md text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors cursor-pointer',
          'data-type': 'mention',
          'data-id': node.attrs.id,
          'data-label': node.attrs.label,
        },
        `@${node.attrs.label}`,
      ]
    },
    suggestion: {
      char: '@',
      allowedPrefixes: [' ', '\n'],
      startOfLine: false,
      items: async ({ query }: { query: string }) => {
        console.log('[MentionExtension] Searching for:', query)
        if (query.length < 1) return []
        
        try {
          const nodes = await options.searchNodes(query)
          console.log('[MentionExtension] Found nodes:', nodes.length)
          // Filter out current node if provided
          const filteredNodes = options.currentNodeId 
            ? nodes.filter(node => node.id !== options.currentNodeId)
            : nodes
          
          const results = filteredNodes.slice(0, 10).map(node => ({
            id: node.id,
            label: node.title,
            type: node.type,
          }))
          console.log('[MentionExtension] Returning results:', results)
          return results
        } catch (error) {
          console.error('Error searching nodes for mentions:', error)
          return []
        }
      },
      render: () => {
        let component: ReactRenderer
        let popup: HTMLElement
        let cleanup: (() => void) | undefined

        return {
          onStart: (props: { editor: unknown; clientRect: () => DOMRect; command: (item: MentionNodeData) => void }) => {
            component = new ReactRenderer(MentionList, {
              props: {
                ...props,
                onSelect: (item: MentionNodeData) => {
                  console.log('[MentionExtension] onSelect called with:', item)
                  props.command(item)
                  // Call the callback when a mention is created
                  if (options.onMentionCreate) {
                    console.log('[MentionExtension] Calling onMentionCreate callback')
                    options.onMentionCreate(item)
                  } else {
                    console.warn('[MentionExtension] onMentionCreate callback not provided')
                  }
                },
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              editor: props.editor as any,
            })

            const clientRect = props.clientRect()
            if (!clientRect) {
              return
            }

            // Create popup element
            popup = document.createElement('div')
            popup.className = 'mention-popup fixed z-50'
            popup.appendChild(component.element)
            document.body.appendChild(popup)

            // Create virtual reference for positioning
            const virtualReference = {
              getBoundingClientRect: () => clientRect,
            }

            // Position the popup using Floating UI
            const updatePosition = () => {
              computePosition(virtualReference, popup, {
                placement: 'bottom-start',
                middleware: [
                  offset(8),
                  flip(),
                  shift({ padding: 8 }),
                ],
              }).then(({ x, y }) => {
                Object.assign(popup.style, {
                  left: `${x}px`,
                  top: `${y}px`,
                })
              })
            }

            updatePosition()
            
            // Set up auto-update
            cleanup = autoUpdate(virtualReference, popup, updatePosition)
          },

          onUpdate(props: { editor: unknown; clientRect: () => DOMRect; command: (item: MentionNodeData) => void }) {
            component.updateProps({
              ...props,
              onSelect: (item: MentionNodeData) => {
                console.log('[MentionExtension] onUpdate onSelect called with:', item)
                props.command(item)
                if (options.onMentionCreate) {
                  console.log('[MentionExtension] onUpdate calling onMentionCreate callback')
                  options.onMentionCreate(item)
                } else {
                  console.warn('[MentionExtension] onUpdate onMentionCreate callback not provided')
                }
              },
            })

            const clientRect = props.clientRect()
            if (!clientRect) {
              return
            }

            // Update virtual reference
            const virtualReference = {
              getBoundingClientRect: () => clientRect,
            }

            // Update position
            computePosition(virtualReference, popup, {
              placement: 'bottom-start',
              middleware: [
                offset(8),
                flip(),
                shift({ padding: 8 }),
              ],
            }).then(({ x, y }) => {
              Object.assign(popup.style, {
                left: `${x}px`,
                top: `${y}px`,
              })
            })
          },

          onKeyDown(props: { event: KeyboardEvent }) {
            if (props.event.key === 'Escape') {
              return true
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (component.ref as any)?.onKeyDown?.(props)
          },

          onExit() {
            cleanup?.()
            popup?.remove()
            component.destroy()
          },
        }
      },
    } as unknown as SuggestionOptions,
  })
}