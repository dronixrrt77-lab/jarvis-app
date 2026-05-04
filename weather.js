const BASE = 'https://api.openweathermap.org/data/2.5'

export async function getWeather(apiKey, city = null) {
  if (!apiKey) return null

  let url
  if (city) {
    url = `${BASE}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`
  } else {
    // Try geolocation first
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      )
      url = `${BASE}/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&appid=${apiKey}&units=metric&lang=fr`
    } catch {
      return null
    }
  }

  const r = await fetch(url)
  if (!r.ok) return null
  const d = await r.json()

  return {
    city: d.name,
    country: d.sys.country,
    temp: Math.round(d.main.temp),
    feels: Math.round(d.main.feels_like),
    desc: d.weather[0].description,
    humidity: d.main.humidity,
    wind: Math.round(d.wind.speed * 3.6),
    icon: d.weather[0].icon,
    code: d.weather[0].id
  }
}

export function weatherToText(w) {
  if (!w) return ''
  return `Météo à ${w.city} (${w.country}): ${w.temp}°C, ressenti ${w.feels}°C, ${w.desc}, humidité ${w.humidity}%, vent ${w.wind} km/h`
}

export function getWeatherEmoji(code) {
  if (code >= 200 && code < 300) return '⛈️'
  if (code >= 300 && code < 400) return '🌧️'
  if (code >= 500 && code < 600) return '🌧️'
  if (code >= 600 && code < 700) return '❄️'
  if (code >= 700 && code < 800) return '🌫️'
  if (code === 800) return '☀️'
  if (code === 801) return '🌤️'
  if (code <= 804) return '☁️'
  return '🌡️'
}
