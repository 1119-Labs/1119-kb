/**
 * GitHubFormatConverter - Markdown format converter for GitHub
 *
 * Converts between GitHub Flavored Markdown (GFM) and mdast AST.
 * GFM is very close to standard markdown, so we use the standard
 * mdast utilities with GFM extensions.
 */

import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm'
import { toMarkdown } from 'mdast-util-to-markdown'
import { gfm } from 'micromark-extension-gfm'

/**
 * Format converter for GitHub Flavored Markdown.
 *
 * GFM adds the following extensions to standard markdown:
 * - Autolinks (URLs and emails)
 * - Strikethrough (~~text~~)
 * - Tables
 * - Task lists (- [ ] / - [x])
 */
export class GitHubFormatConverter {

  /**
   * Parse GitHub Flavored Markdown to mdast AST.
   *
   * @param text - The GFM text to parse
   * @returns The mdast AST
   *
   * @example
   * ```typescript
   * const ast = converter.toAst("Hello **world**");
   * // { type: "root", children: [{ type: "paragraph", ... }] }
   * ```
   */
  toAst(text: string): Root {
    return fromMarkdown(text, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    })
  }

  /**
   * Convert mdast AST back to GitHub Flavored Markdown.
   *
   * @param ast - The mdast AST to convert
   * @returns The GFM text
   *
   * @example
   * ```typescript
   * const text = converter.fromAst(ast);
   * // "Hello **world**"
   * ```
   */
  fromAst(ast: Root): string {
    return toMarkdown(ast, {
      extensions: [gfmToMarkdown()],
    })
  }

  /**
   * Extract plain text from markdown, stripping all formatting.
   *
   * @param text - The markdown text
   * @returns Plain text without formatting
   */
  toPlainText(text: string): string {
    const ast = this.toAst(text)
    return this.extractText(ast)
  }

  /**
   * Recursively extract text content from an AST node.
   */
  private extractText(node: Root | Root['children'][number]): string {
    if ('value' in node && typeof node.value === 'string') {
      return node.value
    }

    if ('children' in node && Array.isArray(node.children)) {
      return node.children.map(child => this.extractText(child)).join('')
    }

    return ''
  }

}
