import { useState, useCallback, useRef, useEffect } from 'react'

export function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const [supported] = useState(() => 'speechSynthesis' in window)
  const utteranceRef = useRef(null)
  const voiceRef = useRef(null)

  useEffect(() => {
    if (!supported) return
    const loadVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      // Prefer English GB for JARVIS feel, fall back to any
      voiceRef.current =
        voices.find(v => v.lang === 'fr-FR' && v.name.toLowerCase().includes('thomas')) ||
        voices.find(v => v.lang === 'fr-FR') ||
        voices.find(v => v.lang.startsWith('fr')) ||
        voices[0] || null
    }
    loadVoice()
    window.speechSynthesis.onvoiceschanged = loadVoice
  }, [supported])

  const speak = useCallback((text) => {
    if (!supported) return
    window.speechSynthesis.cancel()
    // Clean markdown-style formatting from text
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/—/g, ', ')
      .replace(/\n/g, '. ')

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.voice = voiceRef.current
    utterance.rate = 0.92
    utterance.pitch = 0.85
    utterance.volume = 1

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { speaking, supported, speak, stop }
}
