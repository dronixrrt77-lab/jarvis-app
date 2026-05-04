import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'

// ============ STYLES ============
const injectStyles = () => {
  const style = document.createElement('style')
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; width: 100%; overflow: hidden; background: #010a12; color: rgba(200,235,255,0.92); -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; user-select: none; }
    @keyframes spinCW { to { transform: rotate(360deg); } }
    @keyframes spinCCW { to { transform: rotate(-360deg); } }
    @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scanline { 0%{top:-2%} 100%{top:102%} }
    @keyframes waveBar { 0%,100%{height:4px} 50%{height:18px} }
    @keyframes ripple { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(3.5);opacity:0} }
    ::-webkit-scrollbar { width: 2px; }
    ::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); border-radius: 2px; }
    textarea { resize: none; }
    textarea:focus { outline: none; }
    .msg-anim { animation: fadeUp 0.3s ease; }
    .sugg-btn:hover { background: rgba(0,150,255,0.15) !important; }
  `
  document.head.appendChild(style)
}
injectStyles()

// ============ SYSTEM PROMPT ============
const SYSTEM_PROMPT = `Tu es J.A.R.V.I.S — Just A Rather Very Intelligent System. Assistant personnel hautement sophistiqué, loyal et efficace, inspiré de l'IA de Tony Stark.

PERSONNALITÉ:
- Ton précis, élégant, légèrement formel mais chaleureux
- Appelle l'utilisateur "Monsieur" ou par son prénom si connu
- Réponds avec assurance et compétence
- Humour britannique subtil quand approprié
- Concis mais complet

