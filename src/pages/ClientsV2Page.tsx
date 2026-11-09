import { useNavigate } from 'react-router-dom'
import { LayoutList, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
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
import { countTaskProgress } from '@/pages/clients-v2/demoSeed'
import { useDemoClients } from '@/pages/clients-v2/demoStore'
import '@/styles/layout-clients.css'

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function ClientsV2Page() {
  const navigate = useNavigate()
  const clients = useDemoClients()

  return (
    <div className={`pd-page pd-page--elevated ${elevatedPageClass}`}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Clients v2
        </h1>
        <Badge variant="secondary" className="gap-1 font-normal">
          <LayoutList className="size-3.5" aria-hidden />
          Prototype
        </Badge>
      </div>

      <div className="overflow-auto rounded-xl border bg-card shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={chromeHeadClass}>Client</TableHead>
              <TableHead className={chromeHeadClass}>Mobile</TableHead>
              <TableHead className={chromeHeadClass}>Passport</TableHead>
              <TableHead className={chromeHeadClass}>Services</TableHead>
              <TableHead className={chromeHeadClass}>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const primary = client.services[0]
              const progress = primary
                ? countTaskProgress(primary.tasks)
                : { done: 0, total: 0 }
              return (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/clients-v2/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {initials(client.name) || (
                            <Users className="size-3.5" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">
                        {client.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.mobile}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.passport || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {client.services.map((service) => (
                        <Badge
                          key={service.id}
                          variant="outline"
                          className="font-normal"
                        >
                          {service.name} · {service.country}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {primary
                      ? `${progress.done}/${progress.total}`
                      : '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
