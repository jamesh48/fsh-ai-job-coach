// Shared utility functions

/** Strip common AI typographic "sniff" characters from a string. */
export function sanitizeAiText(text: string): string {
  return text
    .replace(/\u2014/g, ' - ') // em dash —
    .replace(/\u2013/g, ' - ') // en dash –
    .replace(/\u2018|\u2019/g, "'") // curly apostrophes ' '
    .replace(/\u201C|\u201D/g, '"') // curly quotes " "
    .replace(/\u2026/g, '...') // ellipsis …
    .replace(/\u2212/g, '-') // minus sign −
    .replace(/\u00A0|\u202F/g, ' ') // non-breaking + narrow no-break space
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '') // zero-width characters
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
