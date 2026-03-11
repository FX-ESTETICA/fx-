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

export const MERCHANTS = [
  {
    id: '3',
    name: '中央停车场',
    category: '停车位',
    rating: 4.5,
    price: '2/h',
    distance: '0.3km',
    image: '/wallhaven-xe75wv.png',
    tags: ['车位充足', '24小时'],
  },
  {
    id: '1',
    name: 'Estetica Bloom',
    category: '美甲',
    rating: 4.9,
    price: '35',
    distance: '0.8km',
    image: '/wallhaven-eo68l8.jpg',
    tags: ['今日可约', '环境好', '老店'],
  },
  {
    id: '2',
    name: 'Bella Vista 餐厅',
    category: '餐饮',
    rating: 4.7,
    price: '60',
    distance: '1.2km',
    image: '/wallhaven-qr3o8q.png',
    tags: ['海景', '地道意餐'],
  },
  {
    id: '4',
    name: 'Rapallo 意式咖啡馆',
    category: '酒吧',
    rating: 4.8,
    price: '5',
    distance: '0.5km',
    image: '/wallhaven-eo68l8.jpg',
    tags: ['手工烘焙', '安静'],
  },
  {
    id: '5',
    name: '海滨酒店',
    category: '酒店',
    rating: 4.6,
    price: '120',
    distance: '1.5km',
    image: '/wallhaven-qr3o8q.png',
    tags: ['海景房', '含早餐'],
  },
  {
    id: '6',
    name: '本地海鲜市场',
    category: '餐饮',
    rating: 4.5,
    price: '20',
    distance: '2.0km',
    image: '/wallhaven-xe75wv.png',
    tags: ['新鲜', '实惠'],
  },
]
