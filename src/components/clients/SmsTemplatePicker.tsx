import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
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

  const label = 'Template'
  const sheetTitle = channel === 'sms' ? 'SMS Template' : 'Email Template'
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
        variant="outline"
        size="sm"
        className="h-8 rounded-md"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <Sheet open={open} onOpenChange={(next) => { if (!next) setOpen(false) }}>
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">{sheetTitle}</SheetTitle>
          </SheetHeader>
          <div className="p-5">
            {folders.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">{emptyCopy}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={`${sheetTitle} folders`}>
                {folders.map((group) => {
                  const isOpen = expanded[group.folder] ?? true
                  return (
                    <li key={group.folder} className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                        aria-expanded={isOpen}
                        onClick={() => toggleFolder(group.folder)}
                      >
                        {isOpen ? (
                          <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
                        ) : (
                          <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
                        )}
                        <Folder size={16} strokeWidth={2.25} aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{group.folder}</span>
                        <span className="tabular-nums text-xs text-muted-foreground">
                          {group.templates.length}
                        </span>
                      </button>
                      {isOpen ? (
                        <ul className="m-0 flex list-none flex-col gap-1 p-0 ps-2">
                          {group.templates.map((template) => (
                            <li key={template.id}>
                              <button
                                type="button"
                                className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  onPick(
                                    fillSmsTemplate(template.body, fillContext),
                                  )
                                  setOpen(false)
                                }}
                              >
                                <FileText size={15} strokeWidth={2.25} className="mt-0.5 shrink-0" aria-hidden />
                                <span className="flex min-w-0 flex-col gap-0.5">
                                  <span className="font-medium">{template.name}</span>
                                  <span className="line-clamp-2 text-xs text-muted-foreground">
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
