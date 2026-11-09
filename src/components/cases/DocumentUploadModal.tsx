import { useId, type FormEvent } from 'react'
import { DocumentRecordFields } from '@/components/cases/DocumentRecordFields'
import {
  useDocumentRecordEditor,
  type DocumentDrawerMode,
} from '@/components/cases/documentRecordEditor'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
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
    void (async () => {
      const saved = await editor.save({ caseId, clientId, identityKind })
      if (!saved) return
      if (onModeChange) onModeChange('view')
      else onClose()
    })()
  }

  if (!document || !editor.form) return null

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">{document.name}</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
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
        </div>
        <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          {isView ? (
            <>
              <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={onClose}>
                Close
              </Button>
              {canEdit ? (
                <Button type="button" className="h-9 rounded-lg" onClick={() => onModeChange?.('edit')}>
                  Edit
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
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
              <Button type="submit" form={formId} className="h-9 rounded-lg">
                Save
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
