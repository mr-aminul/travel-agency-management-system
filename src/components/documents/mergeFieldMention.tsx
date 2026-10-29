import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Editor } from '@tiptap/react'
import {
  DOCUMENT_MERGE_FIELDS,
  DOCUMENT_MERGE_GROUP_LABELS,
  type DocumentMergeField,
} from '@/types/documentMergeFields'
import { cx } from '@/lib/cx'

export type MergeFieldMentionRange = {
  from: number
  to: number
  query: string
}

const MENTION_PATTERN = /(^|[\s([{"'])@([^\s@]*)$/

export function findMergeFieldMention(
  textBeforeCursor: string,
  cursorPos: number,
): MergeFieldMentionRange | null {
  const match = textBeforeCursor.match(MENTION_PATTERN)
  if (!match) return null
  const query = match[2] ?? ''
  const atIndex = textBeforeCursor.length - query.length - 1
  if (atIndex < 0 || textBeforeCursor[atIndex] !== '@') return null
  const from = cursorPos - (textBeforeCursor.length - atIndex)
  return { from, to: cursorPos, query }
}

export function filterMergeFields(query: string): DocumentMergeField[] {
  const q = query.trim().toLowerCase()
  if (!q) return DOCUMENT_MERGE_FIELDS
  return DOCUMENT_MERGE_FIELDS.filter(
    (field) =>
      field.label.toLowerCase().includes(q) ||
      field.key.toLowerCase().includes(q) ||
      field.chip.toLowerCase().includes(q) ||
      DOCUMENT_MERGE_GROUP_LABELS[field.group].toLowerCase().includes(q),
  )
}

function readMentionFromEditor(editor: Editor): MergeFieldMentionRange | null {
  const { state } = editor
  const { selection } = state
  if (!selection.empty) return null
  const { $from } = selection
  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 64),
    $from.parentOffset,
    undefined,
    '\ufffc',
  )
  return findMergeFieldMention(textBefore, selection.from)
}

type MenuCoords = { left: number; top: number }

type MergeFieldMentionMenuProps = {
  editor: Editor | null
  enabled: boolean
}

export function MergeFieldMentionMenu({
  editor,
  enabled,
}: MergeFieldMentionMenuProps) {
  const [range, setRange] = useState<MergeFieldMentionRange | null>(null)
  const [coords, setCoords] = useState<MenuCoords | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef(range)
  const itemsRef = useRef<DocumentMergeField[]>([])
  const activeIndexRef = useRef(0)

  const items = useMemo(
    () => (range ? filterMergeFields(range.query) : []),
    [range],
  )

  rangeRef.current = range
  itemsRef.current = items
  activeIndexRef.current = activeIndex

  useEffect(() => {
    if (!editor || !enabled) {
      setRange(null)
      setCoords(null)
      return
    }

    const sync = () => {
      const next = readMentionFromEditor(editor)
      setRange(next)
      if (!next) {
        setCoords(null)
        return
      }
      const caret = editor.view.coordsAtPos(next.to)
      const stage = editor.view.dom.closest('.pd-doc-canvas__stage')
      const stageBox = stage?.getBoundingClientRect()
      if (stageBox) {
        setCoords({
          left: Math.min(
            Math.max(8, caret.left - stageBox.left),
            Math.max(8, stageBox.width - 280),
          ),
          top: caret.bottom - stageBox.top + 6,
        })
      } else {
        setCoords({ left: caret.left, top: caret.bottom + 6 })
      }
    }

    const onBlur = () => {
      window.setTimeout(() => {
        if (!listRef.current?.contains(document.activeElement)) {
          setRange(null)
          setCoords(null)
        }
      }, 120)
    }

    sync()
    editor.on('selectionUpdate', sync)
    editor.on('update', sync)
    editor.on('blur', onBlur)

    return () => {
      editor.off('selectionUpdate', sync)
      editor.off('update', sync)
      editor.off('blur', onBlur)
    }
  }, [editor, enabled])

  useEffect(() => {
    setActiveIndex(0)
  }, [range?.query, range?.from])

  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    )
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, items])

  const insertField = (field: DocumentMergeField) => {
    const currentRange = rangeRef.current
    if (!editor || !currentRange) return
    editor
      .chain()
      .focus()
      .deleteRange({ from: currentRange.from, to: currentRange.to })
      .insertMergeField({ key: field.key, label: field.chip })
      .run()
    setRange(null)
    setCoords(null)
  }

  const insertFieldRef = useRef(insertField)
  insertFieldRef.current = insertField

  useEffect(() => {
    if (!editor || !enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const currentRange = rangeRef.current
      const currentItems = itemsRef.current
      if (!currentRange || currentItems.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => (current + 1) % currentItems.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex(
          (current) =>
            (current - 1 + currentItems.length) % currentItems.length,
        )
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        const field =
          currentItems[activeIndexRef.current] ?? currentItems[0]
        if (field) insertFieldRef.current(field)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setRange(null)
        setCoords(null)
      }
    }

    const dom = editor.view.dom
    dom.addEventListener('keydown', onKeyDown)
    return () => dom.removeEventListener('keydown', onKeyDown)
  }, [editor, enabled])

  if (!enabled || !range || !coords) return null

  return (
    <div
      ref={listRef}
      className="pd-doc-mention"
      style={{ left: coords.left, top: coords.top }}
      role="listbox"
      aria-label="Insert information"
      onMouseDown={(event) => event.preventDefault()}
    >
      <p className="pd-doc-mention__hint">Insert information</p>
      {items.length === 0 ? (
        <p className="pd-doc-mention__empty">No matching fields</p>
      ) : (
        <ul className="pd-doc-mention__list">
          {items.map((field, index) => (
            <li key={field.key}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-active={index === activeIndex ? 'true' : undefined}
                className={cx(
                  'pd-doc-mention__item',
                  index === activeIndex && 'is-active',
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => insertField(field)}
              >
                <span className="pd-doc-mention__label">{field.label}</span>
                <span className="pd-doc-mention__meta">
                  {DOCUMENT_MERGE_GROUP_LABELS[field.group]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
