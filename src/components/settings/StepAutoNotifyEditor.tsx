import { Select } from '@/components/clients/clientShadcnFields'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { useSmsTemplates } from '@/lib/smsTemplatesStore'
import type { ServiceStepAutoNotify } from '@/types/serviceTemplate'

export function compactStepAutoNotify(
  next: ServiceStepAutoNotify,
): ServiceStepAutoNotify | undefined {
  const sms = next.sms === true
  const email = next.email === true
  const smsTemplateId = sms ? next.smsTemplateId?.trim() || undefined : undefined
  const emailTemplateId = email
    ? next.emailTemplateId?.trim() || undefined
    : undefined
  if (!sms && !email) return undefined
  return {
    ...(sms ? { sms: true } : {}),
    ...(email ? { email: true } : {}),
    ...(smsTemplateId ? { smsTemplateId } : {}),
    ...(emailTemplateId ? { emailTemplateId } : {}),
  }
}

export function StepAutoNotifyEditor({
  value,
  onChange,
  stepLabel,
}: {
  value: ServiceStepAutoNotify | undefined
  onChange: (next: ServiceStepAutoNotify | undefined) => void
  stepLabel?: string
}) {
  const smsTemplates = useSmsTemplates('sms')
  const emailTemplates = useSmsTemplates('email')
  const smsOn = value?.sms === true
  const emailOn = value?.email === true
  const statusName = stepLabel?.trim() || 'this status'

  const smsOptions = [
    { value: '', label: 'Default status message' },
    ...smsTemplates.map((item) => ({
      value: item.id,
      label: `${item.folder} · ${item.name}`,
    })),
  ]
  const emailOptions = [
    { value: '', label: 'Default status message' },
    ...emailTemplates.map((item) => ({
      value: item.id,
      label: `${item.folder} · ${item.name}`,
    })),
  ]

  const patch = (partial: Partial<ServiceStepAutoNotify>) => {
    onChange(
      compactStepAutoNotify({
        sms: value?.sms,
        email: value?.email,
        smsTemplateId: value?.smsTemplateId,
        emailTemplateId: value?.emailTemplateId,
        ...partial,
      }),
    )
  }

  return (
    <section
      className="pd-step-auto-notify"
      aria-label={`Auto send for ${statusName}`}
    >
      <span className="pd-settings-template__panel-label">
        Auto send on this status
      </span>

      <div className="pd-step-auto-notify__row">
        <LabeledSwitch
          className="pd-step-auto-notify__switch"
          label="SMS"
          checked={smsOn}
          onChange={(event) => patch({ sms: event.target.checked })}
        />
        {smsOn ? (
          <Select
            label="SMS Template"
            options={smsOptions}
            value={value?.smsTemplateId ?? ''}
            onChange={(event) =>
              patch({ smsTemplateId: event.target.value || undefined })
            }
          />
        ) : null}
      </div>

      <div className="pd-step-auto-notify__row">
        <LabeledSwitch
          className="pd-step-auto-notify__switch"
          label="Email"
          checked={emailOn}
          onChange={(event) => patch({ email: event.target.checked })}
        />
        {emailOn ? (
          <Select
            label="Email Template"
            options={emailOptions}
            value={value?.emailTemplateId ?? ''}
            onChange={(event) =>
              patch({ emailTemplateId: event.target.value || undefined })
            }
          />
        ) : null}
      </div>
    </section>
  )
}
