import { getWeatherEmoji } from '../services/weather.js'

export default function WeatherWidget({ weather, loading }) {
  if (loading) return (
    <div style={styles.card}>
      <div style={styles.label}>MÉTÉO</div>
      <div style={{ ...styles.value, fontSize: 10, opacity: 0.5 }}>Chargement...</div>
    </div>
  )
  if (!weather) return (
    <div style={styles.card}>
      <div style={styles.label}>MÉTÉO</div>
      <div style={{ ...styles.value, fontSize: 9, opacity: 0.4 }}>Non disponible</div>
    </div>
  )

  return (
    <div style={styles.card}>
      <div style={styles.label}>MÉTÉO · {weather.city}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 18 }}>{getWeatherEmoji(weather.code)}</span>
        <span style={{ ...styles.value, fontSize: 16 }}>{weather.temp}°C</span>
      </div>
      <div style={{ ...styles.sub, marginTop: 2 }}>{weather.desc}</div>
      <div style={{ ...styles.sub, marginTop: 1 }}>💨 {weather.wind} km/h · 💧 {weather.humidity}%</div>
    </div>
  )
}

const styles = {
  card: { padding: '8px 0' },
  label: { fontSize: 8, letterSpacing: '0.2em', color: 'rgba(0,150,200,0.5)', textTransform: 'uppercase', fontFamily: "'Share Tech Mono', monospace" },
  value: { fontFamily: "'Orbitron', monospace", color: '#00e5ff', fontWeight: 600 },
  sub: { fontSize: 9, color: 'rgba(100,180,220,0.6)', fontFamily: "'Share Tech Mono', monospace" }
}