FORMAT:
- Réponds en français sauf si l'utilisateur parle anglais
- Phrases courtes et percutantes
- Listes avec tirets (—) si nécessaire
- Pour créer un rappel, écris sur une ligne séparée: RAPPEL_CREER: [titre] | [HH:MM]`

// ============ CONFIG ============
const CONFIG_KEY = 'jarvis_config'
const REMINDERS_KEY = 'jarvis_reminders'
const loadConfig = () => { try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') } catch { return {} } }
const saveConfigStore = (c) => localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
const loadReminders = () => { try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]') } catch { return [] } }
const saveRemindersStore = (r) => localStorage.setItem(REMINDERS_KEY, JSON.stringify(r))

// ============ HOOKS ============
function useTTS() {
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef(null)
  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis?.getVoices() || []
      voiceRef.current = voices.find(v => v.lang === 'fr-FR') || voices[0] || null
    }
    load()
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load
  }, [])
  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/\*\*(.*?)\*\*/g,'$1').replace(/#{1,6}\s/g,'').replace(/—/g,', ').replace(/\n/g,'. ').replace(/RAPPEL_CREER:.*$/gm,'')
    const u = new SpeechSynthesisUtterance(clean)
    u.voice = voiceRef.current; u.rate = 0.92; u.pitch = 0.85; u.volume = 1
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])
  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false) }, [])
  return { speaking, speak, stop }
}

function useSpeechRec(onResult) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef(null)
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  useEffect(() => {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.continuous = false; r.interimResults = true; r.lang = 'fr-FR'
    r.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t; else interim += t
      }
      setTranscript(final || interim)
      if (final && onResult) onResult(final.trim())
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recRef.current = r
    return () => { try { r.abort() } catch {} }
  }, [])
  const start = useCallback(() => {
    if (!recRef.current || listening) return
    setTranscript('')
    try { recRef.current.start(); setListening(true) } catch {}
  }, [listening])
  const stop = useCallback(() => {
    if (!recRef.current || !listening) return
    try { recRef.current.stop() } catch {}
    setListening(false)
  }, [listening])
  return { listening, transcript, supported, start, stop }
}

// ============ COMPONENTS ============
function CircularViz({ size = 160, listening, speaking }) {
  const cx = size / 2
  const color = listening ? '#ff4060' : speaking ? '#00ff88' : '#00e5ff'
  const rings = [0.38, 0.30, 0.22, 0.16]
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none' }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {rings.map((r, i) => (
        <circle key={i} cx={cx} cy={cx} r={size*r} fill="none" stroke={color}
          strokeWidth={i===1?1.5:1} strokeOpacity={0.7-i*0.12}
          strokeDasharray={`${size*r*0.5} ${size*r*0.3}`}
          style={{ transformOrigin:`${cx}px ${cx}px`, animation:`spin${i%2===0?'CW':'CCW'} ${3+i*1.5}s linear infinite`, filter:(listening||speaking)?'url(#glow)':'none' }} />
      ))}
      <circle cx={cx} cy={cx} r={size*0.07} fill={color} fillOpacity={0.8} filter={(listening||speaking)?'url(#glow)':'none'} style={{transition:'all 0.3s'}}/>
      <circle cx={cx} cy={cx} r={size*0.03} fill="white" fillOpacity={0.9}/>
      {speaking && [0,1,2,3,4].map(i => (
        <rect key={i} x={cx-12+i*6} y={cx-3} width={4} height={6} rx={2} fill={color}
          style={{ animation:`waveBar 0.6s ${i*0.1}s ease-in-out infinite`, transformOrigin:`${cx-12+i*6+2}px ${cx}px` }}/>
      ))}
      {listening && <circle cx={cx} cy={cx} r={size*0.1} fill="none" stroke="#ff4060" strokeWidth="2" style={{animation:'ripple 1.5s ease-out infinite'}}/>}
    </svg>
  )
}

function SettingsModal({ config, onSave, onClose }) {
  const [key, setKey] = useState(config.anthropicKey || '')
  const [wKey, setWKey] = useState(config.weatherKey || '')
  const [name, setName] = useState(config.userName || '')
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,5,15,0.95)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }}>
      <div style={{ background:'#020f1a',border:'1px solid rgba(0,200,255,0.25)',borderRadius:12,padding:24,width:'100%',maxWidth:360 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
          <span style={{ fontFamily:"'Orbitron',monospace",fontSize:13,color:'#00e5ff',letterSpacing:'0.15em' }}>⚙ CONFIGURATION</span>
          {config.anthropicKey && <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(0,200,255,0.5)',cursor:'pointer',fontSize:18 }}>✕</button>}
        </div>
        <p style={{ fontSize:10,color:'rgba(0,180,200,0.4)',marginBottom:16,lineHeight:1.6,fontFamily:"'Share Tech Mono',monospace" }}>Vos clés sont stockées uniquement sur votre appareil.</p>
        {[
          { label:'Clé API Anthropic (Claude) *', val:key, set:setKey, ph:'sk-ant-...', link:'https://console.anthropic.com', linkTxt:'→ Obtenir une clé Anthropic' },
          { label:'Clé OpenWeatherMap (météo, optionnel)', val:wKey, set:setWKey, ph:'Optionnel...', link:'https://openweathermap.org/api', linkTxt:'→ Obtenir une clé météo gratuite' },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:14 }}>
            <div style={{ fontSize:9,color:'rgba(0,150,200,0.6)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6,fontFamily:"'Share Tech Mono',monospace" }}>{f.label}</div>
            <input type="password" value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
              style={{ width:'100%',background:'rgba(0,40,80,0.3)',border:'1px solid rgba(0,150,200,0.25)',borderRadius:6,padding:'8px 12px',color:'rgba(200,235,255,0.9)',fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:'none' }}/>
            <a href={f.link} target="_blank" rel="noopener" style={{ display:'block',fontSize:9,color:'rgba(0,200,255,0.5)',marginTop:4,textDecoration:'none',fontFamily:"'Share Tech Mono',monospace" }}>{f.linkTxt}</a>
          </div>
        ))}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9,color:'rgba(0,150,200,0.6)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6,fontFamily:"'Share Tech Mono',monospace" }}>Votre prénom</div>
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Alex"
            style={{ width:'100%',background:'rgba(0,40,80,0.3)',border:'1px solid rgba(0,150,200,0.25)',borderRadius:6,padding:'8px 12px',color:'rgba(200,235,255,0.9)',fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:'none' }}/>
        </div>
        <button onClick={() => { onSave({ anthropicKey:key.trim(), weatherKey:wKey.trim(), userName:name.trim() }); onClose() }}
          disabled={!key.trim()}
          style={{ width:'100%',padding:12,background: key.trim()?'rgba(0,150,255,0.15)':'rgba(0,50,80,0.1)',border:`1px solid ${key.trim()?'rgba(0,200,255,0.4)':'rgba(0,100,150,0.2)'}`,borderRadius:8,color:key.trim()?'#00e5ff':'rgba(0,150,200,0.3)',fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:'0.15em',cursor:key.trim()?'pointer':'not-allowed' }}>
          ACTIVER LES SYSTÈMES
        </button>
      </div>
    </div>
  )
}

// ============ MAIN APP ============
function App() {
  const [config, setConfig] = useState(loadConfig)
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState([{ role:'assistant', content:'Systèmes en ligne. Bonjour — je suis JARVIS. Comment puis-je vous assister ?' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [reminders, setReminders] = useState(loadReminders)
  const [time, setTime] = useState(new Date())
  const [showPanel, setShowPanel] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const { speaking, speak, stop: stopTTS } = useTTS()

  const handleVoiceResult = useCallback((text) => {
    if (!text) return
    sendMessage(text)
  }, [config, messages])

  const { listening, transcript, supported: voiceOk, start: startMic, stop: stopMic } = useSpeechRec(handleVoiceResult)

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, loading])
  useEffect(() => { if (!config.anthropicKey) setShowSettings(true) }, [])

  const sendMessage = useCallback(async (override) => {
    const text = (override ?? input).trim()
    if (!text || loading) return
    if (!config.anthropicKey) { setShowSettings(true); return }
    stopTTS()
    const userMsg = { role:'user', content: text }
    const history = [...messages, userMsg]
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':config.anthropicKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1024, system:SYSTEM_PROMPT, messages: history.map(m=>({role:m.role,content:m.content})) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Erreur API')
      const reply = data.content?.map(b=>b.text||'').join('') || 'Aucune réponse.'
      // Handle reminder command
      const reminderMatch = reply.match(/RAPPEL_CREER:\s*(.+?)\s*\|\s*(\d{1,2}:\d{2})/i)
      if (reminderMatch) {
        const newR = { id:Date.now(), title:reminderMatch[1].trim(), time:reminderMatch[2].trim(), done:false }
        const updated = [...loadReminders(), newR]
        saveRemindersStore(updated)
        setReminders(updated)
      }
      const cleanReply = reply.replace(/RAPPEL_CREER:.*$/gm,'').trim()
      setMessages(prev => [...prev, { role:'assistant', content:cleanReply }])
      speak(cleanReply)
    } catch(e) {
      setMessages(prev => [...prev, { role:'assistant', content:`Anomalie système: ${e.message}` }])
    }
    setLoading(false)
  }, [input, loading, config, messages, speak, stopTTS])

  const handleKey = (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const fmtTime = d => d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  const fmtDate = d => d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
  const voiceColor = listening?'#ff4060':speaking?'#00ff88':loading?'#ffaa00':'#00e5ff'
  const voiceLabel = listening?'ÉCOUTE...':speaking?'JARVIS PARLE...':loading?'TRAITEMENT...':'EN ATTENTE'

  return (
    <div style={{ height:'100%',display:'flex',flexDirection:'column',background:'#010a12',overflow:'hidden',position:'relative',fontFamily:"'Exo 2',sans-serif" }}>
      {/* Scanline */}
      <div style={{ position:'fixed',left:0,right:0,height:2,background:'linear-gradient(transparent,rgba(0,200,255,0.05),transparent)',animation:'scanline 10s linear infinite',pointerEvents:'none',zIndex:100 }}/>
      {/* Grid */}
      <div style={{ position:'fixed',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(0,150,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,150,255,0.03) 1px,transparent 1px)',backgroundSize:'40px 40px',zIndex:0 }}/>

      {showSettings && <SettingsModal config={config} onSave={c=>{setConfig(c);saveConfigStore(c)}} onClose={()=>{ if(config.anthropicKey) setShowSettings(false) }}/>}

      {/* HEADER */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(0,150,200,0.15)',background:'rgba(1,10,18,0.95)',backdropFilter:'blur(10px)',zIndex:10,flexShrink:0 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ position:'relative',width:38,height:38 }}>
            <CircularViz size={38} listening={listening} speaking={speaking}/>
            <span style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:11,fontWeight:700,color:'#00e5ff',fontFamily:"'Orbitron',monospace",zIndex:1 }}>J</span>
          </div>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,letterSpacing:'0.15em',color:'#00e5ff' }}>J.A.R.V.I.S</div>
            <div style={{ fontSize:8,letterSpacing:'0.2em',fontFamily:"'Share Tech Mono',monospace",color:voiceColor,marginTop:1 }}>● {voiceLabel}</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:'#00e5ff',letterSpacing:'0.05em' }}>{fmtTime(time)}</div>
            <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:8,color:'rgba(0,180,220,0.4)',letterSpacing:'0.1em',textTransform:'uppercase' }}>{fmtDate(time)}</div>
          </div>
          <button onClick={()=>setShowSettings(true)} style={{ background:'none',border:'none',color:'rgba(0,200,255,0.5)',cursor:'pointer',fontSize:18,padding:4 }}>⚙</button>
        </div>
      </div>

      {/* VIZ */}
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 0 4px',position:'relative',height:90,flexShrink:0,zIndex:5 }}>
        <div style={{ position:'relative',width:90,height:90 }}>
          <CircularViz size={90} listening={listening} speaking={speaking}/>
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={scrollRef} style={{ flex:1,overflowY:'auto',padding:'8px 14px 10px',display:'flex',flexDirection:'column',zIndex:5 }}>
        {messages.map((msg,i) => (
          <div key={i} className="msg-anim" style={{ display:'flex',flexDirection:msg.role==='user'?'row-reverse':'row',gap:8,marginBottom:10,alignItems:'flex-start' }}>
            <div style={{ width:26,height:26,borderRadius:'50%',border:`1px solid ${msg.role==='user'?'rgba(0,150,255,0.4)':'rgba(0,245,255,0.35)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#00e5ff',fontFamily:"'Share Tech Mono',monospace",flexShrink:0,background:'rgba(0,10,20,0.8)' }}>
              {msg.role==='user'?(config.userName?config.userName[0].toUpperCase():'M'):'J'}
            </div>
            <div style={{ maxWidth:'78%',border:`1px solid ${msg.role==='user'?'rgba(0,130,255,0.2)':'rgba(0,245,255,0.12)'}`,background:msg.role==='user'?'rgba(0,80,160,0.12)':'rgba(0,200,255,0.05)',borderRadius:msg.role==='user'?'12px 4px 12px 12px':'4px 12px 12px 12px',padding:'8px 12px',fontSize:12,lineHeight:1.65,color:'rgba(210,240,255,0.92)',whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex',gap:8,marginBottom:10,alignItems:'flex-start' }}>
            <div style={{ width:26,height:26,borderRadius:'50%',border:'1px solid rgba(0,245,255,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#00e5ff',fontFamily:"'Share Tech Mono',monospace",flexShrink:0,background:'rgba(0,10,20,0.8)' }}>J</div>
            <div style={{ border:'1px solid rgba(0,245,255,0.12)',background:'rgba(0,200,255,0.05)',borderRadius:'4px 12px 12px 12px',padding:'10px 14px',display:'flex',gap:5 }}>
              {[0,0.2,0.4].map(d=><div key={d} style={{ width:6,height:6,borderRadius:'50%',background:'#00e5ff',animation:`pulse 1.2s ${d}s ease-in-out infinite` }}/>)}
            </div>
          </div>
        )}
      </div>

      {/* REMINDERS PANEL */}
      {showPanel && reminders.filter(r=>!r.done).length > 0 && (
        <div style={{ padding:'8px 16px',borderTop:'1px solid rgba(0,150,200,0.1)',background:'rgba(0,8,18,0.9)',zIndex:10,flexShrink:0 }}>
          <div style={{ fontSize:8,letterSpacing:'0.2em',color:'rgba(0,150,200,0.5)',marginBottom:6,fontFamily:"'Share Tech Mono',monospace" }}>RAPPELS ACTIFS</div>
          {reminders.filter(r=>!r.done).map(r=>(
            <div key={r.id} style={{ display:'flex',gap:8,alignItems:'center',marginBottom:4,padding:'4px 8px',background:'rgba(0,150,200,0.06)',border:'1px solid rgba(0,150,200,0.12)',borderRadius:4 }}>
              <span style={{ fontSize:9,color:'#00e5ff',fontFamily:"'Share Tech Mono',monospace",minWidth:32 }}>{r.time}</span>
              <span style={{ fontSize:10,color:'rgba(180,220,240,0.8)',flex:1 }}>{r.title}</span>
              <button onClick={()=>{ const u=reminders.filter(x=>x.id!==r.id); saveRemindersStore(u); setReminders(u) }} style={{ background:'none',border:'none',color:'rgba(255,80,80,0.5)',cursor:'pointer',fontSize:10 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* SUGGESTIONS */}
      <div style={{ display:'flex',gap:6,padding:'4px 14px 6px',overflowX:'auto',flexShrink:0,zIndex:10 }}>
        {['Quelle heure est-il ?','Rappel à 18h00','Blague sophistiquée','Mode bref'].map(s=>(
          <button key={s} className="sugg-btn" onClick={()=>{setInput(s);inputRef.current?.focus()}}
            style={{ fontSize:9,padding:'4px 10px',background:'rgba(0,80,150,0.1)',border:'1px solid rgba(0,150,200,0.2)',borderRadius:20,color:'rgba(130,200,240,0.7)',cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Share Tech Mono',monospace",flexShrink:0,transition:'all 0.2s' }}>
            {s}
          </button>
        ))}
        {reminders.filter(r=>!r.done).length > 0 && (
          <button onClick={()=>setShowPanel(p=>!p)}
            style={{ fontSize:9,padding:'4px 10px',background:'rgba(0,200,100,0.1)',border:'1px solid rgba(0,200,100,0.2)',borderRadius:20,color:'rgba(0,220,120,0.7)',cursor:'pointer',whiteSpace:'nowrap',fontFamily:"'Share Tech Mono',monospace",flexShrink:0 }}>
            ⏰ {reminders.filter(r=>!r.done).length} rappel(s)
          </button>
        )}
      </div>

      {/* INPUT */}
      <div style={{ padding:'8px 14px 12px',borderTop:'1px solid rgba(0,150,200,0.12)',background:'rgba(1,8,16,0.97)',backdropFilter:'blur(8px)',flexShrink:0,zIndex:10 }}>
        <div style={{ display:'flex',gap:8,alignItems:'flex-end' }}>
          {voiceOk && (
            <button
              onMouseDown={startMic} onMouseUp={stopMic}
              onTouchStart={e=>{e.preventDefault();startMic()}} onTouchEnd={e=>{e.preventDefault();stopMic()}}
              style={{ width:40,height:40,borderRadius:'50%',background:'rgba(0,20,40,0.8)',border:`1px solid ${listening?'#ff4060':'rgba(0,200,255,0.3)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:listening?'0 0 16px rgba(255,60,80,0.4)':'none',transition:'all 0.2s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={listening?'#ff4060':'#00e5ff'} strokeWidth="2">
                <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
              </svg>
            </button>
          )}
          <div style={{ flex:1,display:'flex',alignItems:'flex-end',gap:6,background:'rgba(0,30,60,0.2)',border:'1px solid rgba(0,150,200,0.2)',borderRadius:10,padding:'8px 12px' }}>
            <span style={{ fontSize:10,color:'rgba(0,200,255,0.35)',fontFamily:"'Share Tech Mono',monospace",paddingBottom:2,flexShrink:0 }}>&gt;_</span>
            <textarea ref={inputRef} value={listening?transcript:input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={listening?'Écoute...':'Entrez votre commande...'} rows={1}
              style={{ flex:1,background:'transparent',border:'none',color:'rgba(200,235,255,0.9)',fontSize:13,fontFamily:"'Exo 2',sans-serif",lineHeight:1.5,maxHeight:80,caretColor:'#00e5ff' }}/>
          </div>
          <button onClick={()=>sendMessage()} disabled={(!input.trim()&&!transcript.trim())||loading}
            style={{ width:38,height:38,borderRadius:'50%',background:'rgba(0,150,255,0.15)',border:'1px solid rgba(0,200,255,0.4)',color:'#00e5ff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:(input.trim()||transcript.trim())&&!loading?1:0.3,transition:'all 0.2s' }}>↑</button>
        </div>
        <div style={{ textAlign:'center',fontSize:9,color:'rgba(0,130,160,0.3)',marginTop:5,fontFamily:"'Share Tech Mono',monospace",letterSpacing:'0.05em' }}>
          {voiceOk?'Maintenir 🎤 pour parler · ENTRÉE pour envoyer':'ENTRÉE pour envoyer'}
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
