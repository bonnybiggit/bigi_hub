import { useEffect, useRef, useState } from 'react'
import { createJob, updateJob } from '../services/jobs.service.js'
import { countries, textFields, initialJobForm, jobPayload, validateJobForm } from '../utils/jobForm.js'

export default function JobForm({ job, onSaved, onCancel }) {
  const [form, setForm] = useState(() => initialJobForm(job))
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const formRef = useRef(null)
  const headingRef = useRef(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  function change(event) {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    setErrors(current => ({ ...current, [name]: undefined }))
  }
  function focusError(nextErrors) {
    formRef.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus()
  }
  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return
    const nextErrors = validateJobForm(form)
    setErrors(nextErrors); setError('')
    if (Object.keys(nextErrors).length) { focusError(nextErrors); return }
    submitting.current = true; setBusy(true)
    try {
      const result = job ? await updateJob(job._id, jobPayload(form)) : await createJob(jobPayload(form))
      onSaved(result.data, Boolean(job))
    } catch (failure) {
      setError(failure.message || 'Unable to save this job. Please try again.')
      setErrors(failure.errors || {})
    } finally { submitting.current = false; setBusy(false) }
  }
  const props = name => ({ id: `job-${name}`, name, value: form[name], onChange: change, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `job-${name}-error` : undefined })
  const fieldError = name => errors[name] && <span className="field-error" id={`job-${name}-error`}>{errors[name]}</span>
  return <section className="panel jobs-editor" aria-labelledby="job-form-title">
    <h2 id="job-form-title" ref={headingRef} tabIndex={-1}>{job ? 'Edit job' : 'Create job'}</h2>
    <p>Required fields are marked *. Requirements and benefits use one item per line.</p>
    <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
      <fieldset disabled={busy} className="job-form-grid"><legend className="visually-hidden">Job details</legend>
        {textFields.map(([name, label, maximum, required]) => <div className="job-field" key={name}>
          <label htmlFor={`job-${name}`}>{label}{required ? ' *' : ''}</label>
          <input {...props(name)} type={name === 'applyUrl' ? 'url' : 'text'} required={required} maxLength={maximum} placeholder={name === 'jobType' ? 'e.g. Full-time' : name === 'slug' ? 'e.g. software-engineer-lagos' : undefined} />{fieldError(name)}
        </div>)}
        <div className="job-field"><label htmlFor="job-countryCode">Country *</label><select {...props('countryCode')} required>{countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>{fieldError('countryCode')}</div>
        <div className="job-field"><label htmlFor="job-workType">Work type</label><select {...props('workType')}><option value="">Not specified</option>{['Remote', 'Hybrid', 'On-site'].map(value => <option key={value}>{value}</option>)}</select>{fieldError('workType')}</div>
        <div className="job-field"><label htmlFor="job-deadline">Deadline *</label><input {...props('deadline')} type="date" required />{fieldError('deadline')}</div>
        <div className="job-field job-field-wide"><label htmlFor="job-description">Description *</label><textarea {...props('description')} rows={6} maxLength={6000} required />{fieldError('description')}</div>
        {['requirements', 'benefits'].map(name => <div className="job-field" key={name}><label htmlFor={`job-${name}`}>{name === 'requirements' ? 'Requirements' : 'Benefits'}</label><textarea {...props(name)} rows={4} />{fieldError(name)}</div>)}
      </fieldset>
      {Object.keys(errors).some(key => errors[key]) && <p className="field-error" role="alert">Check the highlighted fields.{errors.form && ` ${errors.form}`}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="job-actions"><button className="auth-button" type="submit" disabled={busy}>{busy ? 'Saving…' : job ? 'Save changes' : 'Create job'}</button><button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Cancel</button></div>
    </form>
  </section>
}
