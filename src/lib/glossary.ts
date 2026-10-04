export type GlossaryTerm = {
  term: string
  meaning: string
}

/** Shared product language — Client → Service → Documents. */
export const PRODUCT_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Client',
    meaning:
      'The person. One profile, unique mobile number. Identity (NID, passport) lives here and is reused on every service.',
  },
  {
    term: 'Service',
    meaning:
      'What the client needs — a built-in template (Manpower, Student, Hajj/Umrah, Leisure, Ticketing) or a service you create in Settings. A client can have more than one. Each service file lives on that client profile. The Services sidebar is the agency-wide queue of the same files.',
  },
  {
    term: 'Service template',
    meaning:
      'The checklist, documents, and pricing for a service line. Built-in templates are enabled per agency. In Settings you set status steps and the document checklist for each service you sell.',
  },
  {
    term: 'Status',
    meaning:
      'Operational health of a service: Pending, In progress, On hold, Completed, or Cancelled.',
  },
  {
    term: 'Documents',
    meaning:
      'Identity papers sit on the client. Papers for a service (medical, visa, tickets) sit on that service and unlock as steps advance.',
  },
  {
    term: 'Sub Agent',
    meaning:
      'A referring agency or vendor who sends clients into the pipeline. One sub agent can have many clients.',
  },
  {
    term: 'ID',
    meaning:
      'The record code shown in list tables: sub agent IDs look like AGT-T0001, service IDs like SR-00101. They identify the row; they are not the display name.',
  },
  {
    term: 'Service fee',
    meaning:
      'What the agency charges for a service. Set when the service is opened. The invoice uses this amount.',
  },
  {
    term: 'Balance',
    meaning:
      'Amount still due on a service after payments. The client balance is the sum of open services.',
  },
]

export const JOURNEY_SPINE =
  'Who (Client) → What they need (Service) → Documents and payments on that service.'
