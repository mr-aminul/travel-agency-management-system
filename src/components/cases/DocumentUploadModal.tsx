import { useId, type FormEvent } from 'react'
import { DocumentRecordFields } from '@/components/cases/DocumentRecordFields'
import {
  useDocumentRecordEditor,
  type DocumentDrawerMode,
} from '@/components/cases/documentRecordEditor'
import { Button, SideDrawer } from '@/components/ui'
import type { IdentityKind } from '@/lib/clientDocuments'
import type { CaseDocument } from '@/types/case'

export type { DocumentDrawerMode }

type DocumentUploadModalProps = {
  open: boolean
  caseId?: string
  clientId?: string
  identityKind?: IdentityKind
  document: CaseDocument | null
  mode?: DocumentDrawerMode
  onModeChange?: (mode: DocumentDrawerMode) => void
  onClose: () => void
  canEdit?: boolean
}

export function DocumentUploadModal({
  open,
  caseId,
  clientId,
  identityKind,
  document,
  mode = 'edit',
  onModeChange,
  onClose,
  canEdit = true,
}: DocumentUploadModalProps) {
  const formId = useId()
  const editor = useDocumentRecordEditor(open ? document : null)
  const isView = mode === 'view'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const saved = editor.save({ caseId, clientId, identityKind })
    if (!saved) return
    if (onModeChange) onModeChange('view')
    else onClose()
  }

  if (!document || !editor.form) return null

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={document.name}
      description={isView ? 'Document details' : 'Enter document details'}
      className="pd-doc-drawer"
      footer={
        <div className="pd-step-drawer__footer">
          {isView ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              {canEdit ? (
                <Button type="button" onClick={() => onModeChange?.('edit')}>
                  Edit
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (onModeChange && document.status !== 'missing') {
                    onModeChange('view')
                  } else {
                    onClose()
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form={formId}>
                Save
              </Button>
            </>
          )}
        </div>
      }
    >
      <DocumentRecordFields
        document={document}
        form={editor.form}
        mode={mode}
        fields={editor.fields}
        fileName={editor.fileName}
        fileId={editor.fileId}
        mimeType={editor.mimeType}
        errors={editor.errors}
        triedSubmit={editor.triedSubmit}
        formId={formId}
        onFieldChange={editor.updateField}
        onAttachFile={editor.attachFile}
        onRemoveFile={editor.clearFile}
        onSubmit={handleSubmit}
      />
    </SideDrawer>
  )
}
