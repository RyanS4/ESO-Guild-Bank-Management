import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDisplayDate, formatDisplayDateTime } from './utils/dateFormatting'
import { buildMemberManagementSnapshot } from './utils/memberDues'

const slugify = (value) =>
  String(value || 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report'

const formatTimestamp = (date = new Date()) => formatDisplayDateTime(date)

const toGold = (value) => Math.round(Number(value) || 0)
const fmtGold = (value) => `${toGold(value).toLocaleString()}g`

const getEntryTypeLabel = (entry) => {
  if (entry.type === 'deposit' && entry.isDonation) {
    return 'Deposit - Donation'
  }
  if (entry.type === 'deposit' && entry.isDue) {
    return 'Deposit - Dues'
  }
  if (entry.type === 'salesTax') {
    return 'Sales Tax'
  }
  if (entry.type === 'withdrawal' && entry.withdrawalCategory) {
    return `Withdrawal - ${entry.withdrawalCategory}`
  }

  return entry.type
}

const createCsvContent = (sections) => {
  const lines = []

  for (const section of sections) {
    lines.push(section.title)

    if (section.headers?.length) {
      lines.push(section.headers.map((value) => escapeCsvCell(value)).join(','))
    }

    for (const row of section.rows) {
      lines.push(row.map((value) => escapeCsvCell(value)).join(','))
    }

    lines.push('')
  }

  return lines.join('\r\n')
}

const escapeCsvCell = (value) => {
  const normalizedValue = value === null || typeof value === 'undefined' ? '' : String(value)
  if (!/[",\r\n]/.test(normalizedValue)) {
    return normalizedValue
  }

  return `"${normalizedValue.replace(/"/g, '""')}"`
}

const downloadBlob = (blob, fileName) => {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}

const downloadCsv = (content, fileName) => {
  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), fileName)
}

const buildLedgerSections = ({ title, guildName, generatedAt, statisticsRows, entries }) => {
  const flattenedStatisticsRows = statisticsRows.map((row) => {
    if (row.isSectionHeader) {
      return [row.section, '', '', '', '', '', '']
    }

    const grandTotal = toGold(row.totals.deposit) + toGold(row.totals.salesTax) - toGold(row.totals.withdrawal)
    const topContributors = row.topDonors?.length
      ? row.topDonors.map((donor) => `#${donor.rank} ${donor.username} (${fmtGold(donor.amount)})`).join(' | ')
      : ''

    return [
      row.section,
      row.label,
      toGold(row.totals.deposit),
      toGold(row.totals.withdrawal),
      toGold(row.totals.salesTax),
      grandTotal,
      topContributors,
    ]
  })

  return [
    {
      title: `${title} Metadata`,
      headers: ['Field', 'Value'],
      rows: [
        ['Guild', guildName],
        ['Generated', generatedAt],
        ['Entry count', entries.length],
      ],
    },
    {
      title: `${title} Statistics`,
      headers: ['Section', 'Range', 'Deposits', 'Withdrawals', 'Sales Tax', 'Grand Total', 'Top Contributors'],
      rows: flattenedStatisticsRows,
    },
    {
      title: `${title} Entries`,
      headers: ['Date', 'Type', 'Member', 'Amount', 'Notes'],
      rows: entries.map((entry) => [
        formatDisplayDate(entry.date),
        getEntryTypeLabel(entry),
        entry.user || '',
        toGold(entry.amount),
        entry.notes || '',
      ]),
    },
  ]
}

