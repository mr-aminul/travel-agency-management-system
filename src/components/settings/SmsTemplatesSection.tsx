import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@/components/ui'
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
  const [folderChoice, setFolderChoice] = useState(
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
  const { markAllTouched, showError, blur, resetTouched } = useTouchedFields<
    'folder' | 'name' | 'body'
  >()

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
      <header className="pd-settings-panel__header pd-settings-panel__header--flush">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        <SettingsInfo title={title} body={info} />
        <div className="pd-settings-panel__actions">
          <Button type="button" size="sm" onClick={() => openCreate()}>
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
              <Table aria-label={`${group.folder} templates`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead aria-label="Actions" />
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
            </section>
          ))
        ) : (
          <EmptyState
            title={
              channelTab === 'sms'
                ? 'No SMS templates yet'
                : 'No email templates yet'
            }
            description="Create folders and templates with attributes such as Client ID and passport tracking link."
            action={
              <Button type="button" size="sm" onClick={() => openCreate()}>
                <Plus size={14} />
                Add template
              </Button>
            }
          />
        )}
      </div>

      <SideDrawer
        open={composerOpen}
        onClose={closeComposer}
        title={editing ? 'Edit template' : 'New template'}
        description="Choose SMS or email, put it in a folder, then staff pick it under SMS/Email template."
        className="pd-settings-drawer"
      >
        <form
          className="pd-settings-catalog__composer"
          onSubmit={handleSubmit}
        >
          <Select
            label="Type"
            name="smsTemplateChannel"
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
            name="smsTemplateFolder"
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
            hint="Tap an attribute chip to insert it into the message."
          />
          <div className="pd-sms-template-attrs" aria-label="Insert attribute">
            {SMS_TEMPLATE_ATTRIBUTES.map((attr) => (
              <Button
                key={attr.key}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => insertAttribute(attr.token)}
              >
                {attr.label}
              </Button>
            ))}
          </div>
          {error ? (
            <p
              className="pd-settings-form__status pd-settings-form__status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="pd-settings-catalog__composer-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeComposer}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              {editing ? 'Save template' : 'Add template'}
            </Button>
          </div>
        </form>
      </SideDrawer>

      <SideDrawer
        open={renameFrom != null}
        onClose={() => {
          setRenameFrom(null)
          setRenameTo('')
          setRenameError(null)
        }}
        title="Rename folder"
        description="All templates in this folder move with the new name."
        className="pd-settings-drawer"
      >
        <form
          className="pd-settings-catalog__composer"
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
            <p
              className="pd-settings-form__status pd-settings-form__status--error"
              role="alert"
            >
              {renameError}
            </p>
          ) : null}
          <div className="pd-settings-catalog__composer-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRenameFrom(null)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save folder name
            </Button>
          </div>
        </form>
      </SideDrawer>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSmsTemplate(pendingDelete.id)
          setPendingDeleteId(null)
        }}
        title={`Remove ${pendingDelete?.name ?? 'this template'}?`}
        description="Staff will no longer see it under SMS/Email template on the client Messages screen."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  )
}
