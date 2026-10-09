import { useEffect, useMemo, useState } from 'react'
import { useClientMessages } from '@/lib/clientMessagesStore'
import {
  fetchInboundSms,
  inboundToThreadMessages,
} from '@/lib/smsInboundApi'
import type { ClientThreadMessage } from '@/types/clientMessage'

/**
 * Local SMS notes (outbound drafts) merged with SMSQ inbound webhook messages.
 */
export function useClientSmsThread(clientId: string): ClientThreadMessage[] {
  const local = useClientMessages(clientId, 'sms')
  const [inbound, setInbound] = useState<ClientThreadMessage[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const rows = await fetchInboundSms({ clientId, limit: 100 })
        if (cancelled) return
        setInbound(inboundToThreadMessages(rows, clientId))
      } catch {
        if (!cancelled) setInbound([])
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [clientId])

  return useMemo(() => {
    const byId = new Map<string, ClientThreadMessage>()
    for (const item of local) byId.set(item.id, item)
    for (const item of inbound) byId.set(item.id, item)
    return [...byId.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }, [local, inbound])
}