const buildMemberManagementSections = ({ title, guildName, generatedAt, snapshot }) => [
  {
    title: `${title} Metadata`,
    headers: ['Field', 'Value'],
    rows: [
      ['Guild', guildName],
      ['Generated', generatedAt],
      ['Dues scheme', snapshot.duesScheme],
      ['Current cycle', snapshot.currentCycle.label],
      ['Default dues amount', toGold(snapshot.defaultDuesAmount)],
    ],
  },
  {
    title: `${title} Summary`,
    headers: ['Expected', 'Collected', 'Outstanding', 'Paid', 'Partial', 'Due', 'Excluded'],
    rows: [[
      toGold(snapshot.summary.expected),
      toGold(snapshot.summary.collected),
      Math.max(toGold(snapshot.summary.expected) - toGold(snapshot.summary.collected), 0),
      snapshot.summary.paidCount,
      snapshot.summary.partialCount,
      snapshot.summary.dueCount,
      snapshot.summary.excludedCount,
    ]],
  },
  {
    title: `${title} Roster`,
    headers: ['Member', 'Status', 'Effective Dues', 'Uses Default', 'Excluded', 'Active', 'Paid This Cycle', 'Outstanding', 'Lifetime Dues', 'Lifetime Donations', 'Last Payment'],
    rows: snapshot.members.map((member) => [
      member.name,
      member.status,
      toGold(member.effectiveDuesAmount),
      member.useDefaultDues ? 'Yes' : 'No',
      member.duesExempt ? 'Yes' : 'No',
      member.isActive ? 'Yes' : 'No',
      toGold(member.cyclePaid),
      toGold(member.outstanding),
      toGold(member.contribution.dues),
      toGold(member.contribution.donations),
      formatDisplayDate(member.contribution.lastPaymentDate),
    ]),
  },
  {
    title: `${title} Recent Dues History`,
    headers: ['Date', 'Member', 'Amount', 'Notes'],
    rows: snapshot.dueHistory.map((entry) => [
      formatDisplayDate(entry.date),
      entry.user || 'Unassigned member',
      toGold(entry.amount),
      entry.notes || '',
    ]),
  },
  {
    title: `${title} Recent Donation History`,
    headers: ['Date', 'Member', 'Amount', 'Notes'],
    rows: snapshot.donationHistory.map((entry) => [
      formatDisplayDate(entry.date),
      entry.user || 'Unassigned member',
      toGold(entry.amount),
      entry.notes || '',
    ]),
  },
]

const renderPdfSections = (doc, reportTitle, sections) => {
  let cursorY = 18

  doc.setFontSize(18)
  doc.text(reportTitle, 14, cursorY)
  cursorY += 10

  for (const section of sections) {
    doc.setFontSize(12)
    doc.text(section.title, 14, cursorY)
    cursorY += 4

    autoTable(doc, {
      startY: cursorY,
      head: section.headers?.length ? [section.headers] : undefined,
      body: section.rows.length ? section.rows : [['No data available']],
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [34, 46, 60],
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { left: 14, right: 14 },
    })

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10
  }
}

const createFileName = (guildName, reportKind, extension) =>
  `${slugify(guildName)}-${slugify(reportKind)}-${new Date().toISOString().slice(0, 10)}.${extension}`

export const exportReportBundle = ({
  format,
  reportKind,
  guildName,
  ledgerData,
  memberManagementData,
}) => {
  const generatedAt = formatTimestamp()
  const normalizedGuildName = guildName || 'Guild Report'

  const sections = []
  if (reportKind === 'ledger' || reportKind === 'full') {
    sections.push(...buildLedgerSections({
      title: reportKind === 'full' ? 'Ledger Report' : 'Ledger Report',
      guildName: normalizedGuildName,
      generatedAt,
      statisticsRows: ledgerData.statisticsRows,
      entries: ledgerData.entries,
    }))
  }

  if (reportKind === 'member-management' || reportKind === 'full') {
    sections.push(...buildMemberManagementSections({
      title: reportKind === 'full' ? 'Member Management Report' : 'Member Management Report',
      guildName: normalizedGuildName,
      generatedAt,
      snapshot: memberManagementData,
    }))
  }

  if (format === 'csv') {
    downloadCsv(createCsvContent(sections), createFileName(normalizedGuildName, reportKind, 'csv'))
    return
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  renderPdfSections(
    doc,
    reportKind === 'full' ? `${normalizedGuildName} Full Report` : `${normalizedGuildName} ${reportKind === 'ledger' ? 'Ledger Report' : 'Member Management Report'}`,
    sections,
  )
  doc.save(createFileName(normalizedGuildName, reportKind, 'pdf'))
}