import { deleteReminder } from '../services/reminders.js'

export default function RemindersPanel({ reminders, onUpdate }) {
  const active = reminders.filter(r => !r.done)

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={styles.label}>RAPPELS ({active.length})</div>
      {active.length === 0
        ? <div style={styles.empty}>Aucun rappel actif</div>
        : active.slice(0, 3).map(r => (
          <div key={r.id} style={styles.item}>
            <div style={styles.time}>{r.time}</div>
            <div style={styles.title}>{r.title}</div>
            <button onClick={() => { deleteReminder(r.id); onUpdate() }} style={styles.del}>✕</button>
          </div>
        ))
      }
    </div>
  )
}

const styles = {
  label: { fontSize: 8, letterSpacing: '0.2em', color: 'rgba(0,150,200,0.5)', textTransform: 'uppercase', fontFamily: "'Share Tech Mono', monospace", marginBottom: 6 },
  empty: { fontSize: 9, color: 'rgba(0,120,160,0.4)', fontFamily: "'Share Tech Mono', monospace" },
  item: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '4px 6px', background: 'rgba(0,150,200,0.06)', borderRadius: 4, border: '1px solid rgba(0,150,200,0.12)' },
  time: { fontSize: 9, color: '#00e5ff', fontFamily: "'Share Tech Mono', monospace", minWidth: 32 },
  title: { fontSize: 9, color: 'rgba(180,220,240,0.8)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  del: { background: 'none', border: 'none', color: 'rgba(255,60,80,0.5)', cursor: 'pointer', fontSize: 9, padding: '0 2px', flexShrink: 0 }
}
