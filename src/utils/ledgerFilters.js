export const defaultLedgerFilters = {
  search: '',
  member: '',
  minAmount: '',
  maxAmount: '',
  entryType: 'all',
  depositKind: 'all',
  withdrawalCategory: 'all',
}

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const getEntryTypeLabel = (entry) => {
  if (entry.type === 'salesTax') {
    return 'sales tax'
  }

  if (entry.type === 'withdrawal') {
    return 'withdrawal'
  }

  if (entry.isDue) {
    return 'deposit dues'
  }

  if (entry.isDonation) {
    return 'deposit donation'
  }

  return 'deposit'
}

const matchesSearch = (entry, search) => {
  if (!search) {
    return true
  }

  const haystack = [
    entry.user,
    entry.notes,
    entry.withdrawalCategory,
    getEntryTypeLabel(entry),
  ]
    .map(normalizeValue)
    .join(' ')

  return haystack.includes(search)
}

const matchesDepositKind = (entry, depositKind) => {
  if (depositKind === 'all') {
    return true
  }

  if (entry.type !== 'deposit') {
    return false
  }

  if (depositKind === 'due') {
    return Boolean(entry.isDue)
  }

  if (depositKind === 'donation') {
    return Boolean(entry.isDonation)
  }

  if (depositKind === 'standard') {
    return !entry.isDue && !entry.isDonation
  }

  return true
}

const matchesWithdrawalCategory = (entry, withdrawalCategory) => {
  if (withdrawalCategory === 'all') {
    return true
  }

  return entry.type === 'withdrawal' && entry.withdrawalCategory === withdrawalCategory
}

export const applyLedgerFilters = (entries, filters) => {
  const search = normalizeValue(filters?.search)
  const member = normalizeValue(filters?.member)
  const minAmount = Number(filters?.minAmount)
  const maxAmount = Number(filters?.maxAmount)
  const hasMinAmount = filters?.minAmount !== '' && Number.isFinite(minAmount)
  const hasMaxAmount = filters?.maxAmount !== '' && Number.isFinite(maxAmount)
  const startDate = String(filters?.startDate || '')
  const endDate = String(filters?.endDate || '')
  const entryType = filters?.entryType || 'all'
  const depositKind = filters?.depositKind || 'all'
  const withdrawalCategory = filters?.withdrawalCategory || 'all'

  return entries.filter((entry) => {
    const amount = Number(entry.amount) || 0

    if (startDate && entry.date < startDate) {
      return false
    }

    if (endDate && entry.date > endDate) {
      return false
    }

    if (member && normalizeValue(entry.user) !== member) {
      return false
    }

    if (entryType !== 'all' && entry.type !== entryType) {
      return false
    }

    if (!matchesDepositKind(entry, depositKind)) {
      return false
    }

    if (!matchesWithdrawalCategory(entry, withdrawalCategory)) {
      return false
    }

    if (hasMinAmount && amount < minAmount) {
      return false
    }

    if (hasMaxAmount && amount > maxAmount) {
      return false
    }

    if (!matchesSearch(entry, search)) {
      return false
    }

    return true
  })
}

export const hasActiveLedgerFilters = (filters) =>
  Object.entries(defaultLedgerFilters).some(([key, value]) => (filters?.[key] ?? value) !== value) ||
  Boolean(filters?.startDate) ||
  Boolean(filters?.endDate)

export const getLedgerSavedViewScope = ({ sessionUser, guildId }) =>
  `${sessionUser || 'guest'}:${guildId || 'guest-ledger'}`