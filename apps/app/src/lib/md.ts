import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeRaw from 'rehype-raw'
import TurndownService from 'turndown'
// import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

// Temporarily disabled sanitization schema for testing mention persistence
// const mentionSchema = {
//   ...defaultSchema,
//   attributes: {
//     ...defaultSchema.attributes,
//     span: [
//       ...(defaultSchema.attributes?.span || []),
//       'class', // Allow class attribute
//       ['dataId'], // Allow data-id as camelCase
//       'data*' // Allow all data attributes (correct syntax per docs)
//     ]
//   },
//   tagNames: [
//     ...(defaultSchema.tagNames || []),
//     'span' // Ensure span is allowed
//   ]
// }

export function mdToHtml(md: string): string {
  console.log('🔄 mdToHtml input:', md)
  
  // Pre-process mentions before markdown parsing
  const processedMd = md.replace(/\[@([^\]]+)\]\(mention:([^)]+)\)/g, (match, title, id) => {
    const span = `<span class="mention" data-id="${id}">${title}</span>`
    console.log('🔄 Mention converted:', { match, title, id, span })
    return span
  })
  
  console.log('🔄 Processed markdown:', processedMd)
  
  const result = String(
    unified()
      .use(remarkParse)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw) // This parses raw HTML in markdown
      // .use(rehypeSanitize, mentionSchema) // Temporarily disable sanitization for testing
      .use(rehypeStringify)
      .processSync(processedMd)
  )
  
  console.log('🔄 mdToHtml output:', result)
  return result
}

const td = new TurndownService({
  headingStyle: 'atx',   // optional, keeps things consistent
  emDelimiter: '_',      // Use underscores for emphasis (more reliable)
  blankReplacement: function(content, node) {
    // Preserve empty list items and paragraphs to maintain structure
    if (node.nodeName === 'LI') {
      return '- '  // Empty list item becomes list marker with space
    }
    if (node.nodeName === 'P' || node.nodeName === 'BR') {
      return '\n\n'  // Preserve paragraph breaks and line breaks
    }
    // Preserve empty headings with appropriate markdown syntax
    if (node.nodeName === 'H1') {
      return '# '
    }
    if (node.nodeName === 'H2') {
      return '## '
    }
    if (node.nodeName === 'H3') {
      return '### '
    }
    if (node.nodeName === 'H4') {
      return '#### '
    }
    if (node.nodeName === 'H5') {
      return '##### '
    }
    if (node.nodeName === 'H6') {
      return '###### '
    }
    // Check if it's a block element
    const blockElements = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH'];
    return blockElements.includes(node.nodeName) ? '\n\n' : ''
  }
})

td.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement(content) {
    return '~~' + content + '~~'
  },
})

td.addRule('mention', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.classList && node.classList.contains('mention')
  },
  replacement(content, node) {
    // Convert mention back to markdown format
    const id = (node as HTMLElement).getAttribute('data-id')
    if (id) {
      return `[@${content}](mention:${id})`
    }
    return `@${content}`
  },
})

export function htmlToMd(html: string): string {
  console.log('🔄 htmlToMd input:', html)
  const result = td.turndown(html)
  console.log('🔄 htmlToMd output:', result)
  return result
}