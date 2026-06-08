import { describe, expect, it } from 'vitest'
import { applyLedgerFilters, getLedgerSavedViewScope, hasActiveLedgerFilters } from './ledgerFilters'

const entries = [
  {
    id: '1',
    type: 'deposit',
    amount: 1000,
    isDue: true,
    isDonation: false,
    withdrawalCategory: '',
    date: '2026-06-01',
    user: 'Alpha',
    notes: 'Weekly due payment',
  },
  {
    id: '2',
    type: 'deposit',
    amount: 2500,
    isDue: false,
    isDonation: true,
    withdrawalCategory: '',
    date: '2026-06-02',
    user: 'Bravo',
    notes: 'Trader support',
  },
  {
    id: '3',
    type: 'withdrawal',
    amount: 5000,
    isDue: false,
    isDonation: false,
    withdrawalCategory: 'traderBid',
    date: '2026-06-03',
    user: 'Officer',
    notes: 'Trader bid paid',
  },
]

describe('ledgerFilters', () => {
  it('filters by date, member, type, and search text together', () => {
    const filteredEntries = applyLedgerFilters(entries, {
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      member: 'Bravo',
      entryType: 'deposit',
      search: 'support',
    })

    expect(filteredEntries).toHaveLength(1)
    expect(filteredEntries[0].id).toBe('2')
  })

  it('filters by deposit subtype and withdrawal category', () => {
    expect(applyLedgerFilters(entries, { depositKind: 'due' }).map((entry) => entry.id)).toEqual(['1'])
    expect(applyLedgerFilters(entries, { depositKind: 'donation' }).map((entry) => entry.id)).toEqual(['2'])
    expect(applyLedgerFilters(entries, { withdrawalCategory: 'traderBid' }).map((entry) => entry.id)).toEqual(['3'])
  })

  it('detects active filters and computes saved-view scopes', () => {
    expect(hasActiveLedgerFilters({ search: '' })).toBe(false)
    expect(hasActiveLedgerFilters({ minAmount: '100' })).toBe(true)
    expect(getLedgerSavedViewScope({ sessionUser: 'blake', guildId: 'guild-1' })).toBe('blake:guild-1')
  })
})