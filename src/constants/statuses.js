export const APPLICATION_STATUSES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'INTERVIEW_SCHEDULED', label: 'Interview scheduled' },
  { value: 'INTERVIEWED', label: 'Interviewed' },
  { value: 'OFFERED', label: 'Offered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

export const INTERVIEW_STAGE_STATUSES = ['INTERVIEW_SCHEDULED', 'INTERVIEWED']

const LABELS_BY_VALUE = new Map(
  APPLICATION_STATUSES.map((status) => [status.value, status.label]),
)

export function statusLabel(value) {
  return LABELS_BY_VALUE.get(value) ?? value
}
