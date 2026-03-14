import { Scissors, Utensils, ShoppingBag, Car, Camera, Wine, Store, Shirt, Bus, Train, Fuel, Pill, Hospital } from 'lucide-react'

export const MAIN_CATEGORIES = [
  { id: 'beauty', name: '美容', icon: Scissors, color: 'text-pink-500' },
  { id: 'food', name: '餐饮', icon: Utensils, color: 'text-orange-500' },
  { id: 'hotel', name: '酒店', icon: ShoppingBag, color: 'text-blue-500' },
  { id: 'bar', name: '酒吧', icon: Wine, color: 'text-purple-500' },
  { id: 'market', name: '超市', icon: Store, color: 'text-rose-500' },
  { id: 'cloth', name: '服装', icon: Shirt, color: 'text-indigo-500' },
]

export const LIFE_CATEGORIES = [
  { id: 'scenic', name: '景点推荐', icon: Camera, color: 'text-cyan-400' },
  { id: 'parking', name: '停车场', icon: Car, color: 'text-emerald-500' },
  { id: 'bus', name: '公交车', icon: Bus, color: 'text-blue-400' },
  { id: 'train', name: '火车站', icon: Train, color: 'text-slate-400' },
  { id: 'gas', name: '加油站', icon: Fuel, color: 'text-slate-300' },
  { id: 'pharmacy', name: '药房', icon: Pill, color: 'text-red-500' },
  { id: 'hospital', name: '医院', icon: Hospital, color: 'text-blue-500' },
]

export const MERCHANTS: any[] = []
