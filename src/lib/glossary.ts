export type GlossaryTerm = {
  term: string
  meaning: string
}

/** Shared product language — Client → Case → Documents. */
export const PRODUCT_GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Client',
    meaning:
      'The person. One profile, unique mobile number. Holds identity (NID, passport) and is the hub for every purpose they bring to the agency.',
  },
  {
    term: 'Case',
    meaning:
      'One purpose or engagement (e.g. Saudi manpower, Canada student). A client can have many cases across verticals.',
  },
  {
    term: 'Vertical',
    meaning:
      'The service line for a case: Manpower, Student, Hajj/Umrah, Leisure, or Ticketing. Each has its own document list.',
  },
  {
    term: 'Status',
    meaning:
      'Operational health of a case: Pending, In progress, On hold, Completed, or Cancelled.',
  },
  {
    term: 'Documents',
    meaning:
      'Required papers and details for a case. Add them from the Documents tab; each document type collects the fields it needs.',
  },
  {
    term: 'Balance',
    meaning:
      'Amount still due on a case. The client balance is the sum of open case balances.',
  },
]

export const JOURNEY_SPINE =
  'Who (Client) → Why (Case) → Documents & payments on that case.'
