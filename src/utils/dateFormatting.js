export const formatDisplayDate = (value) => {
  if (!value) {
    return ''
  }

  const normalizedValue = String(value)
  const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return `${month}/${day}/${year}`
  }

  const parsed = new Date(normalizedValue)
  if (Number.isNaN(parsed.getTime())) {
    return normalizedValue
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export const formatDisplayDateTime = (value) => {
  if (!value) {
    return 'Unknown time'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}