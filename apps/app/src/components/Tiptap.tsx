'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { EditorContent, useEditor, Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@kirklandgee/tiptap-markdown'
import debounce from 'lodash.debounce'
import React from 'react'
import { createMentionExtension, MentionNodeData } from './MentionExtension'
import { useMentionSearch } from '@/lib/hooks/useMentionSearch'
import { useRelationships } from '@/lib/hooks/useRelationships'
import { useCampaign } from '@/contexts/AppContext'
import { Note } from '@/types/node'
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside or editor loses focus
  useEffect(() => {
    const handleBlur = () => setIsOpen(false)
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    editor.on('blur', handleBlur)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      editor.off('blur', handleBlur)
      document.removeEventListener('mousedown', handleClickOutside)
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside or editor loses focus
  useEffect(() => {
    const handleBlur = () => setIsOpen(false)
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    editor.on('blur', handleBlur)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      editor.off('blur', handleBlur)
      document.removeEventListener('mousedown', handleClickOutside)
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
    <div className="relative" ref={dropdownRef}>
      <button
        title="chevron-decorative"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
        }}
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
  nodeId,
  editorContent,
  onContentChange,
  onTypingStateChange,
  onNavigateToNode,
}: {
  nodeId: string;
  editorContent?: object | null;
  onContentChange: (editorJson: object, markdown?: string) => void;
  onTypingStateChange?: (isTyping: boolean) => void;
  onNavigateToNode?: (nodeId: string) => void;
}) {
  const { currentCampaign } = useCampaign()
  
  // Get current note from nodeId for relationships
  const [currentNote, setCurrentNote] = useState<Note | null>(null)

  // Load current note data when nodeId changes
  useEffect(() => {
    const loadCurrentNote = async () => {
      if (!nodeId || !currentCampaign?.slug) {
        setCurrentNote(null)
        return
      }

      try {
        // Import the database helper
        const { getDb } = await import('@/lib/db/campaignDB')
        const db = getDb(currentCampaign.slug)
        
        const note = await db.nodes.get(nodeId)
        if (note) {
          setCurrentNote(note)
        }
      } catch (error) {
        console.error('Failed to load current note:', error)
        setCurrentNote(null)
      }
    }

    loadCurrentNote()
  }, [nodeId, currentCampaign?.slug])
  
  // Initialize mention search hook
  const { searchForMentions } = useMentionSearch({
    campaignSlug: currentCampaign?.slug,
    currentNodeId: nodeId,
  })

  // Initialize relationships hook for auto-creating relationships
  // Create a placeholder note to avoid conditional hooks
  const placeholderNote = {
    id: '',
    title: '',
    type: '',
    markdown: '',
    ownerId: '',
    campaignId: null,
    campaignIds: [],
    updatedAt: 0,
    createdAt: 0,
    attributes: {}
  } as Note

  const relationshipsHook = useRelationships({
    currentNote: currentNote || placeholderNote,
    campaignSlug: currentCampaign?.slug,
  })

  // Handle mention creation - auto-create MENTIONS relationship
  const handleMentionCreate = useCallback(async (mention: MentionNodeData) => {
    console.log('[Tiptap] handleMentionCreate called with:', mention)
    console.log('[Tiptap] currentNote:', currentNote)
    console.log('[Tiptap] relationshipsHook:', relationshipsHook)
    
    if (!currentNote || !relationshipsHook) {
      console.warn('[Tiptap] Missing currentNote or relationshipsHook, skipping relationship creation')
      return
    }
    
    try {
      // Create a MENTIONS relationship FROM current note TO mentioned node
      // This means "Current note MENTIONS the mentioned node"
      const targetNote = {
        id: mention.id,
        title: mention.label,
        type: mention.type || 'Unknown',
        markdown: '',
        ownerId: '',
        campaignId: null,
        campaignIds: [],
        updatedAt: 0,
        createdAt: 0,
        attributes: {}
      } as Note // Create proper Note object
      
      console.log('[Tiptap] Creating relationship from:', currentNote.title, 'to:', mention.label)
      await relationshipsHook.addRelationship(targetNote, 'MENTIONS')
      console.log(`[Tiptap] ✅ Created relationship: "${currentNote.title}" MENTIONS "${mention.label}"`)
    } catch (error) {
      console.error('[Tiptap] ❌ Failed to create mention relationship:', error)
    }
  }, [currentNote, relationshipsHook])

  // Handle mention clicks - navigate to mentioned node
  const handleMentionClick = useCallback((mention: MentionNodeData) => {
    if (onNavigateToNode) {
      onNavigateToNode(mention.id)
    }
  }, [onNavigateToNode])

  // Create mention extension with our configuration
  const mentionExtension = useMemo(() => {
    if (!currentCampaign?.slug) return null
    
    return createMentionExtension({
      searchNodes: searchForMentions,
      currentNodeId: nodeId,
      onMentionCreate: handleMentionCreate,
      onMentionClick: handleMentionClick,
      onMentionDelete: (mention) => {
        console.log('Mention deleted:', mention.label)
        // Could implement relationship cleanup here if needed
      },
    })
  }, [currentCampaign?.slug, nodeId, searchForMentions, handleMentionCreate, handleMentionClick])

  const isTyping = useRef<boolean>(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const previousNodeId = useRef<string>('')
  const previousContent = useRef<object | null | undefined>(null)
  const currentNodeId = useRef<string>(nodeId)
  
  // Simple debounced save with node validation
  const debouncedSave = useMemo(() => {
    return debounce((editor: Editor) => {
      // Validate we're still on the same note before saving
      if (currentNodeId.current === nodeId) {
        const editorJson = editor.getJSON()
        // Get markdown from the editor's markdown extension
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markdown = (editor.storage as any).markdown?.getMarkdown?.() || ''
        console.log('[Tiptap] Extracted markdown:', markdown)
        console.log('[Tiptap] Saving content for nodeId:', nodeId, 'with markdown length:', markdown.length)
        onContentChange(editorJson, markdown)
      } else {
        console.warn('Prevented save to wrong node:', { expected: nodeId, actual: currentNodeId.current })
      }
    }, 400)
  }, [onContentChange, nodeId])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit, 
      Markdown.configure({
        html: true,                 // Enable HTML input/output to preserve mention HTML
        tightLists: true,          // Tight list formatting
        tightListClass: 'tight',   // Class for tight lists
        bulletListMarker: '-',     // Use dashes for bullet lists
        linkify: false,            // Don't auto-convert URLs to links
        breaks: false,             // Don't convert line breaks to <br>
        transformPastedText: false, // Don't transform pasted text
        transformCopiedText: false, // Don't transform copied text
      }),
      // Add mention extension if campaign is available
      ...(mentionExtension ? [mentionExtension] : []),
    ],
    content: editorContent || { type: 'doc', content: [] },
    onUpdate({ editor }) {
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
      
      // Save on every update
      debouncedSave(editor)
    },
    editorProps: {
      attributes: {
        class:
          "text-white prose prose-invert max-w-2xl min-h-[400px] focus:outline-none",
        spellcheck: "false",
      },
    },
    shouldRerenderOnTransaction: false,
  });

  /* ---------- 3. Load content on note switch OR content change ---------- */
  useEffect(() => {
    if (!editor) return
    
    const hasNodeChanged = nodeId !== previousNodeId.current
    const hasContentChanged = editorContent !== previousContent.current
    
    // Load content when switching notes OR when content loads for same note
    if (hasNodeChanged || (hasContentChanged && nodeId === previousNodeId.current)) {
      
      if (hasNodeChanged) {
        // Cancel all pending operations when switching notes
        debouncedSave.cancel()
        isTyping.current = false
        if (typingTimer.current) {
          clearTimeout(typingTimer.current)
          typingTimer.current = null
        }
        currentNodeId.current = nodeId
      }
      
      const contentToLoad = editorContent || { type: 'doc', content: [] }
      console.log(`[Tiptap] Loading content for nodeId: ${nodeId}, hasContent: ${!!editorContent}, contentType: ${typeof editorContent}`)
      console.log('[Tiptap] Content being loaded:', JSON.stringify(contentToLoad, null, 2))
      editor.commands.setContent(contentToLoad, { emitUpdate: false })
      
      previousNodeId.current = nodeId
      previousContent.current = editorContent
    }
  }, [nodeId, editor, editorContent, debouncedSave])

  /* ---------- 4. clean up ---------- */
  useEffect(() => {
    if (!editor) return

    return () => {
      debouncedSave.cancel()              // kill any pending save
      if (typingTimer.current) {
        clearTimeout(typingTimer.current)
      }
    }
  }, [editor, debouncedSave])
  
  /* ---------- 5. Cleanup on node change ---------- */
  useEffect(() => {
    // Update current node ref for validation
    currentNodeId.current = nodeId
  }, [nodeId])

  /* ---------- 6. Add mention click handler ---------- */
  useEffect(() => {
    if (!editor) return

    const handleMentionClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Check if clicked element is a mention or contains mention data
      const mentionElement = target.closest('.mention')
      if (mentionElement) {
        const id = mentionElement.getAttribute('data-id')
        const label = mentionElement.getAttribute('data-label')
        
        if (id && label && onNavigateToNode) {
          onNavigateToNode(id)
        }
      }
    }

    // Add click listener to editor
    editor.view.dom.addEventListener('click', handleMentionClick)
    
    return () => {
      editor.view.dom.removeEventListener('click', handleMentionClick)
    }
  }, [editor, onNavigateToNode])

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
            // Don't show during text input to prevent interruptions
            if (state.selection.from === state.selection.to) return false
            return true
          }}
        >
          <NotionLikeBubbleMenu editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent
        editor={editor}
        className="overflow-auto prose prose-invert max-w-none whitespace-pre-wrap"
      />
    </>
  );
}