const KEY = 'jarvis_reminders'

export function getReminders() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

export function saveReminder(title, time) {
  const reminders = getReminders()
  const id = Date.now()
  reminders.push({ id, title, time, done: false, created: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(reminders))
  scheduleReminder(id, title, time)
  return id
}

export function deleteReminder(id) {
  const reminders = getReminders().filter(r => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(reminders))
}

export function markDone(id) {
  const reminders = getReminders().map(r => r.id === id ? { ...r, done: true } : r)
  localStorage.setItem(KEY, JSON.stringify(reminders))
}

function scheduleReminder(id, title, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  const delay = target - now
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('⚡ JARVIS', { body: title, icon: '/icons/icon-192.png' })
    }
    markDone(id)
  }, delay)
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Parse JARVIS response for reminder commands
export function parseReminderCommand(text) {
  const match = text.match(/RAPPEL_CREER:\s*(.+?)\s*\|\s*(\d{1,2}:\d{2})/i)
  if (!match) return null
  return { title: match[1].trim(), time: match[2].trim() }
}
