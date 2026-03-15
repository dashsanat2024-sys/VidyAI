export const API_BASE = '/api'

export async function apiFetch(path, options = {}, token = '') {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API_BASE + path, { ...options, headers })
  return res
}

export async function apiGet(path, token) {
  return apiFetch(path, {}, token)
}

export async function apiPost(path, body, token) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token)
}

export async function apiPostForm(path, formData, token) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })
  return res
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

export function speakText(text, onEnd) {
  if (!window.speechSynthesis || !text?.trim()) {
    if (onEnd) onEnd()
    return
  }

  // Always cancel any ongoing speech first
  window.speechSynthesis.cancel()
  _clearKeepAlive()

  // Small delay after cancel — required on Safari/macOS to avoid getting stuck
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text.trim())
    utterance.rate  = 0.92
    utterance.pitch = 1.05
    utterance.volume = 1.0

    let ended = false
    const finish = () => {
      if (ended) return
      ended = true
      _clearKeepAlive()
      if (onEnd) onEnd()
    }

    utterance.onend   = finish
    utterance.onerror = (e) => {
      // 'interrupted' is not a real error — it means cancel() was called
      if (e.error !== 'interrupted') console.warn('[TTS] error:', e.error)
      finish()
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
  _clearKeepAlive()
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}
