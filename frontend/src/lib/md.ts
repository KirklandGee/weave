import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import TurndownService from 'turndown'
import rehypeSanitize from 'rehype-sanitize'

export async function mdToHtml(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true }) // keep raw HTML
    .use(rehypeSanitize)                             // strip unsafe stuff
    .use(rehypeStringify)
    .process(md)
  return String(file)
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