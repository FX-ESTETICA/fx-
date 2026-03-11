'use client'

import { useState } from 'react'
import { 
  User, 
  Settings, 
  Store, 
  ChevronRight, 
  MessageCircle, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Camera, 
  Heart,
  LogOut,
  X
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function MePage() {
  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [shopInfo, setShopInfo] = useState({
    name: 'Rapallo 美甲沙龙',
    category: '美甲美睫',
    price: '35',
    whatsapp: '393888888888',
    phone: '390185123456',
    address: 'Via Marsala 1, Rapallo',
    description: 'Rapallo 核心区的高端美甲沙龙，提供专业美睫与美甲服务。'
  })

  const handleUpdateShop = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would be a Supabase update
    setShowEditDrawer(false)
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-24">
      {/* Header Profile Card */}
      <div className="bg-amber-400 pt-12 pb-24 px-6 rounded-b-[3rem] shadow-lg relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-xl relative group overflow-hidden">
            <img 
              src="/wallhaven-eo68l8.jpg" 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-2xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera size={20} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black italic text-zinc-900 uppercase tracking-tight">
              Rapallo Admin
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                认证商家
              </span>
              <span className="text-zinc-800/60 text-[10px] font-bold">ID: RAP-001</span>
            </div>
          </div>
          <button className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-zinc-900 border border-white/20 active:scale-90 transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-zinc-100 p-6 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <p className="text-2xl font-black italic text-zinc-900">12</p>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">今日预约</p>
          </div>
          <div className="text-center space-y-1 border-x border-zinc-50">
            <p className="text-2xl font-black italic text-zinc-900">4.9</p>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">店铺评分</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-black italic text-zinc-900">1.2k</p>
            <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">收藏人气</p>
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="px-6 mt-8 space-y-6">
        {/* Shop Management */}
        <section>
          <h3 className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
            商店管理 (Merchant Only)
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden">
            <button 
              onClick={() => setShowEditDrawer(true)}
              className="w-full flex items-center gap-4 p-5 active:bg-zinc-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Store size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">修改商店资料</p>
                <p className="text-[10px] text-zinc-400 font-bold">名称、分类、价格、联系方式</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-amber-500 transition-colors" />
            </button>
            <Link 
              href="/admin"
              className="w-full flex items-center gap-4 p-5 border-t border-zinc-50 active:bg-zinc-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <Calendar size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">进入后台视图</p>
                <p className="text-[10px] text-zinc-400 font-bold">管理日历、排班与预约</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
            </Link>
            <button className="w-full flex items-center gap-4 p-5 border-t border-zinc-50 active:bg-zinc-50 transition-colors group text-zinc-400">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-300 flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black uppercase">账号实名认证</p>
                <p className="text-[10px] font-bold">当前已通过初级认证</p>
              </div>
              <ChevronRight size={18} className="opacity-0" />
            </button>
          </div>
        </section>

        {/* User Sections */}
        <section>
          <h3 className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
            用户功能
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden">
            <button className="w-full flex items-center gap-4 p-5 active:bg-zinc-50 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Heart size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">我的收藏</p>
                <p className="text-[10px] text-zinc-400 font-bold">种草的图片与收藏的店铺</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-rose-500 transition-colors" />
            </button>
            <button className="w-full flex items-center gap-4 p-5 border-t border-zinc-50 active:bg-zinc-50 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <MessageCircle size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">在线客服</p>
                <p className="text-[10px] text-zinc-400 font-bold">24小时本地生活小助手</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        </section>

        <button className="w-full flex items-center justify-center gap-2 p-5 text-rose-500 font-black italic uppercase tracking-[0.2em] bg-rose-50 rounded-3xl active:scale-95 transition-all mt-4">
          <LogOut size={18} />
          退出登录
        </button>
      </div>

      {/* Edit Shop Drawer (Floating Panel) */}
      {showEditDrawer && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowEditDrawer(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative bg-white rounded-t-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-500 ease-out">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic text-zinc-900 uppercase tracking-tighter">
                修改商店资料
              </h2>
              <button 
                onClick={() => setShowEditDrawer(false)}
                className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateShop} className="space-y-6">
              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">店铺名称</label>
                <input 
                  type="text" 
                  value={shopInfo.name}
                  onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-900 focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">所属分类</label>
                  <select 
                    value={shopInfo.category}
                    onChange={(e) => setShopInfo({...shopInfo, category: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-900 outline-none"
                  >
                    <option>美甲美睫</option>
                    <option>美食团购</option>
                    <option>酒店民宿</option>
                    <option>停车位</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">起步价 (€)</label>
                  <input 
                    type="number" 
                    value={shopInfo.price}
                    onChange={(e) => setShopInfo({...shopInfo, price: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">WhatsApp 联系方式</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500">
                    <MessageCircle size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={shopInfo.whatsapp}
                    onChange={(e) => setShopInfo({...shopInfo, whatsapp: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">预约电话</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500">
                    <Phone size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={shopInfo.phone}
                    onChange={(e) => setShopInfo({...shopInfo, phone: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">店铺简介</label>
                <textarea 
                  rows={3}
                  value={shopInfo.description}
                  onChange={(e) => setShopInfo({...shopInfo, description: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-4 text-sm font-bold text-zinc-900 outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-amber-400 text-zinc-900 py-5 rounded-3xl font-black italic uppercase tracking-[0.2em] shadow-lg shadow-amber-400/20 active:scale-95 transition-all mt-4"
              >
                保存修改
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
