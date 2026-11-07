import { useEffect, useState } from 'react'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Field, FieldLabel } from '@/components/shadcn/field'
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

  const toggleApprover = (memberId: string, next: boolean) => {
    setApproverMemberIds((current) => {
      if (next) {
        return current.includes(memberId) ? current : [...current, memberId]
      }
      return current.filter((id) => id !== memberId)
    })
  }

  return (
    <Card className="pd-user-access__sub-agent">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Sub-Agent Access</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="pd-settings-stack">
          <div className="pd-settings-row">
            <span className="pd-settings-row__label">Require Approval</span>
            <LabeledSwitch
              className="pd-user-access__sub-agent-switch"
              checked={requireApproval}
              onChange={(event) => setRequireApproval(event.target.checked)}
              label="Require Approval For Sub-Agent Edits"
            />
          </div>

          <div className="pd-settings-row">
            <span className="pd-settings-row__label">Approvers</span>
            <div className="pd-user-access__sub-agent-field flex flex-col gap-2">
              {members.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">
                  Owners & Managers
                </p>
              ) : (
                members.map((member) => {
                  const checked = approverMemberIds.includes(member.id)
                  const fieldId = `approver-${member.id}`
                  return (
                    <Field key={member.id} orientation="horizontal">
                      <Checkbox
                        id={fieldId}
                        checked={checked}
                        disabled={!requireApproval}
                        onCheckedChange={(value) =>
                          toggleApprover(member.id, value === true)
                        }
                      />
                      <FieldLabel htmlFor={fieldId}>
                        {`${member.name} (${member.role})`}
                      </FieldLabel>
                    </Field>
                  )
                })
              )}
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
            <Button type="button" className="h-9 rounded-lg" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
