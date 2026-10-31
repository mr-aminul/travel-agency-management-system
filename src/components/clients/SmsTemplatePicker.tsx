import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import { Button, SideDrawer } from '@/components/ui'
import { readAgencyProfile } from '@/lib/agencyProfile'
import { getActiveTenantId } from '@/lib/authApi'
import { fillSmsTemplate } from '@/lib/smsTemplateFill'
import { useSmsTemplateFolders } from '@/lib/smsTemplatesStore'
import type { Client } from '@/types/client'
import type { MessageTemplateChannel } from '@/types/smsTemplate'

export function SmsTemplatePicker({
  client,
  channel,
  disabled,
  onPick,
}: {
  client: Client
  /** SMS button only on Messages; Email button only on Email. */
  channel: MessageTemplateChannel
  disabled?: boolean
  onPick: (body: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const folders = useSmsTemplateFolders(channel)
  const agencyName = readAgencyProfile(getActiveTenantId()).businessName
  const fillContext = useMemo(
    () => ({ client, agencyName }),
    [client, agencyName],
  )

  const label = channel === 'sms' ? 'SMS template' : 'Email template'
  const emptyCopy =
    channel === 'sms'
      ? 'No SMS templates yet. Add them under Settings → SMS/Email.'
      : 'No email templates yet. Add them under Settings → SMS/Email.'

  const toggleFolder = (folder: string) => {
    setExpanded((current) => ({
      ...current,
      [folder]: !(current[folder] ?? true),
    }))
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <SideDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        description="Open a folder and pick a template. Attributes fill from this client."
        className="pd-settings-drawer"
      >
        {folders.length === 0 ? (
          <p className="pd-sms-template-preview">{emptyCopy}</p>
        ) : (
          <ul
            className="pd-sms-template-picker"
            aria-label={`${label} folders`}
          >
            {folders.map((group) => {
              const isOpen = expanded[group.folder] ?? true
              return (
                <li key={group.folder} className="pd-sms-template-picker__folder">
                  <button
                    type="button"
                    className="pd-sms-template-picker__folder-btn"
                    aria-expanded={isOpen}
                    onClick={() => toggleFolder(group.folder)}
                  >
                    {isOpen ? (
                      <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
                    ) : (
                      <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
                    )}
                    <Folder size={16} strokeWidth={2.25} aria-hidden />
                    <span>{group.folder}</span>
                    <span className="pd-sms-template-picker__count">
                      {group.templates.length}
                    </span>
                  </button>
                  {isOpen ? (
                    <ul className="pd-sms-template-picker__list">
                      {group.templates.map((template) => (
                        <li key={template.id}>
                          <button
                            type="button"
                            className="pd-sms-template-picker__item"
                            onClick={() => {
                              onPick(
                                fillSmsTemplate(template.body, fillContext),
                              )
                              setOpen(false)
                            }}
                          >
                            <FileText size={15} strokeWidth={2.25} aria-hidden />
                            <span className="pd-sms-template-picker__item-copy">
                              <span className="pd-sms-template-picker__item-name">
                                {template.name}
                              </span>
                              <span className="pd-sms-template-picker__item-body">
                                {template.body.length > 90
                                  ? `${template.body.slice(0, 90)}…`
                                  : template.body}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </SideDrawer>
    </>
  )
}
