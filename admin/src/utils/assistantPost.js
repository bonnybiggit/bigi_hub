export const postTypes = ['Job', 'Scholarship', 'Grant', 'Fellowship', 'Internship', 'Training', 'Competition', 'Event', 'Other']
export const assistantFields = [
  ['title', 'Title', 500], ['organization', 'Organization', 500], ['location', 'Location', 500],
  ['jobType', 'Job type', 200], ['workType', 'Work type', 200], ['experience', 'Experience', 1000],
  ['salary', 'Salary / funding', 1000], ['applicationEmail', 'Application email', 254], ['applicationUrl', 'Application URL', 2000],
  ['deadline', 'Deadline as stated in the source', 500], ['description', 'Description', 12000, true],
  ['responsibilities', 'Responsibilities', 8000, true], ['requirements', 'Requirements / eligibility', 8000, true], ['howToApply', 'How to apply', 8000, true],
]
export const displayFact = value => value?.trim() || 'Not specified'
export const postStatus = value => ({ review: 'Needs review', approved: 'Approved', published: 'Published', archived: 'Archived' })[value] || value
export const assistantDate = value => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' }) : 'Not specified'
export function readFlyer(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 4 * 1024 * 1024) return Promise.reject(new Error('Choose a PNG, JPEG or WebP flyer up to 4MB.'))
  if (file.name.length > 200) return Promise.reject(new Error('Use a filename of at most 200 characters.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result })
    reader.onerror = reader.onabort = () => reject(new Error('Unable to read this image. Select it again.'))
    reader.readAsDataURL(file)
  })
}
