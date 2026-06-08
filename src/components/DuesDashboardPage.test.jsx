import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DuesDashboardPage from './DuesDashboardPage'

const fmtGold = (value) => `${Math.round(value).toLocaleString()}g`

function renderPage(overrides = {}) {
  const props = {
    selectedGuild: { id: 'guild-1', name: 'Test Guild', dueScheme: 'monthly', defaultDuesAmount: 2000 },
    entries: [],
    trackedMembers: [],
    mutationPending: false,
    onUpdateGuildDuesSettings: vi.fn().mockResolvedValue(true),
    onUpdateTrackedMember: vi.fn().mockResolvedValue(true),
    fmtGold,
    ...overrides,
  }

  render(<DuesDashboardPage {...props} />)
  return props
}

describe('DuesDashboardPage', () => {
  it('shows an informational message when no guild is selected', () => {
    renderPage({ selectedGuild: null })

    expect(screen.getByText('Select a guild to view dues.')).toBeInTheDocument()
  })

  it('excludes permanently exempt members from expected dues totals', () => {
    renderPage({
      trackedMembers: [
        { id: 'member-1', name: 'Paid Member', duesAmount: 0, useDefaultDues: true, duesExempt: false, isActive: true },
        { id: 'member-2', name: 'Exempt Member', duesAmount: 5000, useDefaultDues: false, duesExempt: true, isActive: true },
      ],
    })

    expect(screen.getByText('Expected: 2,000g')).toBeInTheDocument()
    expect(screen.getByText('Excluded: 1')).toBeInTheDocument()
  })

  it('invokes the guild dues settings handler when the shared scheme changes', async () => {
    const user = userEvent.setup()
    const onUpdateGuildDuesSettings = vi.fn().mockResolvedValue(true)

    renderPage({
      onUpdateGuildDuesSettings,
    })

    await user.click(screen.getByRole('combobox', { name: 'Dues scheme' }))
    await user.click(await screen.findByRole('option', { name: 'Weekly' }))

    expect(onUpdateGuildDuesSettings).toHaveBeenCalledWith({ dueScheme: 'weekly' })
  })

  it('updates the guild default dues amount from the dashboard', async () => {
    const user = userEvent.setup()
    const onUpdateGuildDuesSettings = vi.fn().mockResolvedValue(true)

    renderPage({ onUpdateGuildDuesSettings })

    const defaultField = screen.getByLabelText('Default dues amount')
    await user.click(defaultField)
    await user.keyboard('{Control>}a{/Control}{Backspace}')
    await user.type(defaultField, '3500')
    await user.click(screen.getByRole('button', { name: 'Apply default' }))

    expect(onUpdateGuildDuesSettings).toHaveBeenCalledWith({ defaultDuesAmount: '3500' })
  })

  it('renders recent history dates with slash formatting', () => {
    renderPage({
      entries: [
        {
          id: 'due-1',
          type: 'deposit',
          amount: 2000,
          date: '2025-03-09',
          user: 'Paid Member',
          notes: 'Weekly dues',
          isDue: true,
          isDonation: false,
        },
      ],
    })

    expect(screen.getByText('03/09/2025')).toBeInTheDocument()
  })

  it('shows overdue in red-state rows when dues are partially paid', () => {
    const today = new Date().toISOString().slice(0, 10)

    renderPage({
      entries: [
        {
          id: 'due-1',
          type: 'deposit',
          amount: 500,
          date: today,
          user: 'Alpha',
          notes: 'Partial payment',
          isDue: true,
          isDonation: false,
        },
      ],
      trackedMembers: [
        { id: 'member-1', name: 'Alpha', duesAmount: 0, useDefaultDues: true, duesExempt: false, isActive: true },
      ],
    })

    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('renders dues controls as read-only for viewer access', () => {
    renderPage({ canEdit: false })

    expect(screen.getByText('Viewer access is read-only. Only admins and owners can update dues settings.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply default' })).toBeDisabled()
  })

  it('saves member-specific dues settings from the sorted dues roster', async () => {
    const user = userEvent.setup()
    const onUpdateTrackedMember = vi.fn().mockResolvedValue(true)

    renderPage({
      onUpdateTrackedMember,
      entries: [
        {
          id: 'due-1',
          type: 'deposit',
          amount: 500,
          date: '2025-03-09',
          user: 'Alpha',
          notes: 'Partial payment',
          isDue: true,
          isDonation: false,
        },
      ],
      trackedMembers: [
        { id: 'member-1', name: 'Bravo', duesAmount: 0, useDefaultDues: true, duesExempt: false, isActive: true },
        { id: 'member-2', name: 'Alpha', duesAmount: 0, useDefaultDues: true, duesExempt: false, isActive: true },
      ],
    })

    await user.click(screen.getByRole('button', { name: 'Member' }))

    const firstUseDefaultCheckbox = screen.getAllByRole('checkbox', { name: 'Use guild default' })[0]
    await user.click(firstUseDefaultCheckbox)
    const duesFields = screen.getAllByLabelText('Dues amount')
    await user.clear(duesFields[0])
    await user.type(duesFields[0], '3500')
    await user.click(screen.getAllByRole('button', { name: 'Save dues' })[0])

    await waitFor(() => {
      expect(onUpdateTrackedMember).toHaveBeenCalledWith('member-2', {
        name: 'Alpha',
        duesAmount: '3500',
        useDefaultDues: false,
        duesExempt: false,
        isActive: true,
      })
    })
  })
})