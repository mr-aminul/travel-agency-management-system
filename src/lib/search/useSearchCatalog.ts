import { useMemo } from 'react'
import { useClients } from '@/lib/clientsStore'
import { useCases } from '@/lib/casesStore'
import { useEmployees } from '@/lib/employeesStore'
import { useSubAgents } from '@/lib/subAgentsStore'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import { buildSearchCatalog } from './catalog'
import type { SearchItem } from './types'

export function useSearchCatalog(): SearchItem[] {
  const { user } = useAuth()
  const tenant = useActiveTenant()
  const clients = useClients()
  const cases = useCases()
  const subAgents = useSubAgents()
  const employees = useEmployees()

  return useMemo(
    () =>
      buildSearchCatalog({
        user: user ? { name: user.name, role: user.role } : null,
        enabledModules: tenant.enabledModules,
        clients,
        cases,
        subAgents,
        employees,
      }),
    [user, tenant.enabledModules, clients, cases, subAgents, employees],
  )
}
