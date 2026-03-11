'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Settings, 
  Store, 
  Eye,
  EyeOff,
  KeyRound,
  ChevronRight, 
  MessageCircle, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Camera, 
  Heart,
  LogOut,
  X,
  Sparkles,
  Bookmark,
  Clock,
  MapPin,
  ArrowRight,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

type UserRole = 'user' | 'merchant' | 'guest'

export default function MePage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole>('user') 
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showSessionError, setShowSessionError] = useState(false)
  
  useEffect(() => {
    const syncAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const demoRole = localStorage.getItem('demo_user_role') as UserRole
      
      if (session) {
        // 同步用户信息
        const role = session.user.user_metadata?.role || 'user'
        setUserRole(role as UserRole)
        setUserEmail(session.user.email ?? null)
        
        localStorage.setItem('demo_is_logged_in', 'true')
        localStorage.setItem('demo_user_role', role)
        window.dispatchEvent(new Event('storage'))
      } else if (demoRole === 'guest') {
        // 游客模式
        setUserRole('guest')
        setUserEmail('游客 (Guest)')
      } else {
        // 登录已失效
        const wasLoggedIn = localStorage.getItem('demo_is_logged_in') === 'true'
        if (wasLoggedIn) {
          setShowSessionError(true)
        } else {
          router.push('/auth/login')
        }
      }
    }

    syncAuth()
  }, [router])

  const toggleRole = () => {
    if (userRole === 'guest') return
    const newRole = userRole === 'user' ? 'merchant' : 'user'
    setUserRole(newRole)
    localStorage.setItem('demo_user_role', newRole)
    window.dispatchEvent(new Event('storage'))
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('demo_user_role')
    localStorage.removeItem('demo_is_logged_in')
    localStorage.removeItem('demo_stay_logged_in')
    window.dispatchEvent(new Event('storage'))
    router.push('/auth/login')
  }

  const [showEditDrawer, setShowEditDrawer] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Swipe logic
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isRightSwipe) {
      router.push('/explore')
    }
  }

  useEffect(() => {
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = ''
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    
    const savedPassword = localStorage.getItem('demo_user_password')
    if (savedPassword) {
      setPassword(savedPassword)
    } else {
      const newPass = generatePassword()
      setPassword(newPass)
      localStorage.setItem('demo_user_password', newPass)
    }
  }, [])

  const handleUpdatePassword = () => {
    if (userRole === 'guest') return
    if (newPasswordInput.length < 8) {
      setPasswordError('密码长度不足，请输入至少8位密码。')
      return
    }
    const hasLetter = /[a-zA-Z]/.test(newPasswordInput)
    const hasNumber = /[0-9]/.test(newPasswordInput)
    if (!hasLetter || !hasNumber) {
      setPasswordError('密码格式错误：必须同时包含字母和数字。')
      return
    }
    setPassword(newPasswordInput)
    localStorage.setItem('demo_user_password', newPasswordInput)
    setShowPasswordModal(false)
    setNewPasswordInput('')
    setPasswordError('')
    setShowSuccessModal(true)
  }

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
    setShowEditDrawer(false)
  }

  const restrictedAction = () => {
    if (userRole === 'guest') {
      alert('游客模式不支持此操作，请先注册/登录。')
      return false
    }
    return true
  }

  return (
    <main 
      className="min-h-screen bg-zinc-50 pb-24 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Session Error Modal */}
      {showSessionError && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tight text-zinc-900 mb-2">登录已失效</h3>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed mb-8">
              您的登录状态已过期<br/>请重新登录以保护账号安全
            </p>
            <button 
              onClick={() => {
                localStorage.removeItem('demo_is_logged_in')
                router.push('/auth/login')
              }}
              className="w-full bg-zinc-900 text-white font-black italic uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-95 transition-all"
            >
              确定并重登
            </button>
          </div>
        </div>
      )}

      {/* Role Switcher (For Demo Purposes) */}
      {userRole !== 'guest' && (
        <div className="fixed top-4 right-4 z-[100] bg-black/80 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-2xl">
          <button 
            onClick={toggleRole}
            className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-2 active:scale-95 transition-all"
          >
            {userRole === 'user' ? <User size={12} /> : <Store size={12} />}
            切换身份: {userRole === 'user' ? '普通用户' : '商户'}
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className={cn(
        "pt-12 pb-24 px-6 rounded-b-[3rem] shadow-lg relative overflow-hidden transition-colors duration-500",
        userRole === 'merchant' ? "bg-amber-400" : (userRole === 'guest' ? "bg-zinc-400" : "bg-zinc-900")
      )}>
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-white p-1 shadow-xl relative group overflow-hidden">
            <img 
              src={userRole === 'merchant' ? "/wallhaven-eo68l8.jpg" : (userRole === 'guest' ? "/file.svg" : "/wallhaven-qr3o8q.png")} 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-2xl"
            />
            {userRole !== 'guest' && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera size={20} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className={cn(
              "text-2xl font-black italic uppercase tracking-tight",
              userRole === 'merchant' ? "text-zinc-900" : "text-white"
            )}>
              {userRole === 'guest' ? '游客身份' : (userEmail ? userEmail.split('@')[0] : (userRole === 'merchant' ? 'Rapallo Admin' : 'Explorer 001'))}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                userRole === 'merchant' ? "bg-zinc-900 text-white" : (userRole === 'guest' ? "bg-zinc-700 text-white" : "bg-blue-500 text-white")
              )}>
                {userRole === 'merchant' ? '认证商家' : (userRole === 'guest' ? '访客' : '达人会员')}
              </span>
              <span className={cn(
                "text-[10px] font-bold",
                userRole === 'merchant' ? "text-zinc-800/60" : "text-zinc-400"
              )}>
                {userRole === 'guest' ? '登录后体验完整功能' : (userEmail || `ID: USR-772`)}
              </span>
            </div>
          </div>
          {userRole !== 'guest' && (
            <button className={cn(
              "w-10 h-10 rounded-2xl backdrop-blur-md flex items-center justify-center border active:scale-90 transition-all",
              userRole === 'merchant' ? "bg-white/20 text-zinc-900 border-white/20" : "bg-white/5 text-white border-white/10"
            )}>
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="px-6 -mt-12 relative z-20">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-zinc-100 p-6 grid grid-cols-3 gap-4">
          {userRole === 'merchant' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="text-center space-y-1">
                <p className="text-2xl font-black italic text-zinc-900">{userRole === 'guest' ? '-' : '8'}</p>
                <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">我的预约</p>
              </div>
              <div className="text-center space-y-1 border-x border-zinc-50">
                <p className="text-2xl font-black italic text-zinc-900">{userRole === 'guest' ? '-' : '24'}</p>
                <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">种草店铺</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-black italic text-zinc-900">{userRole === 'guest' ? '-' : '156'}</p>
                <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">积分奖励</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 mt-8 space-y-6">
        {/* User Role Banner / Guest Register Banner */}
        {userRole === 'guest' ? (
          <Link 
            href="/auth/register"
            className="block bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2.5rem] p-6 shadow-lg shadow-blue-400/20 active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black italic text-white uppercase tracking-tighter">注册成为会员</h4>
                <p className="text-[10px] font-bold text-white/70 mt-1 uppercase tracking-widest">解锁预约、收藏与积分功能</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                <UserPlus size={24} />
              </div>
            </div>
          </Link>
        ) : userRole === 'user' && (
          <Link 
            href="/auth/register"
            className="block bg-gradient-to-r from-amber-400 to-orange-500 rounded-[2.5rem] p-6 shadow-lg shadow-amber-400/20 active:scale-95 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black italic text-zinc-900 uppercase tracking-tighter">想让您的店出现在这里?</h4>
                <p className="text-[10px] font-bold text-zinc-900/60 mt-1 uppercase tracking-widest">加入 RAPALLO 本地生活服务平台</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-zinc-900 group-hover:translate-x-1 transition-transform">
                <ArrowRight size={24} />
              </div>
            </div>
          </Link>
        )}

        {/* Merchant Specific Sections */}
        {userRole === 'merchant' && (
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
            </div>
          </section>
        )}

        {/* General Features */}
        <section>
          <h3 className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
            账号安全
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden mb-6">
            <div className="flex items-center gap-4 p-5 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-900 flex items-center justify-center">
                <KeyRound size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">初始登录密码</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] font-mono font-bold tracking-wider text-zinc-600">
                    {showPassword ? password : '••••••••••'}
                  </span>
                  <button 
                    onClick={() => {
                      if (!restrictedAction()) return
                      setShowPassword(!showPassword)
                    }}
                    className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-900"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!restrictedAction()) return
                  setShowPasswordModal(true)
                  setNewPasswordInput('')
                  setPasswordError('')
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                修改密码
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
            {userRole === 'merchant' ? '基本功能' : '我的足迹'}
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden">
            <button 
              onClick={restrictedAction}
              className="w-full flex items-center gap-4 p-5 active:bg-zinc-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Heart size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">我的收藏</p>
                <p className="text-[10px] text-zinc-400 font-bold">种草的图片与收藏的店铺</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-rose-500 transition-colors" />
            </button>
            <button 
              onClick={restrictedAction}
              className="w-full flex items-center gap-4 p-5 border-t border-zinc-50 active:bg-zinc-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Clock size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">历史预约</p>
                <p className="text-[10px] text-zinc-400 font-bold">查看过去的消费记录与评价</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
            </button>
            <button 
              onClick={restrictedAction}
              className="w-full flex items-center gap-4 p-5 border-t border-zinc-50 active:bg-zinc-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <MapPin size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">收货地址</p>
                <p className="text-[10px] text-zinc-400 font-bold">管理您的配送与联系地址</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          </div>
        </section>

        <section>
          <h3 className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">
            系统支持
          </h3>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 overflow-hidden">
            <button className="w-full flex items-center gap-4 p-5 active:bg-zinc-50 transition-colors group">
              <div className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-500 flex items-center justify-center">
                <MessageCircle size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-black text-zinc-900 uppercase">在线客服</p>
                <p className="text-[10px] text-zinc-400 font-bold">24小时本地生活小助手</p>
              </div>
              <ChevronRight size={18} className="text-zinc-300" />
            </button>
          </div>
        </section>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-5 text-rose-500 font-black italic uppercase tracking-[0.2em] bg-rose-50 rounded-3xl active:scale-95 transition-all mt-4"
        >
          <LogOut size={18} />
          {userRole === 'guest' ? '离开游客模式' : '退出登录'}
        </button>
      </div>

      {/* Password Modal, Success Modal, and Merchant Edit Drawer (Remaining UI logic) */}
      {/* ... keeping standard modal logic forbrevity but ensuring guest restricted ... */}
      
      {showPasswordModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tight text-zinc-900">修改登录密码</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-zinc-400 hover:text-zinc-900"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">新密码</label>
                <input 
                  type="password" 
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-zinc-900/10 transition-all"
                  placeholder="至少8位，包含字母和数字"
                />
              </div>
              {passwordError && <p className="text-[10px] font-bold text-rose-500 px-2">{passwordError}</p>}
              <button 
                onClick={handleUpdatePassword}
                className="w-full bg-zinc-900 text-white font-black italic uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-95 transition-all mt-4"
              >
                保存新密码
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tight text-zinc-900 mb-2">修改成功</h3>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-8">新密码已生效，请妥善保管</p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-zinc-900 text-white font-black italic uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-95 transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Merchant Edit Drawer implementation */}
      {showEditDrawer && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-4 sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditDrawer(false)} />
          <div className="relative bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-zinc-900">修改商店资料</h3>
              <button onClick={() => setShowEditDrawer(false)} className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateShop} className="space-y-6">
              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">商店名称</label>
                <input type="text" value={shopInfo.name} onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl py-4 px-6 text-sm" />
              </div>
              <button type="submit" className="w-full bg-amber-400 text-zinc-900 font-black italic uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-95 transition-all">保存修改</button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
