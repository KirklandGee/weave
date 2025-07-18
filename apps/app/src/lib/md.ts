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