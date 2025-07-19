import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { mdToHtml } from '../lib/md'

export interface MarkdownPasteOptions {
  markdownDetectionPatterns: RegExp[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    markdownPaste: {
      pasteMarkdown: (content: string) => ReturnType
    }
  }
}

const MarkdownPasteExtension = Extension.create<MarkdownPasteOptions>({
  name: 'markdownPaste',

  addOptions() {
    return {
      markdownDetectionPatterns: [
        /^#{1,6}\s+.+$/m, // Headers: # ## ### etc
        /^[\s]*[-*+]\s+.+$/m, // Unordered lists: - * +
        /^[\s]*\d+\.\s+.+$/m, // Ordered lists: 1. 2. 3.
        /```[\s\S]*?```/m, // Code blocks
        /`[^`]+`/m, // Inline code
        /\*\*[^*]+\*\*/m, // Bold **text**
        /\*[^*]+\*/m, // Italic *text*
        /^\s*>\s+.+$/m, // Blockquotes
        /\[.+\]\(.+\)/m, // Links [text](url)
      ]
    }
  },

  addCommands() {
    return {
      pasteMarkdown:
        (content: string) =>
        ({ commands }) => {
          try {
            const htmlContent = mdToHtml(content)
            return commands.insertContent(htmlContent)
          } catch (error) {
            console.warn('Failed to convert markdown to HTML:', error)
            return commands.insertContent(content)
          }
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event) => {
            if (!event.clipboardData) {
              return false
            }

            const text = event.clipboardData.getData('text/plain')
            const html = event.clipboardData.getData('text/html')

            // If there's HTML content, let the default handler process it
            if (html && html.trim() !== '') {
              return false
            }

            // If there's no plain text, let the default handler process it
            if (!text || text.trim() === '') {
              return false
            }

            // Check if the text looks like markdown
            const isMarkdown = this.options.markdownDetectionPatterns.some(pattern => 
              pattern.test(text)
            )

            if (!isMarkdown) {
              return false
            }

            // Handle markdown paste
            try {
              const htmlContent = mdToHtml(text)
              
              // Create a temporary div to parse the HTML
              const tempDiv = document.createElement('div')
              tempDiv.innerHTML = htmlContent
              
              // Insert the converted content
              this.editor.commands.insertContent(htmlContent)
              
              return true
            } catch (error) {
              console.warn('Failed to process markdown paste:', error)
              return false
            }
          },
        },
      }),
    ]
  },
})

export { MarkdownPasteExtension }
export default MarkdownPasteExtension