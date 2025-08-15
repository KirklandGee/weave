'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { EditorContent, useEditor, Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { htmlToMd } from '@/lib/md'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import MarkdownPasteExtension from './MarkdownPasteExtension'
import { MentionSuggestion } from './MentionList'
import debounce from 'lodash.debounce'
import React from 'react'
import { useCampaign } from '@/contexts/AppContext'
import { createEdgeOps } from '@/lib/hooks/useEdgeOps'
import { Note } from '@/types/node'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  ChevronDown,
  Type,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react'

// Text Type Selector Component
function TextTypeSelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Close dropdown when editor loses focus or selection changes
  useEffect(() => {
    const handleUpdate = () => {
      if (!editor.isFocused || editor.state.selection.empty) {
        setIsOpen(false)
      }
    }
    
    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)
    editor.on('blur', handleUpdate)
    
    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
      editor.off('blur', handleUpdate)
    }
  }, [editor])
  
  const getCurrentTextType = () => {
    if (editor.isActive('heading', { level: 1 })) return { label: 'Heading 1', icon: Heading1 }
    if (editor.isActive('heading', { level: 2 })) return { label: 'Heading 2', icon: Heading2 }
    if (editor.isActive('heading', { level: 3 })) return { label: 'Heading 3', icon: Heading3 }
    if (editor.isActive('blockquote')) return { label: 'Quote', icon: Quote }
    if (editor.isActive('codeBlock')) return { label: 'Code', icon: Code }
    return { label: 'Text', icon: Type }
  }
  
  const textTypes = [
    { label: 'Text', icon: Type, command: () => editor.chain().focus().setParagraph().run() },
    { label: 'Heading 1', icon: Heading1, command: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: Heading2, command: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: Heading3, command: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Quote', icon: Quote, command: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Code', icon: Code, command: () => editor.chain().focus().toggleCodeBlock().run() },
  ]
  
  const currentType = getCurrentTextType()
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
      >
        <currentType.icon size={14} />
        <span className="text-xs">{currentType.label}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
          {textTypes.map((type) => (
            <button
              key={type.label}
              onClick={() => {
                type.command()
                setIsOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <type.icon size={14} />
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// List Type Selector Component
function ListTypeSelector({ editor }: { editor: Editor }) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Close dropdown when editor loses focus or selection changes
  useEffect(() => {
    const handleUpdate = () => {
      if (!editor.isFocused || editor.state.selection.empty) {
        setIsOpen(false)
      }
    }
    
    editor.on('update', handleUpdate)
    editor.on('selectionUpdate', handleUpdate)
    editor.on('blur', handleUpdate)
    
    return () => {
      editor.off('update', handleUpdate)
      editor.off('selectionUpdate', handleUpdate)
      editor.off('blur', handleUpdate)
    }
  }, [editor])
  
  const getCurrentListType = () => {
    if (editor.isActive('bulletList')) return { label: 'Bullet', icon: List }
    if (editor.isActive('orderedList')) return { label: 'Numbered', icon: ListOrdered }
    return { label: 'List', icon: List }
  }
  
  const listTypes = [
    { label: 'Bullet List', icon: List, command: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: ListOrdered, command: () => editor.chain().focus().toggleOrderedList().run() },
  ]
  
  const currentType = getCurrentListType()
  
  return (
    <div className="relative">
      <button
        title="chevron-decorative"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
      >
        <currentType.icon size={14} />
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 z-50 min-w-[120px]">
          {listTypes.map((type) => (
            <button
              key={type.label}
              onClick={() => {
                type.command()
                setIsOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              <type.icon size={14} />
              <span className="text-xs">{type.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Main Bubble Menu Component
function NotionLikeBubbleMenu({ editor }: { editor: Editor }) {
  const formatButton = (isActive: boolean, onClick: () => void, icon: React.ComponentType<{ size: number }>) => {
    const Icon = icon
    return (
      <button
        title="bubbleMenu"
        onClick={onClick}
        className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
          isActive 
            ? 'bg-yellow-500 text-white hover:bg-yellow-600 border border-yellow-400' 
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
        }`}
      >
        <Icon size={14} />
      </button>
    )
  }
  
  return (
    <div className="bubble-menu bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg flex items-center gap-1 p-1">
      {/* Text Type Selector */}
      <TextTypeSelector editor={editor} />
      
      {/* Separator */}
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
      
      {/* Format Buttons */}
      {formatButton(
        editor.isActive('bold'),
        () => editor.chain().focus().toggleBold().run(),
        Bold
      )}
      
      {formatButton(
        editor.isActive('italic'),
        () => editor.chain().focus().toggleItalic().run(),
        Italic
      )}
      
      {formatButton(
        editor.isActive('strike'),
        () => editor.chain().focus().toggleStrike().run(),
        Strikethrough
      )}
      
      {formatButton(
        editor.isActive('code'),
        () => editor.chain().focus().toggleCode().run(),
        Code
      )}
      
      {/* Separator */}
      <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
      
      {/* List Type Selector */}
      <ListTypeSelector editor={editor} />
    </div>
  )
}

export default function Tiptap({
  content,
  onContentChange,
  onTypingStateChange,
  currentNodeId,
  onNavigateToNote,
}: {
  content: string;
  onContentChange: (md: string) => void;
  onTypingStateChange?: (isTyping: boolean) => void;
  currentNodeId?: string;
  onNavigateToNote?: (note: Note) => void;
}) {
  const { currentCampaign } = useCampaign()
  const localUpdate = useRef<boolean>(false)
  const isTyping = useRef<boolean>(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const lastContent = useRef<string>('')

  // Track if this component instance is still active
  const isActiveRef = useRef(true)

  // Edge operations for creating mention relationships
  const edgeOps = useMemo(() => {
    return currentCampaign ? createEdgeOps(currentCampaign.slug) : null
  }, [currentCampaign])
  
  // create a fresh debouncer every time the callback changes (i.e. node switch)
  const debouncedSave = useMemo(() => {
    isActiveRef.current = true // Mark this instance as active
    const currentContent = content // Capture current content when debouncer is created
    
    return debounce((html: string) => {
      
      // Only save if content hasn't changed since debouncer was created (indicating same node)
      // Allow saves even if isActive is false, as long as we're still on the same content/node
      if (content === currentContent) {
        onContentChange(htmlToMd(html))
      } 
    }, 400)
  }, [onContentChange, content])

  // Fast save for paste operations (50ms debounce)
  const debouncedFastSave = useMemo(() => {
    const currentContent = content
    
    return debounce((html: string) => {
      if (content === currentContent) {
        onContentChange(htmlToMd(html))
      }
    }, 50)
  }, [onContentChange, content])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      MarkdownPasteExtension,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        renderHTML({ node }) {
          return ['span', { class: 'mention', 'data-id': node.attrs.id }, node.attrs.label]
        },
        suggestion: {
          items: () => {
            // Return dummy items to trigger the suggestion system
            // The actual search is handled in MentionSuggestion component
            return [{ id: 'dummy', label: 'dummy' }]
          },
          char: '@',
          startOfLine: false,
          render: () => {
            let component: ReactRenderer
            let popup: unknown

            return {
              onStart: (props) => {
                console.log('🎯 Mention suggestion onStart:', { query: props.query, range: props.range, hasClientRect: !!props.clientRect })
                component = new ReactRenderer(MentionSuggestion, {
                  props: {
                    ...props,
                    command: (item: Note) => {
                      console.log('🔗 Mention selected:', { 
                        itemId: item.id, 
                        itemTitle: item.title, 
                        currentNodeId, 
                        hasEdgeOps: !!edgeOps,
                        query: props.query
                      })
                      
                      // Create mention edge when item is selected
                      if (currentNodeId && edgeOps && item.id !== currentNodeId) {
                        console.log('🔗 Creating edge...', { fromId: currentNodeId, toId: item.id, toTitle: item.title })
                        
                        // Look up the current node's title for the fromTitle
                        if (currentCampaign) {
                          import('@/lib/db/campaignDB').then(({ getDb }) => {
                            const db = getDb(currentCampaign.slug)
                            db.nodes.get(currentNodeId).then(fromNode => {
                              const fromTitle = fromNode?.title || 'Unknown Note'
                              console.log('🔗 Creating edge with fromTitle:', fromTitle)
                              
                              edgeOps.createEdge({
                                fromId: currentNodeId,
                                toId: item.id,
                                fromTitle: fromTitle,
                                toTitle: item.title,
                                relType: 'MENTIONS',
                              }).then(edgeId => {
                                console.log('✅ Edge created successfully:', edgeId)
                              }).catch(error => {
                                console.error('❌ Edge creation failed:', error)
                              })
                            }).catch(error => {
                              console.error('❌ Failed to lookup fromNode:', error)
                              // Fallback to creating edge without fromTitle
                              edgeOps.createEdge({
                                fromId: currentNodeId,
                                toId: item.id,
                                fromTitle: 'Unknown Note',
                                toTitle: item.title,
                                relType: 'MENTIONS',
                              }).catch(console.error)
                            })
                          })
                        }
                      } else {
                        console.log('⚠️ Edge creation skipped:', { 
                          hasCurrentNodeId: !!currentNodeId, 
                          hasEdgeOps: !!edgeOps, 
                          sameNode: item.id === currentNodeId 
                        })
                      }
                      
                      // Insert mention and execute original command
                      console.log('📝 Inserting mention:', { id: item.id, label: item.title, originalQuery: props.query })
                      try {
                        props.command({
                          id: item.id,
                          label: item.title,
                        })
                      } catch (error) {
                        console.error('❌ Mention insertion failed:', error)
                      }
                    },
                  },
                  editor: props.editor,
                })

                // Validate clientRect before creating popup
                if (!props.clientRect) {
                  return
                }
                
                const rect = typeof props.clientRect === 'function' ? props.clientRect() : props.clientRect
                if (!rect || isNaN(rect.bottom) || isNaN(rect.left) || isNaN(rect.top) || isNaN(rect.right)) {
                  return
                }

                popup = tippy(document.createElement('div'), {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                })
              },

              onUpdate(props) {
                console.log('🎯 Mention suggestion onUpdate:', { query: props.query, range: props.range, hasClientRect: !!props.clientRect })
                component?.updateProps({
                  ...props,
                  command: (item: Note) => {
                    console.log('🔗 Mention selected (onUpdate):', { 
                      itemId: item.id, 
                      itemTitle: item.title, 
                      currentNodeId, 
                      hasEdgeOps: !!edgeOps,
                      query: props.query
                    })
                    
                    // Create mention edge when item is selected
                    if (currentNodeId && edgeOps && item.id !== currentNodeId) {
                      console.log('🔗 Creating edge (onUpdate)...', { fromId: currentNodeId, toId: item.id, toTitle: item.title })
                      
                      // Look up the current node's title for the fromTitle
                      if (currentCampaign) {
                        import('@/lib/db/campaignDB').then(({ getDb }) => {
                          const db = getDb(currentCampaign.slug)
                          db.nodes.get(currentNodeId).then(fromNode => {
                            const fromTitle = fromNode?.title || 'Unknown Note'
                            console.log('🔗 Creating edge (onUpdate) with fromTitle:', fromTitle)
                            
                            edgeOps.createEdge({
                              fromId: currentNodeId,
                              toId: item.id,
                              fromTitle: fromTitle,
                              toTitle: item.title,
                              relType: 'MENTIONS',
                            }).then(edgeId => {
                              console.log('✅ Edge created successfully (onUpdate):', edgeId)
                            }).catch(error => {
                              console.error('❌ Edge creation failed (onUpdate):', error)
                            })
                          }).catch(error => {
                            console.error('❌ Failed to lookup fromNode (onUpdate):', error)
                            // Fallback to creating edge without fromTitle
                            edgeOps.createEdge({
                              fromId: currentNodeId,
                              toId: item.id,
                              fromTitle: 'Unknown Note',
                              toTitle: item.title,
                              relType: 'MENTIONS',
                            }).catch(console.error)
                          })
                        })
                      }
                    } else {
                      console.log('⚠️ Edge creation skipped (onUpdate):', { 
                        hasCurrentNodeId: !!currentNodeId, 
                        hasEdgeOps: !!edgeOps, 
                        sameNode: item.id === currentNodeId 
                      })
                    }
                    
                    // Insert mention and execute original command
                    console.log('📝 Inserting mention (onUpdate):', { id: item.id, label: item.title, originalQuery: props.query })
                    try {
                      props.command({
                        id: item.id,
                        label: item.title,
                      })
                    } catch (error) {
                      console.error('❌ Mention insertion failed (onUpdate):', error)
                    }
                  },
                })

                // Validate clientRect before updating popup
                if (!props.clientRect) {
                  return
                }
                
                const rect = typeof props.clientRect === 'function' ? props.clientRect() : props.clientRect
                if (!rect || isNaN(rect.bottom) || isNaN(rect.left) || isNaN(rect.top) || isNaN(rect.right)) {
                  return
                }

                if (Array.isArray(popup) && popup[0]) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect as () => DOMRect,
                  })
                }
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  if (Array.isArray(popup) && popup[0]) {
                    popup[0].hide()
                  }
                  return true
                }

                return (component?.ref as { onKeyDown?: (event: KeyboardEvent) => boolean })?.onKeyDown?.(props.event) ?? false
              },

              onExit() {
                if (Array.isArray(popup) && popup[0]) {
                  popup[0].destroy()
                }
                component?.destroy()
              },
            }
          },
        },
      }),
    ],
    content,
    onUpdate({ editor, transaction }) {
      if (localUpdate.current) {            // ← ignore our own reset
        localUpdate.current = false
        return
      }
      
      // Check if this update was caused by a paste operation
      const isPaste = transaction.getMeta('paste') || 
                     transaction.steps.some(step => step.toJSON().type === 'replaceAround')
      
      // Mark as typing and reset timer
      if (!isTyping.current) {
        isTyping.current = true
        onTypingStateChange?.(true)
      }
      
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
      typingTimer.current = setTimeout(() => {
        isTyping.current = false
        onTypingStateChange?.(false)
      }, 1000) // Consider typing stopped after 1 second of inactivity
      
      // Use fast save for paste operations, normal debounce for typing
      if (isPaste) {
        debouncedFastSave(editor.getHTML())
      } else {
        debouncedSave(editor.getHTML())
      }
    },
    editorProps: {
      attributes: {
        class:
          "text-white prose prose-invert max-w-2xl min-h-[400px] focus:outline-none",
        spellcheck: "false",
      },
      handlePaste() {
        // Let TipTap handle the paste normally, but ensure onUpdate is triggered
        // The paste will be detected in onUpdate via transaction meta
        return false // Let default paste handling proceed
      },
    },
    shouldRerenderOnTransaction: false,
  });

  /* ---------- 3. Dexie -> editor sync ---------- */
  useEffect(() => {
    if (!editor) return
    
    // Only update if content actually changed and is different from last known content
    if (content !== lastContent.current) {
      // Check if the new content would produce different HTML from what's currently in editor
      // This avoids unnecessary updates when the markdown content is semantically the same
      const currentMarkdownFromEditor = htmlToMd(editor.getHTML())
      
      // Only update if the markdown content is actually different
      if (content !== currentMarkdownFromEditor) {
        // Clear typing state when switching notes to prevent stale saves
        isTyping.current = false
        if (typingTimer.current) {
          clearTimeout(typingTimer.current)
          typingTimer.current = null
        }
        
        // Save cursor position before updating
        const { from, to } = editor.state.selection
        const isFocused = editor.isFocused
        
        localUpdate.current = true
        lastContent.current = content
        editor.commands.setContent(content, { emitUpdate: false })
        
        // Restore cursor position if editor was focused
        if (isFocused) {
          setTimeout(() => {
            const maxPos = editor.state.doc.content.size
            const safeFrom = Math.min(from, maxPos)
            const safeTo = Math.min(to, maxPos)
            
            if (safeFrom <= maxPos && safeTo <= maxPos) {
              editor.commands.setTextSelection({ from: safeFrom, to: safeTo })
              editor.commands.focus()
            }
          }, 0)
        }
      } else {
        // Content is semantically the same, just update our tracking
        lastContent.current = content
      }
    }
  }, [content, editor])

  /* ---------- 4. Handle mention clicks ---------- */
  useEffect(() => {
    if (!editor || !onNavigateToNote) return

    const handleMentionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      console.log('👆 Click detected on:', target, { classList: target.classList, closest: target.closest('.mention') })
      
      if (target.classList.contains('mention') || target.closest('.mention')) {
        console.log('👆 Mention click detected!')
        event.preventDefault()
        const mentionElement = target.classList.contains('mention') ? target : target.closest('.mention') as HTMLElement
        const mentionId = mentionElement?.getAttribute('data-id')
        console.log('👆 Mention ID:', mentionId, { mentionElement, currentCampaign: currentCampaign?.slug })
        
        if (mentionId && currentCampaign) {
          console.log('👆 Looking up mention in database...')
          // Find the mentioned note and navigate to it
          import('@/lib/db/campaignDB').then(({ getDb }) => {
            const db = getDb(currentCampaign.slug)
            db.nodes.get(mentionId).then(note => {
              console.log('👆 Found note:', note)
              if (note && onNavigateToNote) {
                console.log('👆 Navigating to note:', note.title)
                onNavigateToNote(note)
              } else {
                console.log('👆 Navigation failed:', { hasNote: !!note, hasNavigateHandler: !!onNavigateToNote })
              }
            }).catch(error => {
              console.error('👆 Database lookup failed:', error)
            })
          })
        } else {
          console.log('👆 Navigation conditions not met:', { hasMentionId: !!mentionId, hasCampaign: !!currentCampaign })
        }
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener('click', handleMentionClick)

    return () => {
      editorElement.removeEventListener('click', handleMentionClick)
    }
  }, [editor, onNavigateToNote, currentCampaign])

  /* ---------- 5. clean up ---------- */
  useEffect(() => {
    if (!editor) return

    return () => {
      isActiveRef.current = false         // Mark this instance as inactive
      debouncedSave.cancel()              // kill any pending save
      debouncedFastSave.cancel()          // kill any pending fast save
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
    }
  }, [editor, debouncedSave, debouncedFastSave])

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'bottom', offset: 8 }}
          shouldShow={({ editor, state }) => {
            if (!editor.isFocused) return false
            if (editor.isDestroyed) return false
            if (!state.selection || state.selection.empty) return false
            return true
          }
          }        >
          <NotionLikeBubbleMenu editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent
        editor={editor}
        className="overflow-auto prose prose-invert max-w-none whitespace-pre-wrap [&_.mention]:bg-blue-600 [&_.mention]:text-white [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:rounded [&_.mention]:cursor-pointer [&_.mention]:hover:bg-blue-700 [&_.mention]:transition-colors"
      />
    </>
  );
}