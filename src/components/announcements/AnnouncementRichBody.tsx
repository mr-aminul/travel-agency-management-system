import { CheckCircle2, ListOrdered } from 'lucide-react'
import { parseAnnouncementBody } from '@/lib/parseAnnouncementBody'
import { cx } from '@/lib/cx'
import type { AnnouncementKind } from '@/types/announcement'

type AnnouncementRichBodyProps = {
  body: string
  kind: AnnouncementKind
  className?: string
}

/** Renders announcement copy as colored bordered boxes (lists, steps, headings). */
export function AnnouncementRichBody({
  body,
  kind,
  className,
}: AnnouncementRichBodyProps) {
  const blocks = parseAnnouncementBody(body)

  if (!blocks.length) {
    return (
      <p className={cx('pd-announce-card__paragraph', className)}>
        {body.trim() || '—'}
      </p>
    )
  }

  return (
    <div
      className={cx(
        'pd-announce-rich',
        `pd-announce-rich--${kind}`,
        className,
      )}
    >
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <p key={`h-${index}`} className="pd-announce-rich__heading">
              {block.text}
            </p>
          )
        }
        if (block.type === 'paragraph') {
          return (
            <p key={`p-${index}`} className="pd-announce-rich__paragraph">
              {block.text}
            </p>
          )
        }
        if (block.type === 'bullets') {
          return (
            <div key={`b-${index}`} className="pd-announce-box pd-announce-box--bullets">
              <ul className="pd-announce-box__list">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pd-announce-box__item">
                    <CheckCircle2
                      className="pd-announce-box__glyph"
                      size={16}
                      strokeWidth={2.2}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        return (
          <div key={`s-${index}`} className="pd-announce-box pd-announce-box--steps">
            <div className="pd-announce-box__caption">
              <ListOrdered size={14} strokeWidth={2.2} aria-hidden />
              Steps
            </div>
            <ol className="pd-announce-box__list pd-announce-box__list--steps">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pd-announce-box__item">
                  <span className="pd-announce-box__index" aria-hidden>
                    {itemIndex + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
