import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeech({ onResult, onError } = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { setSupported(false); return }
    setSupported(true)

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'fr-FR'
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setTranscript(final || interim)
      if (final && onResult) onResult(final.trim())
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = (e) => {
      setListening(false)
      if (onError) onError(e.error)
    }

    recognitionRef.current = recognition
    return () => { try { recognition.abort() } catch {} }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return
    setTranscript('')
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (e) {
      console.warn('Speech start error:', e)
    }
  }, [listening])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !listening) return
    try { recognitionRef.current.stop() } catch {}
    setListening(false)
  }, [listening])

  return { listening, transcript, supported, startListening, stopListening }
}
