import React, { useState, useEffect } from 'react'
import { WeatherView } from '@/modules/core/components/WeatherView'

export default function WeatherDisplay() {
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=44.35&longitude=9.23&current=temperature_2m,weather_code&timezone=Europe%2FRome')
        const data = await res.json()
        if (data.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code
          })
        }
      } catch (e) {
        console.error('Failed to fetch weather', e)
      }
    }
    fetchWeather()
    const interval = setInterval(fetchWeather, 30 * 60 * 1000) // update every 30 mins
    return () => clearInterval(interval)
  }, [])

  if (!weather) return null

  return (
    <WeatherView temp={weather.temp} code={weather.code} />
  )
}
