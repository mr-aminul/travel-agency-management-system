import {
  DEFAULT_BRAND_NAME,
  readAgencyProfile,
} from '@/lib/agencyProfile'
import { templateCountry } from '@/lib/caseChecklist'
import {
  buildBrandedEmailHtml,
} from '@/lib/brandedEmailHtml'
import { sendClientEmailViaApi } from '@/lib/clientEmailApi'
import { sendClientMessage } from '@/lib/clientMessagesStore'
import { getClientById } from '@/lib/clientsStore'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { fillSmsTemplate } from '@/lib/smsTemplateFill'
import { getSmsTemplateById } from '@/lib/smsTemplatesStore'
import { sendClientSmsViaApi } from '@/lib/smsInboundApi'
import type { Case } from '@/types/case'
import type { ServiceStepConfig } from '@/types/serviceTemplate'

const DEFAULT_STATUS_BODY =
  'Dear {{name}}, your {{serviceName}} file is now at: {{statusLabel}}. Client ID: {{clientId}}. — {{agencyName}}'

function emailSubjectForAgency(agencyName: string, plainBody: string): string {
  const brand = agencyName.trim() || 'your agency'
  const firstLine = plainBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
  if (firstLine && firstLine.length <= 80 && !/^dear\b/i.test(firstLine)) {
    return firstLine
  }
  return `Update from ${brand}`
}

function stepConfigForCase(
  item: Case,
  stepId: string,
): ServiceStepConfig | undefined {
  return resolveServiceTemplate(
    item.service,
    templateCountry(item) ?? '',
  ).steps.find((step) => step.id === stepId)
}

/**
 * Fire-and-forget SMS/email when a client file enters a pipeline status
 * that has auto-notify enabled in the service catalog.
 */
export async function notifyCaseEnteredStep(
  item: Case,
  stepId: string,
): Promise<void> {
  const step = stepConfigForCase(item, stepId)
  const notify = step?.autoNotify
  if (!notify?.sms && !notify?.email) return

  const client = getClientById(item.clientId)
  if (!client) return

  const agency = readAgencyProfile(item.tenantId)
  const agencyName = agency.businessName.trim() || DEFAULT_BRAND_NAME
  const fillContext = {
    client,
    agencyName,
    serviceName: item.service,
    statusLabel: step?.label ?? stepId,
  }

  if (notify.sms && client.phone?.trim()) {
    const template = notify.smsTemplateId
      ? getSmsTemplateById(notify.smsTemplateId, item.tenantId)
      : undefined
    const bodySource =
      template?.channel === 'sms' ? template.body : DEFAULT_STATUS_BODY
    const body = fillSmsTemplate(bodySource, fillContext).trim()
    if (body) {
      try {
        await sendClientSmsViaApi({ clientId: client.id, body })
        sendClientMessage({
          clientId: client.id,
          channel: 'sms',
          body,
        })
      } catch (error) {
        console.warn('[auto-notify] SMS failed', error)
      }
    }
  }

  if (notify.email && client.email?.trim()) {
    const template = notify.emailTemplateId
      ? getSmsTemplateById(notify.emailTemplateId, item.tenantId)
      : undefined
    const bodySource =
      template?.channel === 'email' ? template.body : DEFAULT_STATUS_BODY
    const plain = fillSmsTemplate(bodySource, fillContext).trim()
    if (plain) {
      const html = buildBrandedEmailHtml({
        body: plain,
        agency,
        recipientName: client.name,
      })
      const subject = emailSubjectForAgency(agencyName, plain)
      try {
        await sendClientEmailViaApi({
          clientId: client.id,
          subject,
          text: plain,
          html,
        })
        sendClientMessage({
          clientId: client.id,
          channel: 'email',
          body: html,
        })
      } catch (error) {
        console.warn('[auto-notify] email failed', error)
      }
    }
  }
}

/** Schedule auto-notify without blocking the case update. */
export function scheduleCaseStepAutoNotify(
  item: Case,
  stepId: string,
): void {
  void notifyCaseEnteredStep(item, stepId)
}
