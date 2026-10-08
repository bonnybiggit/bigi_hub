export const countries = [['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'], ['ZA', 'South Africa'], ['RW', 'Rwanda'], ['SN', 'Senegal']]
export const textFields = [
  ['title', 'Job title', 200, true], ['slug', 'Slug', 200, true],
  ['organization', 'Organization', 200, true], ['location', 'Location', 200, true],
  ['jobType', 'Job type', 100, true], ['experienceLevel', 'Experience level', 100, false],
  ['compensation', 'Salary / stipend', 200, false], ['applyUrl', 'Application URL', 2000, false],
]
export function initialJobForm(job) {
  return {
    ...Object.fromEntries(textFields.map(([key]) => [key, job?.[key] || ''])),
    description: job?.description || '', countryCode: job?.countryCode || 'NG', workType: job?.workType || '',
    deadline: job?.deadline?.slice(0, 10) || '',
    requirements: (job?.requirements || []).join('\n'), benefits: (job?.benefits || []).join('\n'),
  }
}
export function jobPayload(form) {
  return { ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])),
    requirements: form.requirements.split('\n').map(value => value.trim()).filter(Boolean),
    benefits: form.benefits.split('\n').map(value => value.trim()).filter(Boolean),
  }
}
export function validateJobForm(form) {
  const errors = {}
  const data = jobPayload(form)
  for (const [key, , maximum, required] of [...textFields, ['description', 'Description', 6000, true]]) {
    if (required && !data[key]) errors[key] = 'This field is required.'
    if (data[key].length > maximum) errors[key] = `Use at most ${maximum} characters.`
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) errors.slug = 'Use lowercase letters or numbers separated by single hyphens.'
  if (!countries.some(([code]) => code === data.countryCode)) errors.countryCode = 'Select a supported country.'
  if (!['', 'Remote', 'Hybrid', 'On-site'].includes(data.workType)) errors.workType = 'Select a work type.'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(data.deadline) ? new Date(data.deadline + 'T00:00:00.000Z') : null
  if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.deadline) errors.deadline = 'Enter a valid deadline.'
  if (data.applyUrl) {
    try {
      const url = new URL(data.applyUrl)
      const unsafeCharacters = /[\s\\]/.test(data.applyUrl) || [...data.applyUrl].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
      if (!/^https?:\/\//i.test(data.applyUrl) || unsafeCharacters || !['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error()
    } catch { errors.applyUrl = 'Enter an absolute HTTP or HTTPS URL without credentials.' }
  }
  for (const key of ['requirements', 'benefits']) {
    if (data[key].length > 20 || data[key].some(value => value.length > 500)) errors[key] = 'Use up to 20 items, each at most 500 characters.'
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > 10240) errors.form = 'Job details exceed the request size limit. Shorten the description or list items.'
  return errors
}
