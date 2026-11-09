import { DocumentWorkspace } from '@/components/cases/DocumentWorkspace'
import {
  buildIdentityCaseDocument,
  type IdentityKind,
} from '@/lib/clientDocuments'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'

export type ClientIdentityDocumentWorkspaceProps = {
  client: Client
  cases: Case[]
  identityKind: IdentityKind
}

/** Passport / NID editor for the Profile right sheet. */
export function ClientIdentityDocumentWorkspace({
  client,
  cases,
  identityKind,
}: ClientIdentityDocumentWorkspaceProps) {
  const document = buildIdentityCaseDocument(client, cases, identityKind)

  return (
    <div id="client-identity-document" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <DocumentWorkspace
        key={`identity:${document.id}`}
        document={document}
        clientId={client.id}
        identityKind={identityKind}
        canEdit
        embedded
        hideHeader
        compact
      />
    </div>
  )
}
