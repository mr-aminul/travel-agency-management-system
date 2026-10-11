import { useEffect, useState } from 'react'
import { Button, Card, Select, Switch } from '@/components/ui'
import { getActiveTenantId } from '@/lib/authApi'
import {
  saveSubAgentAccessSettings,
  useSubAgentAccessSettings,
} from '@/lib/subAgentAccessSettings'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'

/** Sub-agent approval controls embedded in Access Management. */
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
  }, [saved])

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
    setStatus('Saved.')
  }

  return (
    <Card className="pd-user-access__sub-agent" title="Sub-agent access">
      <div className="pd-settings-stack">
        <div className="pd-settings-row">
          <span className="pd-settings-row__label">Require approval</span>
          <Switch
            className="pd-user-access__sub-agent-switch"
            checked={requireApproval}
            onChange={(event) => setRequireApproval(event.target.checked)}
            label="Require approval for sub-agent edits"
          />
        </div>

        <div className="pd-settings-row">
          <span className="pd-settings-row__label">Approvers</span>
          <div className="pd-user-access__sub-agent-field">
            <Select
              multiple
              aria-label="Approvers"
              value={approverMemberIds}
              onChange={(event) => setApproverMemberIds(event.target.value)}
              options={members.map((member) => ({
                value: member.id,
                label: `${member.name} (${member.role})`,
              }))}
              placeholder="Owners & managers"
              disabled={!requireApproval}
            />
          </div>
        </div>

        <div className="pd-settings-form__footer">
          <p
            className="pd-settings-form__status"
            role="status"
            aria-live="polite"
          >
            {status ?? ''}
          </p>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  )
}
