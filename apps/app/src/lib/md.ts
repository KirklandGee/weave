import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import TurndownService from 'turndown'
import rehypeSanitize from 'rehype-sanitize'

export function mdToHtml(md: string): string {
  return String(
    unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .processSync(md)
  )
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
    return node.isBlock ? '\n\n' : ''
  }
})

td.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement(content) {
    return '~~' + content + '~~'
  },
})

export function htmlToMd(html: string): string {
  return td.turndown(html)
}