import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import {
  elevatedPageClass,
  pureWhiteFieldClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { ServiceTaskList } from '@/pages/clients-v2/ServiceTaskList'
import {
  toggleDemoSubtask,
  toggleDemoTask,
  useDemoClients,
} from '@/pages/clients-v2/demoStore'
import '@/styles/layout-clients.css'

export default function ClientsV2DetailPage() {
  const { id } = useParams<{ id: string }>()
  const clients = useDemoClients()
  const client = useMemo(
    () => clients.find((item) => item.id === id),
    [clients, id],
  )
  const [serviceId, setServiceId] = useState<string | null>(null)

  if (!id || !client) {
    return <Navigate to="/clients-v2" replace />
  }

  const activeServiceId = serviceId ?? client.services[0]?.id ?? null
  const activeService =
    client.services.find((service) => service.id === activeServiceId) ?? null

  return (
    <div className={`pd-page pd-page--elevated ${elevatedPageClass}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 rounded-lg shadow-xs"
        >
          <Link to="/clients-v2">
            <ArrowLeft data-icon="inline-start" />
            Clients v2
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {client.name}
        </h1>
        <Badge variant="secondary" className="font-normal">
          Prototype
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-foreground">Profile</p>
            <p className="mt-1 text-sm text-muted-foreground">{client.mobile}</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-passport">Passport</Label>
              <Input
                id="demo-passport"
                className={pureWhiteFieldClass}
                value={client.passport}
                readOnly
                placeholder="Fills from Upload passport"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-passport-expiry">Passport Expiry</Label>
              <Input
                id="demo-passport-expiry"
                className={pureWhiteFieldClass}
                value={client.passportExpiry}
                readOnly
                placeholder="Fills from Upload passport"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Services</p>
            <div className="flex flex-col gap-1.5">
              {client.services.map((service) => {
                const active = service.id === activeServiceId
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setServiceId(service.id)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/5 font-medium text-foreground'
                        : 'border-border bg-[var(--color-surface)] text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="block">{service.name}</span>
                    <span className="block text-xs opacity-80">
                      {service.country}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {activeService ? (
            <ServiceTaskList
              serviceName={activeService.name}
              country={activeService.country}
              tasks={activeService.tasks}
              onToggleTask={(taskId, done) =>
                toggleDemoTask(client.id, activeService.id, taskId, done)
              }
              onToggleSubtask={(taskId, subtaskId, done) =>
                toggleDemoSubtask(
                  client.id,
                  activeService.id,
                  taskId,
                  subtaskId,
                  done,
                )
              }
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
              No Services Yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
