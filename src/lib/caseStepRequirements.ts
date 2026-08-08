import type { CaseVertical } from '@/types/case'

export type StepFieldType = 'text' | 'date' | 'textarea' | 'number'

export type StepFieldDef = {
  key: string
  label: string
  type: StepFieldType
  required?: boolean
  placeholder?: string
}

export type StepUploadDef = {
  key: string
  label: string
  required?: boolean
  /** When uploaded, also update this case document to under_review. */
  documentId?: string
}

export type StepRequirement = {
  stepId: string
  /** One-line instruction shown above the form. */
  help: string
  fields: StepFieldDef[]
  uploads: StepUploadDef[]
}

const STUDENT: StepRequirement[] = [
  {
    stepId: 'registered',
    help: 'Confirm intake details before counselling starts.',
    fields: [
      { key: 'preferredCountry', label: 'Preferred country', type: 'text', required: true, placeholder: 'e.g. Canada' },
      { key: 'intakeNotes', label: 'Intake notes', type: 'textarea', required: true, placeholder: 'Goals, budget, timeline' },
    ],
    uploads: [
      { key: 'passportCopy', label: 'Passport copy', required: true, documentId: 'passport' },
    ],
  },
  {
    stepId: 'counselled',
    help: 'Record what was advised in counselling.',
    fields: [
      { key: 'counsellor', label: 'Counselled by', type: 'text', required: true },
      { key: 'recommendedPrograms', label: 'Recommended programs', type: 'textarea', required: true, placeholder: 'Universities / courses discussed' },
      { key: 'counsellingDate', label: 'Counselling date', type: 'date', required: true },
    ],
    uploads: [],
  },
  {
    stepId: 'applied',
    help: 'Enter the university application details and upload proof.',
    fields: [
      { key: 'university', label: 'University name', type: 'text', required: true },
      { key: 'program', label: 'Program / course', type: 'text', required: true },
      { key: 'applicationId', label: 'Application / reference ID', type: 'text', required: true },
      { key: 'appliedOn', label: 'Applied on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'applicationProof', label: 'Application confirmation', required: true },
    ],
  },
  {
    stepId: 'offer',
    help: 'Upload the offer letter and capture key terms.',
    fields: [
      { key: 'university', label: 'University', type: 'text', required: true },
      { key: 'offerType', label: 'Offer type', type: 'text', required: true, placeholder: 'Conditional / Unconditional' },
      { key: 'offerDeadline', label: 'Accept-by date', type: 'date', required: true },
    ],
    uploads: [
      { key: 'offerLetter', label: 'Offer letter', required: true, documentId: 'offer' },
    ],
  },
  {
    stepId: 'visa',
    help: 'Lodge visa details and upload the application pack.',
    fields: [
      { key: 'visaType', label: 'Visa type', type: 'text', required: true, placeholder: 'e.g. Study permit' },
      { key: 'fileNumber', label: 'File / GWF number', type: 'text', required: true },
      { key: 'lodgedOn', label: 'Lodged on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'visaApplication', label: 'Visa application pack', required: true, documentId: 'visa' },
      { key: 'financialProof', label: 'Financial proof', required: true, documentId: 'financial' },
    ],
  },
  {
    stepId: 'ticket',
    help: 'Record ticket details before departure.',
    fields: [
      { key: 'airline', label: 'Airline', type: 'text', required: true },
      { key: 'pnr', label: 'PNR / booking ref', type: 'text', required: true },
      { key: 'departureDate', label: 'Departure date', type: 'date', required: true },
    ],
    uploads: [
      { key: 'eticket', label: 'E-ticket', required: true },
    ],
  },
  {
    stepId: 'departed',
    help: 'Confirm the student has travelled.',
    fields: [
      { key: 'departureConfirmedOn', label: 'Departure date', type: 'date', required: true },
      { key: 'arrivalCity', label: 'Arrival city', type: 'text', required: true },
    ],
    uploads: [
      { key: 'boardingPass', label: 'Boarding pass / arrival proof', required: false },
    ],
  },
]

const MANPOWER: StepRequirement[] = [
  {
    stepId: 'registered',
    help: 'Register the candidate with basic employment intent.',
    fields: [
      { key: 'trade', label: 'Trade / position', type: 'text', required: true, placeholder: 'e.g. Nurse' },
      { key: 'destinationCountry', label: 'Destination country', type: 'text', required: true },
    ],
    uploads: [
      { key: 'passportCopy', label: 'Passport copy', required: true, documentId: 'passport' },
      { key: 'nidCopy', label: 'NID copy', required: true, documentId: 'nid' },
    ],
  },
  {
    stepId: 'shortlisted',
    help: 'Record which demand they were shortlisted against.',
    fields: [
      { key: 'employer', label: 'Employer / demand', type: 'text', required: true },
      { key: 'shortlistedOn', label: 'Shortlisted on', type: 'date', required: true },
    ],
    uploads: [],
  },
  {
    stepId: 'interview',
    help: 'Log interview outcome.',
    fields: [
      { key: 'interviewDate', label: 'Interview date', type: 'date', required: true },
      { key: 'interviewResult', label: 'Result', type: 'text', required: true, placeholder: 'Selected / Pending / Rejected' },
      { key: 'notes', label: 'Notes', type: 'textarea', required: false },
    ],
    uploads: [],
  },
  {
    stepId: 'selected',
    help: 'Confirm selection and attach employer authorization.',
    fields: [
      { key: 'employer', label: 'Employer', type: 'text', required: true },
      { key: 'selectedOn', label: 'Selected on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'demandLetter', label: 'Demand letter', required: true, documentId: 'demand' },
    ],
  },
  {
    stepId: 'medical',
    help: 'Upload medical fitness report.',
    fields: [
      { key: 'clinic', label: 'Clinic / GAMCA centre', type: 'text', required: true },
      { key: 'medicalDate', label: 'Medical date', type: 'date', required: true },
      { key: 'result', label: 'Result', type: 'text', required: true, placeholder: 'Fit / Unfit / Pending' },
    ],
    uploads: [
      { key: 'medicalReport', label: 'Medical fitness report', required: true, documentId: 'medical' },
    ],
  },
  {
    stepId: 'visa',
    help: 'Record visa issuance details.',
    fields: [
      { key: 'visaNumber', label: 'Visa number', type: 'text', required: true },
      { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
      { key: 'expiry', label: 'Visa expiry', type: 'date', required: true },
    ],
    uploads: [
      { key: 'visaCopy', label: 'Visa copy', required: true },
    ],
  },
  {
    stepId: 'clearance',
    help: 'Complete BMET / emigration clearance.',
    fields: [
      { key: 'bmetNumber', label: 'BMET registration no.', type: 'text', required: true },
      { key: 'clearedOn', label: 'Cleared on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'bmetProof', label: 'BMET / clearance proof', required: true, documentId: 'bmet' },
    ],
  },
  {
    stepId: 'ticket',
    help: 'Attach the issued ticket.',
    fields: [
      { key: 'airline', label: 'Airline', type: 'text', required: true },
      { key: 'pnr', label: 'PNR', type: 'text', required: true },
      { key: 'departureDate', label: 'Departure date', type: 'date', required: true },
    ],
    uploads: [
      { key: 'eticket', label: 'E-ticket', required: true },
    ],
  },
  {
    stepId: 'departed',
    help: 'Confirm departure / arrival.',
    fields: [
      { key: 'departedOn', label: 'Departed on', type: 'date', required: true },
      { key: 'arrivalCity', label: 'Arrival city', type: 'text', required: true },
    ],
    uploads: [],
  },
]

const HAJJ: StepRequirement[] = [
  {
    stepId: 'registered',
    help: 'Register the pilgrim for this season.',
    fields: [
      { key: 'packageInterest', label: 'Package interest', type: 'text', required: true, placeholder: 'e.g. Package B — 21 days' },
      { key: 'season', label: 'Season / year', type: 'text', required: true, placeholder: '2026' },
    ],
    uploads: [
      { key: 'passportCopy', label: 'Passport copy', required: true, documentId: 'passport' },
      { key: 'nidCopy', label: 'NID copy', required: true, documentId: 'nid' },
    ],
  },
  {
    stepId: 'package',
    help: 'Confirm the booked package.',
    fields: [
      { key: 'packageName', label: 'Package name', type: 'text', required: true },
      { key: 'operator', label: 'Operator', type: 'text', required: true },
      { key: 'amount', label: 'Package amount (৳)', type: 'number', required: true },
      { key: 'bookedOn', label: 'Booked on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'packageConfirm', label: 'Package confirmation', required: true, documentId: 'package' },
    ],
  },
  {
    stepId: 'medical',
    help: 'Upload vaccination / medical certificate.',
    fields: [
      { key: 'clinic', label: 'Clinic', type: 'text', required: true },
      { key: 'medicalDate', label: 'Date', type: 'date', required: true },
    ],
    uploads: [
      { key: 'vaccineCert', label: 'Vaccination certificate', required: true, documentId: 'vaccine' },
    ],
  },
  {
    stepId: 'visa',
    help: 'Record Hajj/Umrah visa details.',
    fields: [
      { key: 'visaNumber', label: 'Visa number', type: 'text', required: true },
      { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'visaCopy', label: 'Visa copy', required: true, documentId: 'visa' },
    ],
  },
  {
    stepId: 'ticket',
    help: 'Attach travel ticket.',
    fields: [
      { key: 'airline', label: 'Airline', type: 'text', required: true },
      { key: 'pnr', label: 'PNR', type: 'text', required: true },
      { key: 'departureDate', label: 'Departure date', type: 'date', required: true },
    ],
    uploads: [
      { key: 'eticket', label: 'E-ticket', required: true },
    ],
  },
  {
    stepId: 'departed',
    help: 'Confirm departure.',
    fields: [
      { key: 'departedOn', label: 'Departed on', type: 'date', required: true },
    ],
    uploads: [],
  },
]

const LEISURE: StepRequirement[] = [
  {
    stepId: 'enquiry',
    help: 'Capture what the guest wants.',
    fields: [
      { key: 'destination', label: 'Destination', type: 'text', required: true },
      { key: 'guests', label: 'Number of guests', type: 'number', required: true },
      { key: 'travelDates', label: 'Preferred dates', type: 'text', required: true, placeholder: 'e.g. 22–25 Aug' },
      { key: 'notes', label: 'Requirements', type: 'textarea', required: true },
    ],
    uploads: [],
  },
  {
    stepId: 'quote',
    help: 'Share a quote and keep a copy on file.',
    fields: [
      { key: 'quoteAmount', label: 'Quote amount (৳)', type: 'number', required: true },
      { key: 'quotedOn', label: 'Quoted on', type: 'date', required: true },
      { key: 'validUntil', label: 'Valid until', type: 'date', required: true },
    ],
    uploads: [
      { key: 'quotePdf', label: 'Quote PDF / screenshot', required: true },
    ],
  },
  {
    stepId: 'confirmed',
    help: 'Confirm booking details.',
    fields: [
      { key: 'confirmationRef', label: 'Booking reference', type: 'text', required: true },
      { key: 'confirmedOn', label: 'Confirmed on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'itinerary', label: 'Confirmed itinerary', required: true, documentId: 'itinerary' },
    ],
  },
  {
    stepId: 'payment',
    help: 'Record payment received for the booking.',
    fields: [
      { key: 'amountPaid', label: 'Amount paid (৳)', type: 'number', required: true },
      { key: 'paidOn', label: 'Paid on', type: 'date', required: true },
      { key: 'method', label: 'Method', type: 'text', required: true, placeholder: 'Cash / bKash / Bank' },
    ],
    uploads: [
      { key: 'receipt', label: 'Payment receipt', required: true, documentId: 'deposit' },
    ],
  },
  {
    stepId: 'documents',
    help: 'Issue travel docs to the guest.',
    fields: [
      { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'vouchers', label: 'Vouchers / tickets pack', required: true },
    ],
  },
  {
    stepId: 'travelled',
    help: 'Mark the trip as completed.',
    fields: [
      { key: 'travelledOn', label: 'Travel start date', type: 'date', required: true },
      { key: 'feedback', label: 'Feedback (optional)', type: 'textarea', required: false },
    ],
    uploads: [],
  },
]

const TICKETING: StepRequirement[] = [
  {
    stepId: 'request',
    help: 'Capture the ticket request.',
    fields: [
      { key: 'route', label: 'Route', type: 'text', required: true, placeholder: 'DAC–JED' },
      { key: 'travelDate', label: 'Travel date', type: 'date', required: true },
      { key: 'passengers', label: 'Passengers', type: 'number', required: true },
    ],
    uploads: [
      { key: 'passportCopy', label: 'Passport copy', required: true, documentId: 'passport' },
    ],
  },
  {
    stepId: 'quoted',
    help: 'Record the fare quoted to the client.',
    fields: [
      { key: 'airline', label: 'Airline', type: 'text', required: true },
      { key: 'fare', label: 'Fare (৳)', type: 'number', required: true },
      { key: 'quotedOn', label: 'Quoted on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'fareScreenshot', label: 'Fare quote screenshot', required: true },
    ],
  },
  {
    stepId: 'payment',
    help: 'Confirm ticket payment before issuance.',
    fields: [
      { key: 'amountPaid', label: 'Amount paid (৳)', type: 'number', required: true },
      { key: 'paidOn', label: 'Paid on', type: 'date', required: true },
      { key: 'method', label: 'Method', type: 'text', required: true },
    ],
    uploads: [
      { key: 'receipt', label: 'Payment proof', required: true, documentId: 'payment' },
    ],
  },
  {
    stepId: 'issued',
    help: 'Upload the issued e-ticket.',
    fields: [
      { key: 'pnr', label: 'PNR', type: 'text', required: true },
      { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
    ],
    uploads: [
      { key: 'eticket', label: 'E-ticket', required: true, documentId: 'ticket' },
    ],
  },
  {
    stepId: 'travelled',
    help: 'Confirm the passenger travelled.',
    fields: [
      { key: 'travelledOn', label: 'Travel date', type: 'date', required: true },
    ],
    uploads: [],
  },
]

const BY_VERTICAL: Record<CaseVertical, StepRequirement[]> = {
  Student: STUDENT,
  Manpower: MANPOWER,
  'Hajj/Umrah': HAJJ,
  Leisure: LEISURE,
  Ticketing: TICKETING,
}

export function getStepRequirements(vertical: CaseVertical): StepRequirement[] {
  return BY_VERTICAL[vertical]
}

export function getStepRequirement(
  vertical: CaseVertical,
  stepId: string,
): StepRequirement | undefined {
  return BY_VERTICAL[vertical].find((item) => item.stepId === stepId)
}

/** Find which step collects a given case document (via upload.documentId). */
export function findStepForDocument(
  vertical: CaseVertical,
  documentId: string,
): { requirement: StepRequirement; uploadKey: string } | undefined {
  for (const requirement of BY_VERTICAL[vertical]) {
    const upload = requirement.uploads.find(
      (item) => item.documentId === documentId,
    )
    if (upload) {
      return { requirement, uploadKey: upload.key }
    }
  }
  return undefined
}

export type StepUploadValue = {
  key: string
  fileName: string
}

export type StepCompletionInput = {
  fields: Record<string, string>
  uploads: StepUploadValue[]
}

export type StepValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> }

export function validateStepCompletion(
  requirement: StepRequirement,
  input: StepCompletionInput,
): StepValidationResult {
  const errors: Record<string, string> = {}

  for (const field of requirement.fields) {
    if (!field.required) continue
    const value = (input.fields[field.key] ?? '').trim()
    if (!value) {
      errors[field.key] = `${field.label} is required.`
    }
  }

  for (const upload of requirement.uploads) {
    if (!upload.required) continue
    const found = input.uploads.find((item) => item.key === upload.key)
    if (!found?.fileName.trim()) {
      errors[`upload:${upload.key}`] = `${upload.label} is required.`
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true }
}

export function summarizeStepCompletion(
  requirement: StepRequirement,
  input: StepCompletionInput,
): string {
  const parts: string[] = []
  for (const field of requirement.fields) {
    const value = (input.fields[field.key] ?? '').trim()
    if (value) parts.push(`${field.label}: ${value}`)
  }
  for (const upload of input.uploads) {
    if (upload.fileName) parts.push(`${upload.key}: ${upload.fileName}`)
  }
  return parts.slice(0, 3).join(' · ') || 'Completed'
}
