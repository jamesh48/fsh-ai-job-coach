// Jobs feature types

export type JobListing = {
  id: string
  title: string
  company: string
  location: string
  description: string
  url?: string
  postedAt?: Date
}

export type JobApplication = {
  id: string
  userId: string
  jobId: string
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected'
  notes?: string
  appliedAt?: Date
}
