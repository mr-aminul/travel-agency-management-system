import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import {
  patchAgencyEmailEnabled,
  patchAgencySmsEnabled,
} from '@/lib/billing/billingApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useBilling } from '@/lib/billing/useBilling'
import {
  chromeHeadClass,
  floatingSheetClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  createSmsTemplate,
  deleteSmsTemplate,
  renameSmsTemplateFolder,
  updateSmsTemplate,
  useSmsTemplateFolders,
} from '@/lib/smsTemplatesStore'
import {
  validateOptionalText,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  SMS_TEMPLATE_ATTRIBUTES,
  SMS_TEMPLATE_FOLDER_SUGGESTIONS,
  type MessageTemplateChannel,
  type SmsTemplate,
} from '@/types/smsTemplate'

const NEW_FOLDER_VALUE = '__new_folder__'

export function SmsTemplatesSection({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const [channelTab, setChannelTab] = useState<MessageTemplateChannel>('sms')
  const groups = useSmsTemplateFolders(channelTab)
  const folderNames = useMemo(
    () => groups.map((group) => group.folder),
    [groups],
  )
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<SmsTemplate | null>(null)
  const [channel, setChannel] = useState<MessageTemplateChannel>('sms')
  const [folderChoice, setFolderChoice] = useState<string>(
    SMS_TEMPLATE_FOLDER_SUGGESTIONS[0],
  )
  const [customFolder, setCustomFolder] = useState('')
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [renameFrom, setRenameFrom] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [smsBusy, setSmsBusy] = useState(false)
  const [emailBusy, setEmailBusy] = useState(false)
  const [smsError, setSmsError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const { snapshot: billingSnapshot, reload: reloadBilling } = useBilling()
  const { markAllTouched, showError, blur, resetTouched } = useTouchedFields<
    'folder' | 'name' | 'body'
  >()
  const platformAllowsSms = billingSnapshot?.billing?.smsEnabled !== false
  const agencySmsOn = billingSnapshot?.billing?.agencySmsEnabled !== false
  const smsSendingOn = platformAllowsSms && agencySmsOn
  const platformAllowsEmail = billingSnapshot?.billing?.emailEnabled !== false
  const agencyEmailOn = billingSnapshot?.billing?.agencyEmailEnabled !== false
  const emailSendingOn = platformAllowsEmail && agencyEmailOn

  const resolvedFolder =
    folderChoice === NEW_FOLDER_VALUE ? customFolder : folderChoice
  const folderError = validateRequiredText(resolvedFolder, 'Folder', 2)
  const nameError = validateRequiredText(name, 'Template name', 2)
  const bodyError =
    validateRequiredText(body, 'Message', 1) ??
    validateOptionalText(body, 'Message', 2000)

  const folderOptions = useMemo(() => {
    const names = new Set<string>([
      ...SMS_TEMPLATE_FOLDER_SUGGESTIONS,
      ...folderNames,
    ])
    return [
      ...[...names]
        .sort((a, b) => a.localeCompare(b))
        .map((folder) => ({ value: folder, label: folder })),
      { value: NEW_FOLDER_VALUE, label: 'New folder…' },
    ]
  }, [folderNames])

  useEffect(() => {
    if (
      folderChoice !== NEW_FOLDER_VALUE &&
      !folderOptions.some((option) => option.value === folderChoice)
    ) {
      setFolderChoice(folderOptions[0]?.value ?? NEW_FOLDER_VALUE)
    }
  }, [folderChoice, folderOptions])

  const closeComposer = () => {
    setComposerOpen(false)
    setEditing(null)
    setChannel(channelTab)
    setFolderChoice(SMS_TEMPLATE_FOLDER_SUGGESTIONS[0])
    setCustomFolder('')
    setName('')
    setBody('')
    setError(null)
    resetTouched()
  }

  const openCreate = (folder?: string) => {
    setEditing(null)
    setChannel(channelTab)
    setFolderChoice(folder ?? SMS_TEMPLATE_FOLDER_SUGGESTIONS[0])
    setCustomFolder('')
    setName('')
    setBody('Dear {{name}}, your Client ID is {{clientId}}.')
    setError(null)
    resetTouched()
    setComposerOpen(true)
  }

  const openEdit = (template: SmsTemplate) => {
    setEditing(template)
    setChannel(template.channel)
    setFolderChoice(template.folder)
    setCustomFolder('')
    setName(template.name)
    setBody(template.body)
    setError(null)
    resetTouched()
    setComposerOpen(true)
  }

  const insertAttribute = (token: string) => {
    setBody((current) =>
      `${current}${current && !current.endsWith(' ') ? ' ' : ''}${token}`,
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['folder', 'name', 'body'])
    if (folderError || nameError || bodyError) return
    try {
      const draft = {
        channel,
        folder: resolvedFolder,
        name,
        body,
      }
      if (editing) {
        updateSmsTemplate(editing.id, draft)
      } else {
        createSmsTemplate(draft)
      }
      closeComposer()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save that template.',
      )
    }
  }

  const pendingDelete = groups
    .flatMap((group) => group.templates)
    .find((item) => item.id === pendingDeleteId)

  return (
    <>
      {authApiConfigured() ? (
        <div className="pd-msg-sending-prefs" aria-label="Message sending">
          <section
            className="pd-sms-sending-pref"
            aria-label="SMS sending for this agency"
          >
            <div className="pd-sms-sending-pref__copy">
              <h3 className="pd-sms-sending-pref__title">SMS sending</h3>
              {platformAllowsSms ? null : (
                <p className="pd-sms-sending-pref__hint">
                  SMS is blocked for this agency.
                </p>
              )}
              {smsError ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {smsError}
                </p>
              ) : null}
            </div>
            {/* Super Admin (platform) must allow SMS before agency Admin can toggle. */}
            {platformAllowsSms ? (
              <LabeledSwitch
                className="pd-sms-sending-pref__switch"
                label={smsSendingOn ? 'On' : 'Off'}
                checked={smsSendingOn}
                disabled={smsBusy || !billingSnapshot}
                onChange={(event) => {
                  const next = event.target.checked
                  setSmsBusy(true)
                  setSmsError(null)
                  void patchAgencySmsEnabled(next)
                    .then(() => reloadBilling())
                    .catch((err) => {
                      setSmsError(
                        err instanceof Error
                          ? err.message
                          : 'Could not update SMS setting.',
                      )
                    })
                    .finally(() => setSmsBusy(false))
                }}
              />
            ) : null}
          </section>
          <section
            className="pd-sms-sending-pref"
            aria-label="Email sending for this agency"
          >
            <div className="pd-sms-sending-pref__copy">
              <h3 className="pd-sms-sending-pref__title">Email sending</h3>
              {platformAllowsEmail ? null : (
                <p className="pd-sms-sending-pref__hint">
                  Email is blocked for this agency.
                </p>
              )}
              {emailError ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              ) : null}
            </div>
            <LabeledSwitch
              className="pd-sms-sending-pref__switch"
              label={
                !platformAllowsEmail
                  ? 'Blocked by platform'
                  : emailSendingOn
                    ? 'On'
                    : 'Off'
              }
              checked={emailSendingOn}
              disabled={
                emailBusy || !platformAllowsEmail || !billingSnapshot
              }
              onChange={(event) => {
                const next = event.target.checked
                setEmailBusy(true)
                setEmailError(null)
                void patchAgencyEmailEnabled(next)
                  .then(() => reloadBilling())
                  .catch((err) => {
                    setEmailError(
                      err instanceof Error
                        ? err.message
                        : 'Could not update email setting.',
                    )
                  })
                  .finally(() => setEmailBusy(false))
              }}
            />
          </section>
        </div>
      ) : null}

      <header className="pd-settings-panel__header pd-settings-panel__header--flush">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        <SettingsInfo title={title} body={info} />
        <div className="pd-settings-panel__actions">
          <Button type="button" className="h-9 rounded-lg" onClick={() => openCreate()}>
            <Plus size={14} />
            Add template
          </Button>
        </div>
      </header>

      <div
        className="pd-msg-template-tabs"
        role="tablist"
        aria-label="Template channel"
      >
        {(
          [
            { id: 'sms', label: 'SMS templates' },
            { id: 'email', label: 'Email templates' },
          ] as const
        ).map((tab) => {
          const selected = channelTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`pd-msg-template-tabs__tab${selected ? ' is-selected' : ''}`}
              onClick={() => setChannelTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="pd-settings-catalog">
        {groups.length ? (
          groups.map((group) => (
            <section
              key={`${channelTab}:${group.folder}`}
              className="pd-sms-template-folder"
              aria-labelledby={`sms-folder-${channelTab}-${group.folder}`}
            >
              <div className="pd-sms-template-folder__head">
                <h3
                  id={`sms-folder-${channelTab}-${group.folder}`}
                  className="pd-sms-template-folder__title"
                >
                  {group.folder}
                </h3>
                <div className="pd-settings-catalog__row-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Rename folder ${group.folder}`}
                    onClick={() => {
                      setRenameFrom(group.folder)
                      setRenameTo(group.folder)
                      setRenameError(null)
                    }}
                  >
                    <Pencil size={14} />
                    Rename
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openCreate(group.folder)}
                  >
                    <Plus size={14} />
                    Add
                  </Button>
                </div>
              </div>
              <div className={tableShellClass}>
              <Table aria-label={`${group.folder} templates`}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className={chromeHeadClass}>Template</TableHead>
                    <TableHead className={chromeHeadClass}>Preview</TableHead>
                    <TableHead className={chromeHeadClass} aria-label="Actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(template)}
                        >
                          {template.name}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className="pd-sms-template-preview">
                          {template.body.length > 72
                            ? `${template.body.slice(0, 72)}…`
                            : template.body}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="pd-settings-catalog__row-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove ${template.name}`}
                            onClick={() => setPendingDeleteId(template.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </section>
          ))
        ) : (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyTitle>
                {channelTab === 'sms'
                  ? 'No SMS Templates Yet'
                  : 'No Email Templates Yet'}
              </EmptyTitle>
            </EmptyHeader>
            <Button type="button" className="h-9 rounded-lg" onClick={() => openCreate()}>
              <Plus size={14} />
              Add Template
            </Button>
          </Empty>
        )}
      </div>

      <Sheet
        open={composerOpen}
        onOpenChange={(next) => {
          if (!next) closeComposer()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">
              {editing ? 'Edit template' : 'New template'}
            </SheetTitle>
          </SheetHeader>
          <form className="flex flex-col gap-4 p-5" onSubmit={handleSubmit}>
            <Select
              label="Type"
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as MessageTemplateChannel)
              }
              options={[
                { value: 'sms', label: 'SMS template' },
                { value: 'email', label: 'Email template' },
              ]}
            />
            <Select
              label="Folder"
              value={folderChoice}
              onChange={(event) => setFolderChoice(event.target.value)}
              options={folderOptions}
            />
            {folderChoice === NEW_FOLDER_VALUE ? (
              <Input
                label="New folder name"
                name="smsTemplateCustomFolder"
                value={customFolder}
                onChange={(event) => {
                  setCustomFolder(event.target.value)
                  setError(null)
                }}
                onBlur={blur('folder')}
                error={showError('folder') ? folderError : undefined}
                required
                placeholder="e.g. Visa"
              />
            ) : null}
            <Input
              label="Template name"
              name="smsTemplateName"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              onBlur={blur('name')}
              error={showError('name') ? nameError : undefined}
              required
              autoFocus
            />
            <Textarea
              label="Message"
              name="smsTemplateBody"
              value={body}
              onChange={(event) => {
                setBody(event.target.value)
                setError(null)
              }}
              onBlur={blur('body')}
              error={showError('body') ? bodyError : undefined}
              rows={5}
              required
            />
            <div className="pd-sms-template-attrs" aria-label="Insert attribute">
              {SMS_TEMPLATE_ATTRIBUTES.map((attr) => (
                <Button
                  key={attr.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg"
                  onClick={() => insertAttribute(attr.token)}
                >
                  {attr.label}
                </Button>
              ))}
            </div>
            {error ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={closeComposer}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 rounded-lg">
                {editing ? 'Save template' : 'Add template'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={renameFrom != null}
        onOpenChange={(next) => {
          if (!next) {
            setRenameFrom(null)
            setRenameTo('')
            setRenameError(null)
          }
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Rename folder</SheetTitle>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (!renameFrom) return
              try {
                renameSmsTemplateFolder(renameFrom, renameTo, undefined, channelTab)
                setRenameFrom(null)
                setRenameTo('')
                setRenameError(null)
              } catch (caught) {
                setRenameError(
                  caught instanceof Error
                    ? caught.message
                    : 'Could not rename that folder.',
                )
              }
            }}
          >
            <Input
              label="Folder name"
              value={renameTo}
              onChange={(event) => {
                setRenameTo(event.target.value)
                setRenameError(null)
              }}
              required
            />
            {renameError ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {renameError}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => setRenameFrom(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 rounded-lg">
                Save folder name
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSmsTemplate(pendingDelete.id)
          setPendingDeleteId(null)
        }}
        title={`Remove ${pendingDelete?.name ?? 'this template'}?`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  )
}
