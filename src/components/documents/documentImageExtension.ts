import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'

export type DocumentImageAlign = 'left' | 'center' | 'right'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentImage: {
      setDocumentImage: (options: {
        src: string
        alt?: string
        width?: number
        align?: DocumentImageAlign
      }) => ReturnType
      updateDocumentImage: (options: {
        width?: number
        align?: DocumentImageAlign
        alt?: string
      }) => ReturnType
    }
  }
}

export const DocumentImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 60,
        parseHTML: (element) => {
          const attr = element.getAttribute('data-width')
          if (attr) {
            const parsed = Number(attr)
            return Number.isFinite(parsed) ? parsed : 60
          }
          const styleWidth = element.style.width
          if (styleWidth.endsWith('%')) {
            const parsed = Number(styleWidth.replace('%', ''))
            return Number.isFinite(parsed) ? parsed : 60
          }
          return 60
        },
        renderHTML: (attributes) => {
          const width = Number(attributes.width) || 60
          return {
            'data-width': String(width),
            style: `width: ${width}%; max-width: 100%; height: auto;`,
          }
        },
      },
      align: {
        default: 'center' satisfies DocumentImageAlign,
        parseHTML: (element) => {
          const value = element.getAttribute('data-align')
          if (value === 'left' || value === 'center' || value === 'right') {
            return value
          }
          const styleFloat = element.style.float
          if (styleFloat === 'left' || styleFloat === 'right') return styleFloat
          return 'center'
        },
        renderHTML: (attributes) => ({
          'data-align': attributes.align || 'center',
        }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes['data-align'] as string) || 'center'
    const width = HTMLAttributes['data-width'] || '60'
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        class: `pd-doc-image pd-doc-image--${align}`,
        'data-align': align,
        'data-width': String(width),
      }),
    ]
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setDocumentImage:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt ?? '',
              width: options.width ?? 60,
              align: options.align ?? 'center',
            },
          }),
      updateDocumentImage:
        (options) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, options),
    }
  },
})
