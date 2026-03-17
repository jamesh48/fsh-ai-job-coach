export interface AppDocument {
  id: string
  label: string
  content: string
  createdAt: string // ISO timestamp
}

export const DOCUMENT_LABEL_OPTIONS = [
  'Cover Letter',
  'Job Application Questions',
  'Follow-up Email',
  'Thank You Note',
  'Cold Outreach',
  'LinkedIn Message',
  'Interview Notes',
  'Research Notes',
]

export type ActivityType =
  | 'recruiter_outreach'
  | 'phone_screen'
  | 'interview'
  | 'follow_up'
  | 'offer_call'
  | 'rejection'
  | 'note'

export interface Activity {
  id: string
  type: ActivityType
  date: string // YYYY-MM-DD
  notes: string
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  recruiter_outreach: 'Recruiter Outreach',
  phone_screen: 'Phone Screen',
  interview: 'Interview',
  follow_up: 'Follow-up',
  offer_call: 'Offer Call',
  rejection: 'Rejection',
  note: 'Note',
}

export type FitScore = 1 | 2 | 3 | 4

export const FIT_SCORE_DISPLAY: Record<
  FitScore,
  { label: string; color: 'success' | 'primary' | 'warning' | 'default' }
> = {
  4: { label: 'Strong Fit', color: 'success' },
  3: { label: 'Good Fit', color: 'primary' },
  2: { label: 'Partial Fit', color: 'warning' },
  1: { label: 'Weak Fit', color: 'default' },
}

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
  compensation: string
  roleDescription: string
  impression: string
  priority: 'quick_apply' | 'standard' | 'strong_interest' | 'hot_lead'
  status: 'applied' | 'recruiter_screen' | 'interviewing' | 'offer' | 'rejected'
  fitScore: FitScore | null
  fitRationale: string
  activities: Activity[]
  documents: AppDocument[]
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
  compensation: '',
  roleDescription: '',
  impression: '',
  priority: 'quick_apply',
  status: 'applied',
  fitScore: null,
  fitRationale: '',
  activities: [],
  documents: [],
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
      if (app.compensation) lines.push(`   Compensation: ${app.compensation}`)
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
      if (app.fitScore) lines.push(`   Fit score: ${app.fitScore}`)
      if (app.fitRationale) lines.push(`   Fit rationale: ${app.fitRationale}`)
      app.activities.forEach((act, ai) => {
        lines.push(
          `   Activity ${ai + 1}: ${act.type} | ${act.date} | ${act.notes.replace(/\n/g, ' ')}`,
        )
      })
      app.documents.forEach((doc, di) => {
        lines.push(
          `   Document ${di + 1}: ${doc.label} | ${doc.createdAt} | ${JSON.stringify(doc.content)}`,
        )
      })
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

    const app: JobApplicationEntry = {
      ...EMPTY_APPLICATION,
      jobTitle,
      company,
      activities: [],
      documents: [],
    }
    const KEY_RE = /^ {3}([A-Z][A-Za-z0-9 ]+): (.+)/
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
        case 'Compensation':
          app.compensation = curVal
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
        case 'Fit score': {
          const n = Number(curVal)
          if (n === 1 || n === 2 || n === 3 || n === 4) app.fitScore = n
          break
        }
        case 'Fit rationale':
          app.fitRationale = curVal
          break
        default: {
          if (/^Activity \d+$/.test(curKey)) {
            const [type, date, ...notesParts] = curVal.split(' | ')
            app.activities.push({
              id: crypto.randomUUID(),
              type: (type as ActivityType) ?? 'note',
              date: date ?? '',
              notes: notesParts.join(' | '),
            })
          } else if (/^Document \d+$/.test(curKey)) {
            const firstSep = curVal.indexOf(' | ')
            const secondSep = curVal.indexOf(' | ', firstSep + 3)
            if (firstSep !== -1 && secondSep !== -1) {
              const label = curVal.slice(0, firstSep)
              const createdAt = curVal.slice(firstSep + 3, secondSep)
              const contentJson = curVal.slice(secondSep + 3)
              try {
                app.documents.push({
                  id: crypto.randomUUID(),
                  label,
                  createdAt,
                  content: JSON.parse(contentJson),
                })
              } catch {
                // malformed — skip
              }
            }
          }
        }
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
