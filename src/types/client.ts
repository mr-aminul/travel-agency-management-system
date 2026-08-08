export type ClientStatus = 'Active' | 'Deployed' | 'Lead' | 'Inactive'

/** Aligned with case verticals — one glossary across Clients and Cases. */
export type ServiceType =
  | 'Manpower'
  | 'Student'
  | 'Hajj/Umrah'
  | 'Leisure'
  | 'Ticketing'

export type Client = {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  nid?: string
  passport?: string
  avatarUrl?: string
  /** Verticals this client has engaged — derived from cases + intake choice. */
  services: ServiceType[]
  /** Sum of open case balances — derived from cases. */
  balance: number
  /** Count of non-completed/cancelled cases — derived from cases. */
  activeCases: number
  status: ClientStatus
  idChecked: boolean
  createdAt: string
}

export type CreateClientInput = {
  name: string
  phone: string
  email?: string
  address?: string
  nid?: string
  passport?: string
  primaryService: ServiceType
  idChecked: boolean
  /** When true, UI should immediately open a first case. */
  openFirstCase?: boolean
}

export type UpdateClientInput = Partial<Omit<Client, 'id' | 'createdAt'>>
