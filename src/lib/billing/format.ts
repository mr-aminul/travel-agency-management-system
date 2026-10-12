export function formatBdt(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0
  return `৳${Math.round(n).toLocaleString('en-BD')}`
}

export function formatStorageBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const trim = (value: number) => Number(value.toFixed(digits)).toString()
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 ** 2) return `${trim(bytes / 1024)} KB`
  if (bytes < 1024 ** 3) return `${trim(bytes / 1024 ** 2)} MB`
  return `${trim(bytes / 1024 ** 3)} GB`
}

export function formatStorageUsage(usedBytes: number, limitBytes: number): string {
  const safeUsed = Number.isFinite(usedBytes) && usedBytes > 0 ? usedBytes : 0
  const safeLimit = Number.isFinite(limitBytes) && limitBytes > 0 ? limitBytes : 0
  const unit =
    safeLimit >= 1024 ** 3
      ? { suffix: 'GB', bytes: 1024 ** 3 }
      : safeLimit >= 1024 ** 2
        ? { suffix: 'MB', bytes: 1024 ** 2 }
        : { suffix: 'KB', bytes: 1024 }
  const trim = (value: number, d: number) => Number(value.toFixed(d)).toString()
  return `${trim(safeUsed / unit.bytes, 2)} / ${trim(safeLimit / unit.bytes, 1)} ${unit.suffix}`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000))
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'trial':
      return 'Trial'
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past due'
    case 'suspended':
      return 'Suspended'
    case 'canceled':
      return 'Canceled'
    case 'open':
      return 'Awaiting payment'
    case 'pending_review':
      return 'Pending review'
    case 'paid':
      return 'Paid'
    case 'void':
      return 'Void'
    default:
      return status
  }
}
