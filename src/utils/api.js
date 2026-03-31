export const API_BASE = '/api'

export async function apiFetch(path, options = {}, token = '') {
  const headers = { ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Only set Content-Type for non-FormData bodies (FormData needs browser to set boundary)
  const isFormData = options.body instanceof FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(API_BASE + path, { ...options, headers })

  // Parse JSON response
  let data
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  // Throw on non-2xx status with structured error
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    // Broadcast quota-exceeded so any panel automatically shows the warning toast
    if (res.status === 429 && data.quota_exceeded) {
      window.dispatchEvent(new CustomEvent('quota:exceeded', { detail: data }))
    }
    throw err
  }

  return data
}

export async function apiGet(path, token) {
  return apiFetch(path, {}, token)
}

export async function apiPost(path, body, token) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token)
}

export async function apiPostForm(path, formData, token) {
  return apiFetch(path, { method: 'POST', body: formData }, token)
}

// ── Speech Synthesis — fixed for Chrome, Safari, macOS ──────────────────────
// Bugs fixed:
//  1. Chrome pauses speechSynthesis after ~15s — fixed with keep-alive interval
//  2. Voices not loaded on first call — fixed with onvoiceschanged + retry loop
//  3. Safari returns empty voice list until user interaction — handled gracefully
//  4. utterance.onend fires before audio finishes in some browsers — use timeout guard

let _keepAliveTimer = null

function _clearKeepAlive() {
  if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null }
}

// Chrome bug workaround: resume synthesis every 10s to prevent auto-pause
function _startKeepAlive() {
  _clearKeepAlive()
  _keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    } else {
      _clearKeepAlive()
    }
  }, 10000)
}

function _pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  // Priority 1: Named UK English female voices
  const ukFemale = voices.find(v =>
    v.lang === 'en-GB' &&
    /Serena|Kate|Emily|Fiona|Martha|Veena|Google UK English Female|Moira/i.test(v.name)
  )
  // Priority 2: Any en-GB voice
  const anyUK = voices.find(v => v.lang === 'en-GB')
  // Priority 3: en-AU (also sounds natural for education)
  const auVoice = voices.find(v => v.lang === 'en-AU')
  // Priority 4: Any English female
  const anyFemale = voices.find(v =>
    v.lang.startsWith('en') && /female|woman|Samantha|Victoria|Karen|Zira/i.test(v.name)
  )
  // Priority 5: Any English voice
  const anyEng = voices.find(v => v.lang.startsWith('en'))
  return ukFemale || anyUK || auVoice || anyFemale || anyEng || voices[0]
}

// ── Active utterance tracking ─────────────────────────────────────────────────
// We track whether a stop was explicitly requested so that the onEnd/onerror
// callback chain does NOT trigger the next-segment advance when the user presses
// Stop or clears the chat. Without this, calling cancel() fires onerror with
// reason "interrupted", which previously propagated to onEnd → playSegment(n+1).
let _stopRequested = false

export function speakText(text, onEnd) {
  if (!window.speechSynthesis || !text?.trim()) {
    if (onEnd) onEnd()
    return
  }

  // Mark that we are NOT stopping — this is a new requested playback
  _stopRequested = false

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel()
  _clearKeepAlive()

  // Small delay after cancel — required on Safari/macOS to avoid getting stuck
  setTimeout(() => {
    // If stopSpeech() was called during our 120ms delay, bail out without
    // calling onEnd. This prevents the video auto-advance on fast Stop clicks.
    if (_stopRequested) return

    const utterance = new SpeechSynthesisUtterance(text.trim())
    utterance.rate  = 0.92
    utterance.pitch = 1.05
    utterance.volume = 1.0

    let ended = false
    const finish = (interrupted = false) => {
      if (ended) return
      ended = true
      _clearKeepAlive()
      // CRITICAL: Only call onEnd if this was a natural finish.
      // If the user clicked Stop (or cleared chat), _stopRequested is true
      // and we must NOT advance to the next segment / re-enable the button.
      if (!interrupted && !_stopRequested && onEnd) onEnd()
    }

    utterance.onend   = () => finish(false)
    utterance.onerror = (e) => {
      // 'interrupted' means cancel() was called — this is NOT an error,
      // it is the expected result of pressing Stop. Do not advance.
      if (e.error === 'interrupted') {
        finish(true)   // interrupted=true → onEnd is suppressed
      } else {
        console.warn('[TTS] error:', e.error)
        finish(false)  // real error → still finish normally
      }
    }

    const speak = () => {
      const voice = _pickVoice()
      if (voice) utterance.voice = voice
      window.speechSynthesis.speak(utterance)
      _startKeepAlive()
    }

    // Voices may not be available yet (especially on first page load)
    if (window.speechSynthesis.getVoices().length > 0) {
      speak()
    } else {
      // Wait for voices to load — fires once on page init
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        speak()
      }
      // Fallback: try anyway after 1s if event never fires (Safari)
      setTimeout(() => {
        if (!ended && !window.speechSynthesis.speaking) speak()
      }, 1000)
    }
  }, 120)
}

export function stopSpeech() {
  // Set the flag BEFORE cancel() so the onerror/onend handlers see it
  _stopRequested = true
  _clearKeepAlive()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
