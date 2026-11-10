import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  chromeHeadClass,
  elevatedPageClass,
} from '@/components/clients/shadcnChrome'
import { useCases } from '@/lib/casesStore'
import {
  deriveClientActiveCases,
  deriveClientBalance,
} from '@/lib/clientDerived'
import { groupCasesByClientId } from '@/lib/clientServiceStatus'
import { formatBalance, useClients } from '@/lib/clientsStore'
import { clientV3Path } from '@/lib/workPaths'
import '@/styles/layout-clients.css'

function formatMobile(phone: string) {
  return phone.replace(/\D/g, '')
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ClientsV3Page() {
  const navigate = useNavigate()
  const clients = useClients({ includeArchived: false })
  const cases = useCases()
  const casesByClientId = useMemo(() => groupCasesByClientId(cases), [cases])

  const rows = clients.map((client) => {
    const clientCases = casesByClientId.get(client.id) ?? []
    return {
      client,
      mobile: formatMobile(client.phone),
      passport: client.passport || '—',
      services: deriveClientActiveCases(clientCases),
      balance: formatBalance(deriveClientBalance(clientCases)),
    }
  })

  return (
    <div className={`pd-page pd-page--elevated ${elevatedPageClass}`}>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Clients v3
      </h1>

      <div className="overflow-auto rounded-xl border bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={chromeHeadClass}>Client</TableHead>
              <TableHead className={chromeHeadClass}>Mobile</TableHead>
              <TableHead className={chromeHeadClass}>Passport</TableHead>
              <TableHead className={chromeHeadClass}>Open Services</TableHead>
              <TableHead className={chromeHeadClass}>Balance Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No Clients Yet
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.client.id}
                  className="cursor-pointer"
                  onClick={() => navigate(clientV3Path(row.client.id))}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {row.client.avatarUrl ? (
                          <AvatarImage src={row.client.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {initials(row.client.name) || (
                            <Users className="size-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {row.client.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.mobile}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.passport}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.services}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.balance}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
