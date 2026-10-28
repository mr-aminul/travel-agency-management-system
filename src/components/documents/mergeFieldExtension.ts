import { Node, mergeAttributes } from '@tiptap/core'
import {
  documentMergeToken,
  getDocumentMergeField,
} from '@/types/documentMergeFields'

export type MergeFieldAttrs = {
  key: string
  label: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeField: {
      insertMergeField: (attrs: MergeFieldAttrs) => ReturnType
    }
  }
}

export const MergeField = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      key: {
        default: 'name',
        parseHTML: (element) => element.getAttribute('data-key') || 'name',
        renderHTML: (attributes) => ({
          'data-key': attributes.key as string,
        }),
      },
      label: {
        default: 'Client name',
        parseHTML: (element) =>
          element.getAttribute('data-label') ||
          getDocumentMergeField(element.getAttribute('data-key') || '')?.chip ||
          'Field',
        renderHTML: (attributes) => ({
          'data-label': attributes.label as string,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mergeField"]',
      },
      {
        tag: 'span[data-merge-field]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          const key = element.getAttribute('data-merge-field') || 'name'
          const field = getDocumentMergeField(key)
          return {
            key,
            label: field?.chip ?? key,
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const key = String(node.attrs.key || 'name')
    const label =
      String(node.attrs.label || '') ||
      getDocumentMergeField(key)?.chip ||
      key
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mergeField',
        'data-key': key,
        'data-label': label,
        class: 'pd-doc-merge',
        contenteditable: 'false',
      }),
      label,
    ]
  },

  renderText({ node }) {
    return documentMergeToken(String(node.attrs.key || 'name'))
  },

  addCommands() {
    return {
      insertMergeField:
        (attrs) =>
        ({ commands }) => {
          const field = getDocumentMergeField(attrs.key)
          return commands.insertContent({
            type: this.name,
            attrs: {
              key: attrs.key,
              label: attrs.label || field?.chip || attrs.key,
            },
          })
        },
    }
  },
})
