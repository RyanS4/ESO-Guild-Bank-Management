import { formatDisplayDate } from './dateFormatting'

const EST_TIME_ZONE = 'America/New_York'
const EST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: EST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const toMemberKey = (value) => String(value || '').trim().toLowerCase()

const getCurrentEstDateParts = () => {
  const parts = EST_DATE_FORMATTER.formatToParts(new Date())
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  }
}

const createUtcDate = ({ year, month, day }) => new Date(Date.UTC(year, month - 1, day))

const toIsoDate = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

const addDays = (date, amount) => {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + amount)
  return nextDate
}

export const getMonthlyCycle = () => {
  const { year, month } = getCurrentEstDateParts()
  const startDate = createUtcDate({ year, month, day: 1 })
  const endDate = new Date(Date.UTC(year, month, 0))
  const startDateIso = toIsoDate(startDate)
  const endDateIso = toIsoDate(endDate)

  return {
    startDate: startDateIso,
    endDate: endDateIso,
    label: `${formatDisplayDate(startDateIso)} - ${formatDisplayDate(endDateIso)}`,
  }
}

export const getWeeklyCycle = () => {
  const today = createUtcDate(getCurrentEstDateParts())
  const startDate = addDays(today, -today.getUTCDay())
  const endDate = addDays(startDate, 6)
  const startDateIso = toIsoDate(startDate)
  const endDateIso = toIsoDate(endDate)

  return {
    startDate: startDateIso,
    endDate: endDateIso,
    label: `${formatDisplayDate(startDateIso)} - ${formatDisplayDate(endDateIso)}`,
  }
}

export const getCycleForScheme = (dueScheme) =>
  dueScheme === 'weekly' ? getWeeklyCycle() : getMonthlyCycle()

const toGold = (value) => Math.round(Number(value) || 0)

export const buildMemberManagementSnapshot = ({ entries, trackedMembers, selectedGuild }) => {
  const duesScheme = selectedGuild?.dueScheme === 'weekly' ? 'weekly' : 'monthly'
  const defaultDuesAmount = Number(selectedGuild?.defaultDuesAmount) || 0
  const currentCycle = getCycleForScheme(duesScheme)
  const dueEntries = entries.filter((entry) => entry.type === 'deposit' && entry.isDue)
  const donationEntries = entries.filter((entry) => entry.type === 'deposit' && entry.isDonation)

  const lifetimeContributionTotals = new Map()
  for (const entry of entries) {
    if (entry.type !== 'deposit') {
      continue
    }

    const key = toMemberKey(entry.user)
    const previous = lifetimeContributionTotals.get(key) || {
      dues: 0,
      donations: 0,
      deposits: 0,
      lastPaymentDate: '',
    }
    lifetimeContributionTotals.set(key, {
      dues: previous.dues + (entry.isDue ? toGold(entry.amount) : 0),
      donations: previous.donations + (entry.isDonation ? toGold(entry.amount) : 0),
      deposits: previous.deposits + toGold(entry.amount),
      lastPaymentDate: previous.lastPaymentDate > entry.date ? previous.lastPaymentDate : entry.date,
    })
  }

  const members = trackedMembers.map((member) => {
    const cyclePaid = dueEntries.reduce((total, entry) => {
      if (entry.date < currentCycle.startDate || entry.date > currentCycle.endDate) {
        return total
      }

      return toMemberKey(entry.user) === toMemberKey(member.name) ? total + toGold(entry.amount) : total
    }, 0)
    const effectiveDuesAmount = member.useDefaultDues ? defaultDuesAmount : toGold(member.duesAmount)
    const totalExpected = member.duesExempt || !member.isActive ? 0 : effectiveDuesAmount
    const contribution = lifetimeContributionTotals.get(toMemberKey(member.name)) || {
      dues: 0,
      donations: 0,
      deposits: 0,
      lastPaymentDate: '',
    }

    const status = !member.isActive
      ? 'Inactive'
      : member.duesExempt
        ? 'Excluded'
        : totalExpected <= 0
          ? 'No dues set'
          : cyclePaid >= totalExpected
            ? 'Paid'
            : cyclePaid > 0
              ? 'Partial'
              : 'Due'

    return {
      ...member,
      cyclePaid,
      effectiveDuesAmount,
      totalExpected,
      outstanding: Math.max(totalExpected - cyclePaid, 0),
      status,
      contribution,
    }
  })

  const summary = {
    expected: members.reduce(
      (total, member) => total + (member.isActive && !member.duesExempt ? member.totalExpected : 0),
      0,
    ),
    collected: members.reduce((total, member) => total + member.cyclePaid, 0),
    paidCount: members.filter((member) => member.status === 'Paid').length,
    partialCount: members.filter((member) => member.status === 'Partial').length,
    dueCount: members.filter((member) => member.status === 'Due').length,
    excludedCount: members.filter((member) => member.status === 'Excluded').length,
  }

  return {
    duesScheme,
    defaultDuesAmount,
    currentCycle,
    members,
    summary,
    dueHistory: [...dueEntries].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 8),
    donationHistory: [...donationEntries].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 8),
  }
}