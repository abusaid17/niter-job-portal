export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d)
    ? '—'
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatMoney(value) {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? `৳${n.toLocaleString('en-US')}` : null
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}