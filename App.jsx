import { useState, useEffect, useRef, useCallback } from 'react'
import CircularViz from './components/CircularViz.jsx'
import WeatherWidget from './components/WeatherWidget.jsx'
import RemindersPanel from './components/RemindersPanel.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useSpeech } from './hooks/useSpeech.js'
import { useTTS } from './hooks/useTTS.js'
import { askClaude } from './services/claude.js'
import { getWeather, weatherToText } from './services/weather.js'
import { getReminders, saveReminder, parseReminderCommand, requestNotificationPermission } from './services/reminders.js'

const CONFIG_KEY = 'jarvis_config'

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') } catch { return {} }
}
function saveConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)) }

const HEX = '0123456789ABCDEF'
const rHex = () => Array.from({ length: 8 }, () => HEX[Math.floor(Math.random() * 16)]).join('')

export default function App() {
  const [config, setConfig]           = useState(loadConfig)
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages]       = useState([{ role: 'assistant', content: 'Systèmes en ligne. Bonjour — je suis JARVIS. Appuyez sur le bouton ou écrivez pour commencer.' }])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [weather, setWeather]         = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [reminders, setReminders]     = useState(getReminders)
  const [time, setTime]               = useState(new Date())
  const [hexLines, setHexLines]       = useState([rHex(), rHex(), rHex()])
  const [showSidebar, setShowSidebar] = useState(false)
  const [tab, setTab]                 = useState('chat') // chat | voice
  const scrollRef  = useRef(null)
  const inputRef   = useRef(null)

  const { speaking, speak, stop: stopTTS } = useTTS()

  const handleVoiceResult = useCallback((text) => {
    if (!text) return
    setInput(text)
    setTimeout(() => sendMessage(text), 100)
  }, [config, messages])

  const { listening, transcript, supported: voiceSupported, startListening, stopListening } = useSpeech({
    onResult: handleVoiceResult
  })

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Hex stream
  useEffect(() => {
    const t = setInterval(() => setHexLines(l => [...l.slice(-5), rHex() + ' ' + rHex()]), 700)
    return () => clearInterval(t)
  }, [])

  // Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  // Load weather
  useEffect(() => {
    if (!config.weatherKey) return
    setWeatherLoading(true)
    getWeather(config.weatherKey).then(w => { setWeather(w); setWeatherLoading(false) }).catch(() => setWeatherLoading(false))
    const t = setInterval(() => {
      getWeather(config.weatherKey).then(setWeather).catch(() => {})
    }, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [config.weatherKey])

  // No API key → show settings
  useEffect(() => {
    if (!config.anthropicKey) setShowSettings(true)
    else requestNotificationPermission()
  }, [])

  const handleSaveConfig = (c) => {
    setConfig(c)
    saveConfig(c)
    requestNotificationPermission()
  }

  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    if (!config.anthropicKey) { setShowSettings(true); return }

    stopTTS()
    const userMsg = { role: 'user', content: text }
    const weatherCtx = weather ? `\n[Contexte météo: ${weatherToText(weather)}]` : ''
    const nameCtx = config.userName ? `\n[L'utilisateur s'appelle ${config.userName}]` : ''
    const userWithCtx = { role: 'user', content: text + weatherCtx + nameCtx }

    const history = [...messages, userWithCtx]
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await askClaude(history, config.anthropicKey)

      // Parse reminder command
      const reminderCmd = parseReminderCommand(reply)
      if (reminderCmd) {
        saveReminder(reminderCmd.title, reminderCmd.time)
        setReminders(getReminders())
      }

      // Clean reply for display (remove the command tag)
      const cleanReply = reply.replace(/RAPPEL_CREER:.*$/gm, '').trim()
      setMessages(prev => [...prev, { role: 'assistant', content: cleanReply }])
      speak(cleanReply)
    } catch (e) {
      const err = `Anomalie système: ${e.message}`
      setMessages(prev => [...prev, { role: 'assistant', content: err }])
    }
    setLoading(false)
  }, [input, loading, config, messages, weather, speak, stopTTS])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const fmtTime = (d) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtDate = (d) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  const voiceState = listening ? 'listening' : speaking ? 'speaking' : loading ? 'loading' : 'idle'
  const voiceColor = { listening: '#ff4060', speaking: '#00ff88', loading: '#ffaa00', idle: '#00e5ff' }[voiceState]

  const suggestions = config.weatherKey && weather
    ? [`Météo à ${weather.city} ?`, 'Planifie ma journée', 'Rappel à 18h00', 'Analyse actualités']
    : ['Quelle heure est-il ?', 'Rappel déjeuner à 12h30', 'Blague sophistiquée', 'Mode bref']

  return (
    <div style={styles.root}>
      {/* Scanline */}
      <div style={styles.scanline} />
      {/* Grid */}
      <div style={styles.grid} />

      {showSettings && <SettingsModal config={config} onSave={handleSaveConfig} onClose={() => { if (config.anthropicKey) setShowSettings(false) }} />}

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoWrap}>
            <div style={{ position: 'relative', width: 40, height: 40 }}>
              <CircularViz size={40} listening={listening} speaking={speaking} idle={!loading && !listening && !speaking} />
              <span style={styles.logoJ}>J</span>
            </div>
            <div>
              <div style={styles.logoName}>J.A.R.V.I.S</div>
              <div style={{ ...styles.statusText, color: voiceColor }}>
                {voiceState === 'listening' ? '● ÉCOUTE' : voiceState === 'speaking' ? '▶ PARLE' : voiceState === 'loading' ? '◌ TRAITE' : '● EN LIGNE'}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.clock}>{fmtTime(time)}</div>
          <div style={styles.date}>{fmtDate(time)}</div>
        </div>

        <button onClick={() => setShowSettings(true)} style={styles.settingsBtn} title="Configuration">⚙</button>
      </header>

      {/* MAIN */}
      <main style={styles.main}>

        {/* CENTER VIZ — Voice mode feel */}
        <div style={styles.vizWrap}>
          <CircularViz size={180} listening={listening} speaking={speaking} idle={!loading && !listening && !speaking} />
          {/* Status label */}
          <div style={{ ...styles.vizLabel, color: voiceColor }}>
            {listening ? 'ÉCOUTE EN COURS...' : speaking ? 'JARVIS PARLE...' : loading ? 'TRAITEMENT...' : 'EN ATTENTE'}
          </div>
          {listening && transcript && (
            <div style={styles.interimText}>{transcript}</div>
          )}
        </div>

        {/* CHAT MESSAGES */}
        <div ref={scrollRef} style={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} style={{ ...styles.msgRow, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ ...styles.avatar, borderColor: msg.role === 'user' ? 'rgba(0,150,255,0.4)' : 'rgba(0,245,255,0.35)' }}>
                {msg.role === 'user' ? (config.userName ? config.userName[0].toUpperCase() : 'M') : 'J'}
              </div>
              <div style={{
                ...styles.bubble,
                background: msg.role === 'user' ? 'rgba(0,80,160,0.15)' : 'rgba(0,200,255,0.06)',
                borderColor: msg.role === 'user' ? 'rgba(0,130,255,0.2)' : 'rgba(0,245,255,0.12)',
                borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              }}>
                {msg.content}
                {msg.role === 'assistant' && speaking && i === messages.length - 1 && (
                  <button onClick={stopTTS} style={styles.stopBtn}>⏹ Stop</button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msgRow, flexDirection: 'row' }}>
              <div style={{ ...styles.avatar, borderColor: 'rgba(0,245,255,0.35)' }}>J</div>
              <div style={{ ...styles.bubble, borderColor: 'rgba(0,245,255,0.12)' }}>
                <div style={styles.dots}>
                  {[0, 0.2, 0.4].map(d => <span key={d} style={{ ...styles.dot, animationDelay: `${d}s` }} />)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR toggle (reminders + weather) */}
        <div style={{ ...styles.sidebar, transform: showSidebar ? 'translateX(0)' : 'translateX(100%)' }}>
          <WeatherWidget weather={weather} loading={weatherLoading} />
          <div style={{ height: 1, background: 'rgba(0,150,200,0.15)', margin: '12px 0' }} />
          <RemindersPanel reminders={reminders} onUpdate={() => setReminders(getReminders())} />
          <div style={{ marginTop: 'auto' }}>
            {hexLines.map((l, i) => <div key={i} style={styles.hexLine}>{l}</div>)}
          </div>
        </div>

        <button onClick={() => setShowSidebar(s => !s)} style={styles.sidebarToggle}>
          {showSidebar ? '›' : '‹'}
        </button>
      </main>

      {/* SUGGESTIONS */}
      <div style={styles.suggestions}>
        {suggestions.map(s => (
          <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
            style={styles.suggestion}>{s}</button>
        ))}
      </div>

      {/* INPUT BAR */}
      <div style={styles.inputBar}>
        {/* Mic button */}
        {voiceSupported && (
          <button
            onMouseDown={startListening} onMouseUp={stopListening}
            onTouchStart={e => { e.preventDefault(); startListening() }}
            onTouchEnd={e => { e.preventDefault(); stopListening() }}
            style={{ ...styles.micBtn, borderColor: listening ? '#ff4060' : 'rgba(0,200,255,0.3)', boxShadow: listening ? '0 0 16px rgba(255,60,80,0.4)' : 'none' }}
            title="Maintenir pour parler"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={listening ? '#ff4060' : '#00e5ff'} strokeWidth="2">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
        )}

        <div style={styles.inputWrap}>
          <span style={styles.prompt}>&gt;_</span>
          <textarea
            ref={inputRef}
            value={listening ? transcript : input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={listening ? 'Écoute...' : 'Entrez votre commande...'}
            rows={1}
            style={styles.textarea}
          />
        </div>

        <button onClick={() => sendMessage()} disabled={(!input.trim() && !transcript.trim()) || loading}
          style={{ ...styles.sendBtn, opacity: (input.trim() || transcript.trim()) && !loading ? 1 : 0.3 }}>
          ↑
        </button>
      </div>

      {/* Bottom hint */}
      <div style={styles.hint}>
        {voiceSupported ? 'Maintenir 🎤 pour parler · ENTRÉE pour envoyer' : 'ENTRÉE pour envoyer · SHIFT+ENTRÉE nouvelle ligne'}
      </div>
    </div>
  )
}

