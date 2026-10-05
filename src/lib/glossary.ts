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
      'What the client needs — Tourist Visa, Student Visa, Work Permit Visa, Hajj/Umrah Visa, Medical Visa, Air Ticket, Hotel Booking, Tour Package, or a line you add in Settings → Service catalog. Each file lives on that client. The Services sidebar is the agency-wide queue of the same files.',
  },
  {
    term: 'Service template',
    meaning:
      'The status journey and documents for a catalog line. Open Settings → Service catalog, then a service, to edit the checklist. New files pick up what you save. Add a country when that destination needs a different journey or documents.',
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
