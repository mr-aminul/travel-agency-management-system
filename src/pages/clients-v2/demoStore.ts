import { useSyncExternalStore } from 'react'
import {
  createDemoClients,
  withParentDoneFromSubtasks,
  type DemoClient,
  type DemoSyncField,
  type DemoTask,
} from '@/pages/clients-v2/demoSeed'

let clients: DemoClient[] = createDemoClients()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return clients
}

export function useDemoClients(): DemoClient[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getDemoClient(id: string): DemoClient | undefined {
  return clients.find((client) => client.id === id)
}

function patchClient(
  clientId: string,
  updater: (client: DemoClient) => DemoClient,
) {
  clients = clients.map((client) =>
    client.id === clientId ? updater(client) : client,
  )
  emit()
}

function applySyncFields(
  client: DemoClient,
  subtasks: { syncField?: DemoSyncField; fillValue?: string; done: boolean }[],
): DemoClient {
  let next = client
  for (const sub of subtasks) {
    if (!sub.done || !sub.syncField || !sub.fillValue) continue
    next = { ...next, [sub.syncField]: sub.fillValue }
  }
  return next
}

function mapServiceTasks(
  client: DemoClient,
  serviceId: string,
  mapTasks: (tasks: DemoTask[]) => DemoTask[],
): DemoClient {
  return {
    ...client,
    services: client.services.map((service) => {
      if (service.id !== serviceId) return service
      return { ...service, tasks: mapTasks(service.tasks) }
    }),
  }
}

export function toggleDemoTask(
  clientId: string,
  serviceId: string,
  taskId: string,
  done: boolean,
) {
  patchClient(clientId, (client) => {
    let next = mapServiceTasks(client, serviceId, (tasks) =>
      tasks.map((task) => {
        if (task.id !== taskId) return task
        const subtasks = task.subtasks.map((sub) => ({ ...sub, done }))
        return withParentDoneFromSubtasks({ ...task, done, subtasks })
      }),
    )
    const service = next.services.find((item) => item.id === serviceId)
    const task = service?.tasks.find((item) => item.id === taskId)
    if (task) next = applySyncFields(next, task.subtasks)
    return next
  })
}

export function toggleDemoSubtask(
  clientId: string,
  serviceId: string,
  taskId: string,
  subtaskId: string,
  done: boolean,
) {
  patchClient(clientId, (client) => {
    let next = mapServiceTasks(client, serviceId, (tasks) =>
      tasks.map((task) => {
        if (task.id !== taskId) return task
        const subtasks = task.subtasks.map((sub) =>
          sub.id === subtaskId ? { ...sub, done } : sub,
        )
        return withParentDoneFromSubtasks({ ...task, subtasks })
      }),
    )
    const service = next.services.find((item) => item.id === serviceId)
    const task = service?.tasks.find((item) => item.id === taskId)
    const sub = task?.subtasks.find((item) => item.id === subtaskId)
    if (sub) next = applySyncFields(next, [sub])
    return next
  })
}

/** Reset demo data (optional; unused in UI for now). */
export function resetDemoClients() {
  clients = createDemoClients()
  emit()
}
