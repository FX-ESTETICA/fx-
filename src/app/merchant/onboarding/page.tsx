'use client'

import { useState, useEffect } from 'react'
import { Store, MapPin, Phone, MessageCircle, Info, ArrowRight, Camera, Scissors, Utensils, ShoppingBag, Wine, Shirt, MoreHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

const CATEGORIES = [
  { id: 'beauty', name: '美容美发', icon: Scissors },
  { id: 'food', name: '美食餐饮', icon: Utensils },
  { id: 'hotel', name: '酒店住宿', icon: ShoppingBag },
  { id: 'bar', name: '休闲酒吧', icon: Wine },
  { id: 'cloth', name: '时尚服装', icon: Shirt },
  { id: 'other', name: '其他服务', icon: MoreHorizontal },
]

export default function MerchantOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    shopName: '',
    category: '',
    address: '',
    phone: '',
    whatsapp: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      const role = session.user.user_metadata?.role
      if (role !== 'merchant') {
        alert('权限不足，仅限商家访问')
        router.push('/me')
        return
      }
      
      setIsAuthorized(true)
    }
    
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // In a real app, this would save the shop profile
    console.log('Merchant onboarding completed:', formData)

    setIsLoading(false)
    router.push('/admin') // Redirect to merchant dashboard
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 pb-24">
      {/* Header */}
      <div className="bg-zinc-900 text-white pt-16 pb-32 px-6 rounded-b-[3rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
            完善商户资料
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Step {step} of 2: 填写您的店铺信息
          </p>
        </div>
      </div>

      {/* Form Container */}
      <div className="px-6 -mt-20 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-zinc-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">店铺名称</label>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input 
                      type="text"
                      required
                      value={formData.shopName}
                      onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                      placeholder="例如: Rapallo 美甲沙龙"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">选择经营分类</label>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat.id})}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
                          formData.category === cat.id 
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-xl scale-[1.05]" 
                            : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                        )}
                      >
                        <cat.icon size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">店铺地址</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input 
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="Via Marsala 1, Rapallo"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full bg-zinc-900 text-white font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                >
                  下一步
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">联系电话</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input 
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+39 0185 123456"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">WhatsApp (用于预约通知)</label>
                  <div className="relative group">
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <input 
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      placeholder="+39 388 888 8888"
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">店铺简介</label>
                  <div className="relative group">
                    <Info className="absolute left-4 top-4 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={18} />
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="请简要介绍您的店铺..."
                      rows={4}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-zinc-100 text-zinc-500 font-black italic uppercase tracking-widest py-5 rounded-2xl active:scale-95 transition-all"
                  >
                    上一步
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "flex-[2] bg-amber-400 text-black font-black italic uppercase tracking-widest py-5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-amber-400/20",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        完成入驻
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Upload Image Section (Optional/Footer) */}
      <div className="px-6 mt-8">
        <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-zinc-400">
            <Camera size={24} />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-zinc-900">上传店铺照片</p>
            <p className="text-[10px] text-zinc-400 font-bold mt-1">支持 JPG, PNG。建议尺寸 16:9</p>
          </div>
        </div>
      </div>
    </main>
  )
}
