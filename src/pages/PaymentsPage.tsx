import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Receipt, Users, Wallet } from 'lucide-react'
import { StatCards } from '@/components/StatCards'
import {
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { useCases } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { formatPaymentAmount, usePayments } from '@/lib/paymentsStore'
import { workDetailPath } from '@/lib/workPaths'
import '@/styles/layout-ops.css'

type PaymentStatId = 'all' | 'collected' | 'clients' | 'due'

function isOpenService(status: string): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

export default function PaymentsPage() {
  const payments = usePayments()
  const cases = useCases()
  const [selectedStat, setSelectedStat] = useState<PaymentStatId>('all')

  const casesById = useMemo(
    () => new Map(cases.map((item) => [item.id, item])),
    [cases],
  )

  const stats = useMemo(() => {
    let collected = 0
    const payingClients = new Set<string>()
    for (const payment of payments) {
      collected += payment.amount
      payingClients.add(payment.clientId)
    }
    let outstanding = 0
    for (const item of cases) {
      if (isOpenService(item.status)) outstanding += item.balance
    }
    return {
      total: payments.length,
      collected,
      payingClients: payingClients.size,
      outstanding,
    }
  }, [payments, cases])

  const filtered = payments.filter((payment) => {
    if (selectedStat !== 'due') return true
    const caseItem = casesById.get(payment.caseId)
    return Boolean(
      caseItem && isOpenService(caseItem.status) && caseItem.balance > 0,
    )
  })

  const selectStat = (id: string) => {
    const next = id as PaymentStatId
    setSelectedStat(next === selectedStat ? 'all' : next)
  }

  return (
    <div className="pd-page pd-ops" aria-label="Payments">
      <StatCards
        label="Payment stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'all',
            label: 'Total payments',
            value: String(stats.total),
            icon: Receipt,
          },
          {
            id: 'collected',
            label: 'Collected',
            value: formatBdt(stats.collected),
            icon: Banknote,
          },
          {
            id: 'clients',
            label: 'Paying clients',
            value: String(stats.payingClients),
            icon: Users,
          },
          {
            id: 'due',
            label: 'Outstanding',
            value: formatBdt(stats.outstanding),
            icon: Wallet,
          },
        ]}
      />
      {filtered.length === 0 ? (
        <EmptyState
          title={payments.length === 0 ? 'No payments yet' : 'No matching payments'}
          description={
            payments.length === 0
              ? 'Record a payment from a client or service file.'
              : 'Try another stat card to see more collections.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => {
              const client = getClientById(payment.clientId)
              const caseItem = casesById.get(payment.caseId)
              return (
                <TableRow key={payment.id}>
                  <TableCell>{payment.createdAt}</TableCell>
                  <TableCell>
                    <Link to={`/clients/${payment.clientId}`}>
                      {client?.name ?? payment.clientId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={workDetailPath({
                        id: payment.caseId,
                        clientId: payment.clientId,
                      })}
                    >
                      {caseItem?.service ?? 'Service'}
                    </Link>
                  </TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{formatPaymentAmount(payment.amount)}</TableCell>
                  <TableCell>{payment.note || '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
