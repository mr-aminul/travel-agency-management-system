import { useEffect, useState } from 'react'
import { Button, Select, Switch } from '@/components/ui'
import { getActiveTenantId } from '@/lib/authApi'
import {
  saveSubAgentAccessSettings,
  useSubAgentAccessSettings,
} from '@/lib/subAgentAccessSettings'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'

export function SubAgentAccessSection() {
  const tenantId = getActiveTenantId()
  const saved = useSubAgentAccessSettings(tenantId)
  const members = useTenantMembersByTenantId(tenantId).filter(
    (member) => member.status === 'active',
  )
  const [requireApproval, setRequireApproval] = useState(saved.requireApproval)
  const [approverMemberIds, setApproverMemberIds] = useState(
    saved.approverMemberIds,
  )
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setRequireApproval(saved.requireApproval)
    setApproverMemberIds(saved.approverMemberIds)
  }, [saved.requireApproval, saved.approverMemberIds])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), 2500)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleSave = () => {
    saveSubAgentAccessSettings({
      tenantId,
      requireApproval,
      approverMemberIds,
    })
    setStatus('Sub-agent access settings saved.')
  }

  return (
    <section
      className="pd-settings-panel"
      aria-labelledby="sub-agent-access-heading"
    >
      <header className="pd-settings-panel__header">
        <h2 id="sub-agent-access-heading">Sub-agent access</h2>
        <p>
          Control whether changes made by logged-in sub agents need agency
          approval before they go live.
        </p>
      </header>

      <div className="pd-form-stack">
        <Switch
          checked={requireApproval}
          onChange={(event) => setRequireApproval(event.target.checked)}
          label="Require approval for sub-agent edits"
        />
        <p className="pd-field-hint">
          When on, new clients and service updates from sub agents stay pending
          until an approver accepts them.
        </p>

        <Select
          multiple
          label="Approvers"
          hint={
            approverMemberIds.length === 0
              ? 'Leave empty to let owners and managers approve.'
              : 'Only selected agency users can approve pending sub-agent changes.'
          }
          value={approverMemberIds}
          onChange={(event) => setApproverMemberIds(event.target.value)}
          options={members.map((member) => ({
            value: member.id,
            label: `${member.name} (${member.role})`,
          }))}
          placeholder="Select approvers"
        />

        {status ? <p role="status">{status}</p> : null}

        <div className="pd-form-actions">
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </section>
  )
}
