'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
// import 'leaflet/dist/leaflet.css' // 注释掉这个会导致问题的引用
import { cn } from '@/lib/utils'
import { Navigation, MapPin, Bus, Train } from 'lucide-react'
import { useEffect, useState } from 'react'

// 手动注入 Leaflet 样式，避免 Next.js 尝试解析不存在的 png 资源
const leafletStyles = `
  .leaflet-container { height: 100%; width: 100%; background: #f8f9fa; }
  .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-image-layer, .leaflet-pane > svg path, .leaflet-tile-container { pointer-events: none; }
  .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-pane > svg path { pointer-events: auto; }
  .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid rgba(0,0,0,0.05); }
  .leaflet-popup-tip { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); }
  .leaflet-div-icon { background: transparent; border: none; }
  
  @keyframes pulse-blue {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
  .user-location-pulse {
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    animation: pulse-blue 2s infinite;
  }
`;

// Fix default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface Merchant {
  id: number | string
  name: string
  lat: number
  lng: number
  status: 'available' | 'busy'
  category: string
  isParking?: boolean
  isTransport?: boolean
  transportType?: 'bus' | 'train'
  parkingFee?: string // 'free' | '€2.50/h' | etc.
}

const MOCK_MERCHANTS: Merchant[] = [
  { id: 1, name: 'Rapallo 美甲沙龙', lat: 44.3508, lng: 9.2312, status: 'available', category: '美容' },
  { id: 2, name: 'Bella Vista 意面馆', lat: 44.3521, lng: 9.2345, status: 'busy', category: '餐饮' },
]

interface MapComponentProps {
  showMerchants?: boolean
  showParking?: boolean
  showTransport?: 'bus' | 'train'
}

