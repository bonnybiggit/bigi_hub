// Admin and public sites may use different origins; focus and bounded polling
// refresh public data without relying on cross-origin storage events.
export function subscribeListingRefresh(refresh, {
  windowTarget = window, documentTarget = document,
  schedule = setInterval, cancel = clearInterval,
} = {}) {
  const visibleRefresh = () => { if (!documentTarget.hidden) refresh() }
  windowTarget.addEventListener('focus', visibleRefresh)
  documentTarget.addEventListener('visibilitychange', visibleRefresh)
  const timer = schedule(visibleRefresh, 30000)
  return () => {
    cancel(timer)
    windowTarget.removeEventListener('focus', visibleRefresh)
    documentTarget.removeEventListener('visibilitychange', visibleRefresh)
  }
}
