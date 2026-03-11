'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronLeft, Star, Phone, MessageCircle, MapPin, Clock, ShieldCheck, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Calendar from '@/components/Calendar'

// 模拟商家详细数据
const SHOPS_DATA: Record<string, any> = {
  '1': {
    name: 'FX Estetica Rapallo',
    category: '美甲美睫',
    rating: 4.9,
    reviews: 156,
    price: '35',
    address: 'Via Marsala, 12, 16035 Rapallo GE',
    hours: '09:00 - 20:00',
    phone: '+39 0185 123456',
    whatsapp: '3931234567',
    images: [
      'https://images.unsplash.com/photo-1604072366595-e75dc92d6bdc?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Rapallo 领先的美容沙龙，提供专业美甲、美睫及皮肤护理服务。环境优雅，技术精湛。',
    services: [
      { name: '精修美甲 (Manicure)', price: 35, duration: '45min', popular: true },
      { name: '美睫嫁接 (Lash Extension)', price: 60, duration: '90min', popular: true },
      { name: '足部护理 (Pedicure)', price: 45, duration: '60min' },
      { name: '皮肤清洁 (Facial)', price: 50, duration: '60min' },
    ]
  },
  '2': {
    name: 'Bella Vista 餐厅',
    category: '意式料理',
    rating: 4.7,
    reviews: 256,
    price: '60',
    address: 'Lungomare Vittorio Veneto, 25, Rapallo',
    hours: '12:00 - 23:00',
    phone: '+39 0185 654321',
    whatsapp: '3937654321',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800'
    ],
    description: '坐拥海景的顶级意式餐厅，主打新鲜海鲜与手工意面。',
    services: [
      { name: '双人海鲜大餐', price: 88, duration: '90min', popular: true },
      { name: '意式披萨套餐', price: 25, duration: '45min' },
      { name: '提拉米苏', price: 12, duration: '15min' },
    ]
  }
}

export default function ShopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params.id as string
  const shop = SHOPS_DATA[shopId] || SHOPS_DATA['1']
  
  const [showBooking, setShowBooking] = useState(false)
  const [activeTab, setActiveTab] = useState<'services' | 'reviews' | 'about'>('services')
  const [selectedServiceName, setSelectedServiceName] = useState<string | undefined>()

  // Lock body scroll when booking modal is open with mobile-safe position: fixed
  useEffect(() => {
    if (showBooking) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [showBooking])

  const handleBookService = (serviceName?: string) => {
    setSelectedServiceName(serviceName)
    setShowBooking(true)
  }

  return (
    <main className="relative w-full bg-zinc-50 pb-32 overflow-y-auto min-h-screen">
      {/* Top Nav */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all active:scale-90">
            <ShieldCheck size={20} />
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="h-72 w-full relative">
        <img src={shop.images[0]} alt={shop.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-400 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {shop.category}
            </span>
            <div className="flex items-center text-amber-400 gap-0.5 text-xs">
              <Star size={12} fill="currentColor" />
              <span className="font-bold">{shop.rating}</span>
            </div>
          </div>
          <h1 className="text-2xl font-black italic tracking-wide uppercase">{shop.name}</h1>
        </div>
        <div className="absolute bottom-6 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">
          1 / {shop.images.length}
        </div>
      </div>

      {/* Info Card */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-3xl p-5 shadow-xl shadow-zinc-200/50 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
              <MapPin className="text-zinc-400" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-800 font-medium leading-tight">{shop.address}</p>
              <p className="text-xs text-zinc-400 mt-1">距您 0.8km · Rapallo 核心区</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300">
              <ChevronRight size={16} />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100">
              <Clock className="text-zinc-400" size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-zinc-800 font-medium">营业中: {shop.hours}</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-0.5 uppercase">Open Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 px-4">
        <div className="flex border-b border-zinc-200">
          {(['services', 'reviews', 'about'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all relative",
                activeTab === tab ? "text-zinc-950" : "text-zinc-400"
              )}
            >
              {tab === 'services' ? '服务项目' : tab === 'reviews' ? '评价' : '商家介绍'}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {activeTab === 'services' && (
          <div className="space-y-3">
            {shop.services.map((item: any, idx: number) => (
              <div key={idx} className="group bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900">{item.name}</h3>
                      {item.popular && (
                        <span className="text-[8px] font-black bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">Popular</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium">服务耗时: {item.duration}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-950">€{item.price}</p>
                    <button 
                      onClick={() => handleBookService(item.name)}
                      className="mt-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 px-5 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-amber-200 transition-all"
                    >
                      预约
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
            <h3 className="font-bold text-zinc-900">关于我们</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {shop.description}
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">设施服务</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-zinc-600 font-medium bg-white px-2 py-0.5 rounded-full border border-zinc-100">免费WiFi</span>
                  <span className="text-[10px] text-zinc-600 font-medium bg-white px-2 py-0.5 rounded-full border border-zinc-100">提供停车</span>
                </div>
              </div>
              <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">支付方式</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-zinc-600 font-medium bg-white px-2 py-0.5 rounded-full border border-zinc-100">信用卡</span>
                  <span className="text-[10px] text-zinc-600 font-medium bg-white px-2 py-0.5 rounded-full border border-zinc-100">现金</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100 p-4 pb-8 flex gap-3 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <a 
          href={`tel:${shop.phone}`}
          className="w-12 h-12 flex items-center justify-center border border-zinc-200 rounded-2xl active:bg-zinc-50 transition-colors shrink-0"
        >
          <Phone size={20} className="text-zinc-900" />
        </a>
        <a 
          href={`https://wa.me/${shop.whatsapp}`}
          target="_blank"
          className="w-12 h-12 flex items-center justify-center border border-emerald-100 bg-emerald-50 rounded-2xl active:bg-emerald-100 transition-colors shrink-0"
        >
          <MessageCircle size={20} className="text-emerald-600" />
        </a>
        <button 
          onClick={() => handleBookService()}
          className="flex-1 bg-zinc-950 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl flex items-center justify-center shadow-xl shadow-zinc-300 active:scale-[0.98] transition-all"
        >
          立即预约
        </button>
      </div>

      {/* Booking Calendar Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 overscroll-contain">
          <div className="bg-white w-full max-w-4xl h-[95vh] sm:h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom duration-300 overscroll-contain">
            <button 
              onClick={() => setShowBooking(false)} 
              className="absolute top-4 right-4 z-[1000] p-2 bg-black/10 hover:bg-black/20 rounded-full text-zinc-900 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-6 pb-2 border-b border-zinc-100">
              <h2 className="text-lg font-black uppercase tracking-widest text-zinc-950">选择预约时间</h2>
              <p className="text-xs text-zinc-400 font-medium mt-1">请选择您方便的时间段</p>
            </div>

            <div className="flex-1 overflow-hidden overscroll-contain">
              <Calendar mode="customer" lang="zh" initialService={selectedServiceName} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