const styles = {
  root: { height:'100%', display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden', paddingTop:'var(--safe-top)', paddingBottom:'var(--safe-bottom)', position:'relative' },
  scanline: { position:'fixed',left:0,right:0,height:2,background:'linear-gradient(transparent,rgba(0,200,255,0.06),transparent)',animation:'scanline 10s linear infinite',pointerEvents:'none',zIndex:100 },
  grid: { position:'fixed',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(0,150,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,150,255,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px',zIndex:0 },
  header: { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(0,150,200,0.15)',background:'rgba(1,10,18,0.95)',backdropFilter:'blur(10px)',position:'relative',zIndex:10,flexShrink:0 },
  headerLeft: { display:'flex',alignItems:'center',flex:1 },
  logoWrap: { display:'flex',alignItems:'center',gap:10 },
  logoJ: { position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:12,fontWeight:700,color:'#00e5ff',fontFamily:"'Orbitron',monospace",zIndex:1 },
  logoName: { fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,letterSpacing:'0.15em',color:'#00e5ff' },
  statusText: { fontSize:8,letterSpacing:'0.2em',fontFamily:"'Share Tech Mono',monospace",marginTop:2 },
  headerRight: { textAlign:'right' },
  clock: { fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:'#00e5ff',letterSpacing:'0.08em' },
  date: { fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:'rgba(0,180,220,0.4)',letterSpacing:'0.15em',textTransform:'uppercase' },
  settingsBtn: { background:'none',border:'none',color:'rgba(0,200,255,0.5)',cursor:'pointer',fontSize:18,padding:'0 0 0 12px',flexShrink:0 },
  main: { flex:1,display:'flex',flexDirection:'column',position:'relative',overflow:'hidden',zIndex:5 },
  vizWrap: { display:'flex',flexDirection:'column',alignItems:'center',paddingTop:8,paddingBottom:4,position:'relative',height:100,flexShrink:0 },
  vizLabel: { fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:'0.2em',marginTop:2,zIndex:1,position:'relative' },
  interimText: { fontFamily:"'Exo 2',sans-serif",fontSize:11,color:'rgba(200,235,255,0.6)',marginTop:2,maxWidth:260,textAlign:'center',fontStyle:'italic',position:'relative',zIndex:1 },
  messages: { flex:1,overflowY:'auto',padding:'8px 16px 12px',display:'flex',flexDirection:'column',gap:0 },
  msgRow: { display:'flex',gap:8,marginBottom:12,alignItems:'flex-start' },
  avatar: { width:26,height:26,borderRadius:'50%',border:'1px solid',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#00e5ff',fontFamily:"'Share Tech Mono',monospace",flexShrink:0,background:'rgba(0,10,20,0.8)' },
  bubble: { maxWidth:'78%',border:'1px solid',padding:'8px 12px',fontSize:12,lineHeight:1.65,color:'var(--text)',whiteSpace:'pre-wrap',fontFamily:"'Exo 2',sans-serif",letterSpacing:'0.01em' },
  stopBtn: { display:'block',marginTop:6,background:'none',border:'1px solid rgba(255,100,100,0.3)',borderRadius:4,color:'rgba(255,100,100,0.6)',fontSize:9,padding:'2px 6px',cursor:'pointer',fontFamily:"'Share Tech Mono',monospace" },
  dots: { display:'flex',gap:4,padding:'2px 0' },
  dot: { width:6,height:6,borderRadius:'50%',background:'#00e5ff',display:'inline-block',animation:'pulse 1.2s ease-in-out infinite' },
  sidebar: { position:'absolute',top:0,right:0,bottom:0,width:140,background:'rgba(1,8,18,0.96)',borderLeft:'1px solid rgba(0,150,200,0.15)',padding:'14px 10px',display:'flex',flexDirection:'column',gap:0,transition:'transform 0.3s ease',zIndex:20,overflowY:'auto' },
  sidebarToggle: { position:'absolute',right:showSidebar => showSidebar ? 140 : 0,top:'50%',transform:'translateY(-50%)',background:'rgba(0,20,40,0.9)',border:'1px solid rgba(0,150,200,0.2)',color:'rgba(0,200,255,0.6)',fontSize:16,cursor:'pointer',padding:'6px 4px',zIndex:21,borderRadius:'4px 0 0 4px',transition:'right 0.3s' },
  hexLine: { fontFamily:"'Share Tech Mono',monospace",fontSize:7,color:'rgba(0,180,220,0.2)',lineHeight:1.8 },
  suggestions: { display:'flex',gap:6,padding:'4px 16px 8px',flexWrap:'nowrap',overflowX:'auto',flexShrink:0,zIndex:5 },
  suggestion: { fontSize:9,padding:'4px 10px',background:'rgba(0,80,150,0.1)',border:'1px solid rgba(0,150,200,0.2)',borderRadius:20,color:'rgba(130,200,240,0.7)',cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Share Tech Mono',monospace",flexShrink:0 },
  inputBar: { display:'flex',gap:8,alignItems:'flex-end',padding:'8px 14px',borderTop:'1px solid rgba(0,150,200,0.12)',background:'rgba(1,8,16,0.95)',backdropFilter:'blur(8px)',flexShrink:0,zIndex:10 },
  micBtn: { width:38,height:38,borderRadius:'50%',background:'rgba(0,20,40,0.8)',border:'1px solid',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 0.2s' },
  inputWrap: { flex:1,display:'flex',alignItems:'flex-end',gap:6,background:'rgba(0,30,60,0.2)',border:'1px solid rgba(0,150,200,0.2)',borderRadius:10,padding:'8px 12px' },
  prompt: { fontSize:10,color:'rgba(0,200,255,0.35)',fontFamily:"'Share Tech Mono',monospace",paddingBottom:2,flexShrink:0 },
  textarea: { flex:1,background:'transparent',border:'none',color:'var(--text)',fontSize:13,fontFamily:"'Exo 2',sans-serif",lineHeight:1.5,maxHeight:80,resize:'none',outline:'none',caretColor:'#00e5ff' },
  sendBtn: { width:36,height:36,borderRadius:'50%',background:'rgba(0,150,255,0.15)',border:'1px solid rgba(0,200,255,0.4)',color:'#00e5ff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s' },
  hint: { textAlign:'center',fontSize:9,color:'rgba(0,130,160,0.3)',padding:'4px 0 8px',fontFamily:"'Share Tech Mono',monospace",letterSpacing:'0.08em',flexShrink:0 }
}
