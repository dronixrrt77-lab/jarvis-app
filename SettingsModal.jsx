import { useState } from 'react'

export default function SettingsModal({ config, onSave, onClose }) {
  const [anthropicKey, setAnthropicKey] = useState(config.anthropicKey || '')
  const [weatherKey, setWeatherKey]     = useState(config.weatherKey || '')
  const [userName, setUserName]         = useState(config.userName || '')

  const save = () => {
    onSave({ anthropicKey: anthropicKey.trim(), weatherKey: weatherKey.trim(), userName: userName.trim() })
    onClose()
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span style={title}>⚙ CONFIGURATION</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <p style={hint}>Vos clés API sont stockées localement sur votre appareil uniquement.</p>

        <label style={lbl}>Clé API Anthropic (Claude) *</label>
        <input style={inp} type="password" placeholder="sk-ant-..." value={anthropicKey}
          onChange={e => setAnthropicKey(e.target.value)} />
        <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={link}>
          → Obtenir une clé Anthropic
        </a>

        <label style={{ ...lbl, marginTop: 16 }}>Clé API OpenWeatherMap (météo)</label>
        <input style={inp} type="password" placeholder="Optionnel..." value={weatherKey}
          onChange={e => setWeatherKey(e.target.value)} />
        <a href="https://openweathermap.org/api" target="_blank" rel="noopener" style={link}>
          → Obtenir une clé météo (gratuit)
        </a>

        <label style={{ ...lbl, marginTop: 16 }}>Votre prénom (pour la personnalisation)</label>
        <input style={inp} type="text" placeholder="Ex: Alex" value={userName}
          onChange={e => setUserName(e.target.value)} />

        <button onClick={save} disabled={!anthropicKey.trim()} style={{
          ...btn, opacity: anthropicKey.trim() ? 1 : 0.4,
          cursor: anthropicKey.trim() ? 'pointer' : 'not-allowed'
        }}>
          ACTIVER LES SYSTÈMES
        </button>
      </div>
    </div>
  )
}

const overlay = { position:'fixed',inset:0,background:'rgba(0,5,15,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20 }
const modal   = { background:'#020f1a',border:'1px solid rgba(0,200,255,0.25)',borderRadius:12,padding:24,width:'100%',maxWidth:360,boxShadow:'0 0 40px rgba(0,150,255,0.15)' }
const header  = { display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }
const title   = { fontFamily:"'Orbitron',monospace",fontSize:13,color:'#00e5ff',letterSpacing:'0.15em' }
const closeBtn= { background:'none',border:'none',color:'rgba(0,200,255,0.5)',cursor:'pointer',fontSize:16 }
const hint    = { fontSize:10,color:'rgba(0,180,200,0.4)',marginBottom:16,lineHeight:1.5,fontFamily:"'Share Tech Mono',monospace" }
const lbl     = { display:'block',fontSize:9,color:'rgba(0,150,200,0.6)',letterSpacing:'0.15em',textTransform:'uppercase',marginBottom:6,fontFamily:"'Share Tech Mono',monospace" }
const inp     = { width:'100%',background:'rgba(0,40,80,0.3)',border:'1px solid rgba(0,150,200,0.25)',borderRadius:6,padding:'8px 12px',color:'rgba(200,235,255,0.9)',fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:'none' }
const link    = { display:'block',fontSize:9,color:'rgba(0,200,255,0.5)',marginTop:4,textDecoration:'none',fontFamily:"'Share Tech Mono',monospace" }
const btn     = { width:'100%',marginTop:20,padding:'12px',background:'rgba(0,150,255,0.15)',border:'1px solid rgba(0,200,255,0.4)',borderRadius:8,color:'#00e5ff',fontFamily:"'Orbitron',monospace",fontSize:11,letterSpacing:'0.15em' }
