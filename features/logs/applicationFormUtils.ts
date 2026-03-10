export interface JobApplicationEntry {
  jobTitle: string
  company: string
  applicationUrl: string
  source: string
  recruiter: string
  recruiterLinkedin: string
  recruiterPhone: string
  recruiterEmail: string
  workArrangement: string
  roleDescription: string
  impression: string
  priority: 'quick_apply' | 'standard' | 'strong_interest' | 'hot_lead'
  status: 'applied' | 'recruiter_screen' | 'interviewing' | 'offer' | 'rejected'
}

export interface ParsedContent {
  notes: string
  applications: JobApplicationEntry[]
}

export const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'On-site']

export const STATUS_LABELS: Record<JobApplicationEntry['status'], string> = {
  applied: 'Applied',
  recruiter_screen: 'Recruiter Screen',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const PRIORITY_LABELS: Record<JobApplicationEntry['priority'], string> =
  {
    quick_apply: 'Quick Apply (low effort, low expectations)',
    standard: 'Standard',
    strong_interest: 'Strong Interest (tailored application)',
    hot_lead: 'Hot Lead (referral or high-priority target)',
  }

export const EMPTY_APPLICATION: JobApplicationEntry = {
  jobTitle: '',
  company: '',
  applicationUrl: '',
  source: '',
  recruiter: '',
  recruiterLinkedin: '',
  recruiterPhone: '',
  recruiterEmail: '',
  workArrangement: '',
  roleDescription: '',
  impression: '',
  priority: 'quick_apply',
  status: 'applied',
}

export function serializeToContent(values: ParsedContent): string {
  const parts: string[] = []

  if (values.notes.trim()) {
    parts.push(values.notes.trim())
  }

  if (values.applications.length > 0) {
    const appLines = values.applications.map((app, i) => {
      const lines = [`${i + 1}. ${app.jobTitle} :: ${app.company}`]
      lines.push(`   Priority: ${PRIORITY_LABELS[app.priority]}`)
      lines.push(`   Status: ${STATUS_LABELS[app.status]}`)
      if (app.applicationUrl)
        lines.push(`   Application URL: ${app.applicationUrl}`)
      if (app.source) lines.push(`   Source: ${app.source}`)
      if (app.workArrangement)
        lines.push(`   Work arrangement: ${app.workArrangement}`)
      if (app.recruiter) lines.push(`   Recruiter: ${app.recruiter}`)
      if (app.recruiterLinkedin)
        lines.push(`   Recruiter LinkedIn: ${app.recruiterLinkedin}`)
      if (app.recruiterPhone)
        lines.push(`   Recruiter phone: ${app.recruiterPhone}`)
      if (app.recruiterEmail)
        lines.push(`   Recruiter email: ${app.recruiterEmail}`)
      if (app.roleDescription)
        lines.push(`   About the role: ${app.roleDescription}`)
      if (app.impression) lines.push(`   My impression: ${app.impression}`)
      return lines.join('\n')
    })
    parts.push(`Job Applications Submitted Today:\n${appLines.join('\n\n')}`)
  }

  return parts.join('\n\n')
}

export function parseContent(content: string): ParsedContent {
  const SECTION = '\nJob Applications Submitted Today:\n'
  const idx = content.indexOf(SECTION)
  if (idx === -1) return { notes: content, applications: [] }

  const notes = content.slice(0, idx).trim()
  const appsText = content.slice(idx + SECTION.length).trim()
  const blocks = appsText.split(/\n\n+/)

  const applications = blocks.map((block): JobApplicationEntry => {
    const lines = block.split('\n')
    let header = lines[0].replace(/^\d+\.\s+/, '')

    if (header.endsWith(' (Easy Apply \u2014 low expectations)')) {
      header = header.slice(0, header.lastIndexOf(' (Easy Apply'))
    }

    const sepIdx = header.lastIndexOf(' :: ')
    let jobTitle: string
    let company: string
    if (sepIdx !== -1) {
      jobTitle = header.slice(0, sepIdx)
      company = header.slice(sepIdx + 4)
    } else {
      const atIdx = header.lastIndexOf(' at ')
      jobTitle = atIdx !== -1 ? header.slice(0, atIdx) : header
      company = atIdx !== -1 ? header.slice(atIdx + 4) : ''
    }

    const app: JobApplicationEntry = { ...EMPTY_APPLICATION, jobTitle, company }
    const KEY_RE = /^ {3}([A-Z][A-Za-z ]+): (.+)/
    let curKey = ''
    let curVal = ''

    const flush = () => {
      if (!curKey) return
      switch (curKey) {
        case 'Priority': {
          const found = (
            Object.entries(PRIORITY_LABELS) as [
              JobApplicationEntry['priority'],
              string,
            ][]
          ).find(([, label]) => label === curVal)
          if (found) app.priority = found[0]
          break
        }
        case 'Status': {
          const found = (
            Object.entries(STATUS_LABELS) as [
              JobApplicationEntry['status'],
              string,
            ][]
          ).find(([, label]) => label === curVal)
          if (found) app.status = found[0]
          break
        }
        case 'Application URL':
          app.applicationUrl = curVal
          break
        case 'Source':
          app.source = curVal
          break
        case 'Work arrangement':
          app.workArrangement = curVal
          break
        case 'Recruiter':
          app.recruiter = curVal
          break
        case 'Recruiter LinkedIn':
          app.recruiterLinkedin = curVal
          break
        case 'Recruiter phone':
          app.recruiterPhone = curVal
          break
        case 'Recruiter email':
          app.recruiterEmail = curVal
          break
        case 'About the role':
          app.roleDescription = curVal
          break
        case 'My impression':
          app.impression = curVal
          break
      }
    }

    for (const line of lines.slice(1)) {
      const m = line.match(KEY_RE)
      if (m) {
        flush()
        curKey = m[1]
        curVal = m[2]
      } else if (curKey && line.startsWith('   '))
        curVal += `\n${line.slice(3)}`
    }
    flush()
    return app
  })

  return { notes, applications }
}
