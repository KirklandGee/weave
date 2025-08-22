import React, { 
  useState, 
  useEffect, 
  useImperativeHandle, 
  forwardRef,
  useCallback 
} from 'react'
import { MentionNodeData } from './MentionExtension'

interface MentionListProps {
  items: MentionNodeData[]
  command: (item: MentionNodeData) => void
  onSelect: (item: MentionNodeData) => void
}

export interface MentionListRef {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean
}

const NODE_TYPE_COLORS: Record<string, string> = {
  'Character': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Location': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Session': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Campaign': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Quest': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Item': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'default': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = useCallback((index: number) => {
    const item = props.items[index]
    if (item) {
      props.onSelect(item)
    }
  }, [props])

  const upHandler = useCallback(() => {
    setSelectedIndex((prevIndex) => 
      prevIndex <= 0 ? props.items.length - 1 : prevIndex - 1
    )
  }, [props.items.length])

  const downHandler = useCallback(() => {
    setSelectedIndex((prevIndex) => 
      prevIndex >= props.items.length - 1 ? 0 : prevIndex + 1
    )
  }, [props.items.length])

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex)
  }, [selectItem, selectedIndex])

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="mention-dropdown bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 max-w-xs">
        <div className="text-sm text-zinc-500 dark:text-zinc-400 px-2 py-1">
          No nodes found
        </div>
      </div>
    )
  }

  return (
    <div className="mention-dropdown bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-1 max-w-xs max-h-48 overflow-y-auto">
      {props.items.map((item, index) => {
        const isSelected = index === selectedIndex
        const typeColor = NODE_TYPE_COLORS[item.type || 'default'] || NODE_TYPE_COLORS.default
        
        return (
          <button
            key={item.id}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
              isSelected 
                ? 'bg-yellow-100 dark:bg-yellow-900/30' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            onClick={() => selectItem(index)}
          >
            {item.type && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                {item.type}
              </span>
            )}
            <span className="truncate flex-1">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
})

MentionList.displayName = 'MentionList'