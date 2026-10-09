import assert from 'node:assert/strict'
import test from 'node:test'
import { subscribeListingRefresh } from '../../frontend/src/utils/listingRefresh.js'

test('public listing refreshes on focus, visibility and polling, pauses while hidden, and cleans up', () => {
  const windowTarget = new EventTarget(), documentTarget = new EventTarget()
  let callback, cancelled, calls = 0
  const stop = subscribeListingRefresh(() => calls++, { windowTarget, documentTarget,
    schedule: (run, delay) => { callback = run; assert.equal(delay, 30000); return 7 }, cancel: timer => { cancelled = timer } })
  windowTarget.dispatchEvent(new Event('focus')); assert.equal(calls, 1)
  documentTarget.hidden = true
  callback(); windowTarget.dispatchEvent(new Event('focus')); documentTarget.dispatchEvent(new Event('visibilitychange'))
  assert.equal(calls, 1)
  documentTarget.hidden = false
  documentTarget.dispatchEvent(new Event('visibilitychange')); callback(); assert.equal(calls, 3)
  stop(); assert.equal(cancelled, 7)
  windowTarget.dispatchEvent(new Event('focus')); documentTarget.dispatchEvent(new Event('visibilitychange'))
  assert.equal(calls, 3)
})