export default function MapComponent({ showMerchants = true, showParking = true, showTransport }: MapComponentProps) {
  const center: [number, number] = [44.3512, 9.2314] // Center of Rapallo
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [parkingLots, setParkingLots] = useState<Merchant[]>([])
  const [transportStops, setTransportStops] = useState<Merchant[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 获取真实停车场数据 (OpenStreetMap Overpass API)
  const fetchParkingData = async () => {
    setIsLoading(true)
    const overpassUrl = 'https://overpass-api.de/api/interpreter'
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="parking"](44.34,9.22,44.36,9.24);
        way["amenity"="parking"](44.34,9.22,44.36,9.24);
      );
      out center;
    `
    
    try {
      const response = await fetch(overpassUrl, {
        method: 'POST',
        body: query,
      })
      const data = await response.json()
      
      const realParking: Merchant[] = data.elements.map((el: any) => ({
        id: `osm-parking-${el.id}`,
        name: el.tags.name || '公共停车场',
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        status: 'available',
        category: '生活服务',
        isParking: true,
        parkingFee: el.tags.fee === 'no' ? 'FREE' : (el.tags.fee === 'yes' ? '收费' : '未知')
      }))
      
      setParkingLots(realParking)
    } catch (error) {
      console.error("Error fetching parking data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取公共交通数据 (OpenStreetMap Overpass API)
  const fetchTransportData = async (type: 'bus' | 'train') => {
    setIsLoading(true)
    const overpassUrl = 'https://overpass-api.de/api/interpreter'
    
    // 公交车站: highway=bus_stop 或 amenity=bus_station
    // 火车站: railway=station
    const filter = type === 'bus' 
      ? '(node["highway"="bus_stop"](44.34,9.22,44.36,9.24);node["amenity"="bus_station"](44.34,9.22,44.36,9.24);)'
      : 'node["railway"="station"](44.34,9.22,44.36,9.24);'

    const query = `
      [out:json][timeout:25];
      ${filter}
      out center;
    `
    
    try {
      const response = await fetch(overpassUrl, {
        method: 'POST',
        body: query,
      })
      const data = await response.json()
      
      const realTransport: Merchant[] = data.elements.map((el: any) => ({
        id: `osm-transport-${el.id}`,
        name: el.tags.name || (type === 'bus' ? '公交站' : '火车站'),
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        status: 'available',
        category: '公共交通',
        isTransport: true,
        transportType: type
      }))
      
      setTransportStops(realTransport)
    } catch (error) {
      console.error("Error fetching transport data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (showParking) fetchParkingData()
    if (showTransport) fetchTransportData(showTransport)
    
    // 获取用户位置
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.warn("Error getting location:", error)
        }
      )
    }
  }, [showParking, showTransport])

  const handleNavigate = (shop: Merchant) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const url = isIOS 
      ? `maps://?q=${encodeURIComponent(shop.name)}&ll=${shop.lat},${shop.lng}`
      : `geo:${shop.lat},${shop.lng}?q=${encodeURIComponent(shop.name)}`
    
    window.open(url, '_blank')
  }

  return (
    <div className="w-full h-full relative">
      <style dangerouslySetInnerHTML={{ __html: leafletStyles }} />
      {/* 引入 CDN 上的 Leaflet CSS，绕过本地构建工具对图片的解析 */}
      <link 
        rel="stylesheet" 
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
        crossOrigin="" 
      />
      <MapContainer 
        center={center} 
        zoom={16} 
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        doubleClickZoom={true}
        touchZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* 用户位置标记 */}
        {userLocation && (
          <Marker 
            position={userLocation}
            icon={L.divIcon({
              className: 'custom-user-icon',
              html: '<div class="user-location-pulse"></div>',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })}
          >
            <Popup>
              <div className="p-1 text-[10px] font-black uppercase">您在这里</div>
            </Popup>
          </Marker>
        )}

        {showMerchants && MOCK_MERCHANTS.map((shop) => (
          <Marker 
            key={shop.id} 
            position={[shop.lat, shop.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute -top-7 flex items-center justify-center min-w-max whitespace-nowrap">
                    <span class="text-[12px] font-black text-zinc-900 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]">${shop.name}</span>
                  </div>
                  <div class="w-3 h-3 rounded-full ${shop.status === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} border-2 border-white shadow-md"></div>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <div className="p-2 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">{shop.name}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">{shop.category}</p>
                </div>

                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                  shop.status === 'available' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  <div className={cn("w-1 h-1 rounded-full", shop.status === 'available' ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                  {shop.status === 'available' ? '今日可约' : '暂无空位'}
                </div>

                <button 
                  onClick={() => handleNavigate(shop)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <Navigation size={12} className="fill-white" />
                  开始导航
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {showParking && parkingLots.map((lot) => (
          <Marker 
            key={lot.id} 
            position={[lot.lat, lot.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  ${lot.parkingFee === 'FREE' ? `
                    <div class="absolute -top-10 bg-emerald-500 px-3 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 min-w-max whitespace-nowrap animate-bounce">
                      <span class="text-[11px] font-black text-white">FREE</span>
                    </div>
                    <div class="w-6 h-6 bg-emerald-500 rounded-full shadow-md border-2 border-white flex items-center justify-center">
                      <span class="text-[12px] font-black text-white">P</span>
                    </div>
                  ` : `
                    <div class="absolute -top-[13px] left-1/2 -translate-x-1/2 flex items-center justify-center min-w-max whitespace-nowrap">
                      <span class="text-[9px] font-black ${lot.parkingFee === '未知' ? 'text-rose-600' : 'text-blue-600'}">${lot.parkingFee}</span>
                    </div>
                    <div class="w-5 h-5 bg-blue-500 rounded-lg shadow-md border-2 border-white flex items-center justify-center">
                      <span class="text-[10px] font-black text-white">P</span>
                    </div>
                  `}
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="p-2 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">{lot.name}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">{lot.category}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black flex justify-between">
                    <span>收费状态:</span>
                    <span>{lot.parkingFee}</span>
                  </div>
                  <div className="bg-zinc-50 text-zinc-500 px-2 py-1 rounded-lg text-[10px] font-black flex justify-between">
                    <span>来源:</span>
                    <span>OSM 实时数据</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleNavigate(lot)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <Navigation size={12} className="fill-white" />
                  开始导航
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {showTransport && transportStops.map((stop) => (
          <Marker 
            key={stop.id} 
            position={[stop.lat, stop.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute -top-7 flex items-center justify-center min-w-max whitespace-nowrap">
                    <span class="text-[12px] font-black text-zinc-900 drop-shadow-[0_1px_1px_rgba(255,255,255,1)]">${stop.name}</span>
                  </div>
                  <div class="w-6 h-6 ${stop.transportType === 'bus' ? 'bg-blue-400' : 'bg-slate-700'} rounded-lg shadow-md border-2 border-white flex items-center justify-center text-white">
                    ${stop.transportType === 'bus' ? '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-1h2Z"/><circle cx="7" cy="17" r="2"/><circle cx="15" cy="17" r="2"/></svg>' : '<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><path d="M2 13 15.5 13"/><path d="M20 13 22 13"/><path d="M12 3 2 13"/><path d="M16 8 2 13"/><path d="M14 3 2 13"/><path d="M2 17 22 17"/><path d="M2 21 22 21"/></svg>'}
                  </div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="p-2 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">{stop.name}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">{stop.transportType === 'bus' ? '公交站点' : '火车站'}</p>
                </div>

                <button 
                  onClick={() => handleNavigate(stop)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  <Navigation size={12} className="fill-white" />
                  开始导航
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
