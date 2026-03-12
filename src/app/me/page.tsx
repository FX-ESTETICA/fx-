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
import { cn, generateId } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

type UserRole = 'user' | 'merchant' | 'guest'

export default function MePage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole>('user') 
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
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
        setUserName(session.user.user_metadata?.full_name ?? (session.user.email?.split('@')[0] || 'Explorer'))
        setUserId(session.user.user_metadata?.custom_id ?? null)
        
        localStorage.setItem('demo_is_logged_in', 'true')
        localStorage.setItem('demo_user_role', role)
        window.dispatchEvent(new Event('storage'))
      } else if (demoRole === 'guest') {
        // 游客模式
        setUserRole('guest')
        setUserName('访客用户')
        
        let guestId = localStorage.getItem('demo_guest_id')
        if (!guestId) {
          guestId = generateId('GT')
          localStorage.setItem('demo_guest_id', guestId)
        }
        setUserId(guestId)
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
      className="relative w-full bg-[#0a0a0c] pb-32 overflow-x-hidden min-h-screen text-zinc-100 touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Background Image & Effects (Consistent with Explore Page) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src="/wallhaven-eo68l8.jpg" 
          alt="background" 
          className="w-full h-full object-cover opacity-30 grayscale-[0.5] contrast-[1.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/80 via-transparent to-[#0a0a0c]/90" />
      </div>

      {/* Background Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10">
      {/* Session Error Modal */}
      {showSessionError && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900/90 backdrop-blur-2xl rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-8">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">登录已失效</h3>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-relaxed mb-10">
              您的登录状态已过期<br/>请重新登录以保护账号安全
            </p>
            <button 
              onClick={() => {
                localStorage.removeItem('demo_is_logged_in')
                router.push('/auth/login')
              }}
              className="w-full bg-white text-zinc-900 font-black italic uppercase tracking-[0.2em] py-6 rounded-[2rem] active:scale-95 transition-all shadow-xl shadow-white/5"
            >
              确定并重登
            </button>
          </div>
        </div>
      )}

      {/* Role Switcher (For Demo Purposes) */}
      {userRole !== 'guest' && (
        <div className="fixed top-6 right-6 z-[100] bg-white/5 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl">
          <button 
            onClick={toggleRole}
            className="px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2.5 active:scale-95 transition-all hover:bg-white/5"
          >
            {userRole === 'user' ? <User size={14} /> : <Store size={14} />}
            <span className="opacity-80">切换身份:</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md",
              userRole === 'user' ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
            )}>
              {userRole === 'user' ? '普通用户' : '商户'}
            </span>
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className={cn(
        "pt-16 pb-28 px-8 rounded-b-[4rem] shadow-2xl relative overflow-hidden transition-all duration-700 border-b border-white/5",
        userRole === 'merchant' 
          ? "bg-gradient-to-br from-amber-400/20 to-amber-600/5 backdrop-blur-2xl" 
          : (userRole === 'guest' 
              ? "bg-gradient-to-br from-zinc-400/10 to-zinc-600/5 backdrop-blur-2xl" 
              : "bg-gradient-to-br from-zinc-800/40 to-black/40 backdrop-blur-2xl")
      )}>
        {/* Decorative Background Elements */}
        <div className={cn(
          "absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full blur-[100px] opacity-20 animate-pulse",
          userRole === 'merchant' ? "bg-amber-400" : "bg-blue-500"
        )} />
        
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 p-1.5 shadow-2xl relative group overflow-hidden border border-white/10">
            {userRole === 'guest' ? (
              <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/5">
                <span className="text-2xl font-black italic text-white/80 tracking-tighter">GX⁺</span>
              </div>
            ) : (
              <>
                <img 
                  src={userRole === 'merchant' ? "/wallhaven-eo68l8.jpg" : "/wallhaven-qr3o8q.png"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-[2rem]"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                  <Camera size={24} />
                </div>
              </>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {userName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border",
                userRole === 'merchant' 
                  ? "bg-amber-400/10 text-amber-400 border-amber-400/20" 
                  : (userRole === 'guest' 
                      ? "bg-zinc-700/30 text-zinc-400 border-white/5" 
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20")
              )}>
                {userRole === 'merchant' ? '认证商家' : (userRole === 'guest' ? '访客' : '普通用户')}
              </span>
              <span className="text-[11px] font-bold text-zinc-400 tracking-wider">
                {userId ? `ID: ${userId}` : '获取专属 ID'}
              </span>
            </div>
          </div>
          {userRole !== 'guest' && (
            <button className="w-12 h-12 rounded-2xl bg-white/5 text-white border border-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all hover:bg-white/10">
              <Settings size={22} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="px-8 -mt-14 relative z-20">
        <div className="bg-white/10 backdrop-blur-[40px] rounded-[3rem] shadow-2xl border border-white/10 p-8 grid grid-cols-3 gap-6">
          {userRole === 'merchant' ? (
            <>
              <div className="text-center space-y-2">
                <p className="text-3xl font-black italic text-white tracking-tighter">12</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">今日预约</p>
              </div>
              <div className="text-center space-y-2 border-x border-white/5">
                <p className="text-3xl font-black italic text-white tracking-tighter">4.9</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">店铺评分</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-black italic text-white tracking-tighter">1.2k</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">收藏人气</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <p className="text-3xl font-black italic text-white tracking-tighter">{userRole === 'guest' ? '-' : '8'}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">我的预约</p>
              </div>
              <div className="text-center space-y-2 border-x border-white/5">
                <p className="text-3xl font-black italic text-white tracking-tighter">{userRole === 'guest' ? '-' : '24'}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">种草店铺</p>
              </div>
              <div className="text-center space-y-2">
                <p className="text-3xl font-black italic text-white tracking-tighter">{userRole === 'guest' ? '-' : '156'}</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">积分奖励</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 mt-10 space-y-8">
        {/* User Role Banner / Guest Register Banner */}
        {userRole === 'guest' ? (
          <Link 
            href="/auth/register"
            className="block bg-gradient-to-r from-blue-600/80 to-indigo-600/80 backdrop-blur-xl rounded-[3rem] p-8 shadow-xl shadow-blue-500/10 active:scale-95 transition-all group border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-black italic text-white uppercase tracking-tighter">注册成为会员</h4>
                <p className="text-[11px] font-bold text-white/60 mt-2 uppercase tracking-[0.15em]">解锁预约、收藏与积分功能</p>
              </div>
              <div className="w-16 h-16 rounded-[2rem] bg-white/20 flex items-center justify-center text-white group-hover:translate-x-2 transition-transform backdrop-blur-md">
                <UserPlus size={32} />
              </div>
            </div>
          </Link>
        ) : userRole === 'user' && (
          <Link 
            href="/merchant/register"
            className="block bg-gradient-to-r from-amber-400/80 to-orange-500/80 backdrop-blur-xl rounded-[3rem] p-8 shadow-xl shadow-amber-500/10 active:scale-95 transition-all group border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-2xl font-black italic text-zinc-900 uppercase tracking-tighter">入驻成为商户</h4>
                <p className="text-[11px] font-bold text-zinc-900/60 mt-2 uppercase tracking-[0.15em]">发布服务，开启您的数字门店</p>
              </div>
              <div className="w-16 h-16 rounded-[2rem] bg-zinc-900/10 flex items-center justify-center text-zinc-900 group-hover:translate-x-2 transition-transform backdrop-blur-md">
                <Store size={32} />
              </div>
            </div>
          </Link>
        )}

        {/* Merchant Specific Sections */}
        {userRole === 'merchant' && (
          <section>
            <h3 className="px-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
              商店管理 (Merchant Only)
            </h3>
            <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden">
              <button 
                onClick={() => setShowEditDrawer(true)}
                className="w-full flex items-center gap-5 p-6 active:bg-white/5 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                  <Store size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">修改商店资料</p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">名称、分类、价格、联系方式</p>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </button>
              <Link 
                href="/admin"
                className="w-full flex items-center gap-5 p-6 border-t border-white/5 active:bg-white/5 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center border border-emerald-400/20">
                  <Calendar size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">进入后台视图</p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">管理日历、排班与预约</p>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </Link>
            </div>
          </section>
        )}

        {/* General Features */}
        {userRole !== 'guest' && (
          <section>
            <h3 className="px-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
              账号安全
            </h3>
            <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-5 p-6 transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 text-white flex items-center justify-center border border-white/10">
                  <KeyRound size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">初始登录密码</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-mono font-bold tracking-[0.2em] text-zinc-400">
                      {showPassword ? password : '••••••••••'}
                    </span>
                    <button 
                      onClick={() => {
                        if (!restrictedAction()) return
                        setShowPassword(!showPassword)
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  className="px-6 py-3 rounded-2xl bg-white text-zinc-900 text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  修改密码
                </button>
              </div>
            </div>
          </section>
        )}

        {userRole !== 'guest' && (
          <section>
            <h3 className="px-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
              {userRole === 'merchant' ? '基本功能' : '我的足迹'}
            </h3>
            <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden">
              <button 
                onClick={restrictedAction}
                className="w-full flex items-center gap-5 p-6 active:bg-white/5 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-400/10 text-rose-400 flex items-center justify-center border border-rose-400/20">
                  <Heart size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">我的收藏</p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">种草的图片与收藏的店铺</p>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-rose-400 transition-colors" />
              </button>
              <button 
                onClick={restrictedAction}
                className="w-full flex items-center gap-5 p-6 border-t border-white/5 active:bg-white/5 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-400/10 text-blue-400 flex items-center justify-center border border-blue-400/20">
                  <Clock size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">历史预约</p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">查看过去的消费记录与评价</p>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
              </button>
              <button 
                onClick={restrictedAction}
                className="w-full flex items-center gap-5 p-6 border-t border-white/5 active:bg-white/5 transition-colors group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center border border-indigo-400/20">
                  <MapPin size={26} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-black text-white uppercase tracking-tight">收货地址</p>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">管理您的配送与联系地址</p>
                </div>
                <ChevronRight size={20} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </button>
            </div>
          </section>
        )}

        <section>
          <h3 className="px-4 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">
            系统支持
          </h3>
          <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden">
            <button className="w-full flex items-center gap-5 p-6 active:bg-white/5 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-zinc-400/10 text-zinc-400 flex items-center justify-center border border-white/5">
                <MessageCircle size={26} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-black text-white uppercase tracking-tight">在线客服</p>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5">24小时本地生活小助手</p>
              </div>
              <ChevronRight size={20} className="text-zinc-600" />
            </button>
          </div>
        </section>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-6 text-rose-500 font-black italic uppercase tracking-[0.2em] bg-rose-500/10 border border-rose-500/20 rounded-[2.5rem] active:scale-95 transition-all mt-6 shadow-xl shadow-rose-500/5"
        >
          <LogOut size={22} />
          {userRole === 'guest' ? '离开游客模式' : '退出登录'}
        </button>
      </div>

      {/* Password Modal, Success Modal, and Merchant Edit Drawer (Remaining UI logic) */}
      {/* ... keeping standard modal logic forbrevity but ensuring guest restricted ... */}
      
      {showPasswordModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900/90 backdrop-blur-2xl rounded-[3rem] p-10 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">修改登录密码</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] px-2">新密码</label>
                <input 
                  type="password" 
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-base text-white focus:ring-2 focus:ring-white/10 transition-all placeholder:text-zinc-600"
                  placeholder="至少8位，包含字母和数字"
                />
              </div>
              {passwordError && (
                <div className="flex items-center gap-2 px-2 text-rose-500">
                  <div className="w-1 h-1 rounded-full bg-rose-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">{passwordError}</p>
                </div>
              )}
              <button 
                onClick={handleUpdatePassword}
                className="w-full bg-white text-zinc-900 font-black italic uppercase tracking-[0.2em] py-6 rounded-[2rem] active:scale-95 transition-all mt-4 shadow-xl shadow-white/5"
              >
                保存新密码
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900/90 backdrop-blur-2xl rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-8">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-3">修改成功</h3>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-relaxed mb-10">
              新密码已生效<br/>请务必妥善保管您的账号信息
            </p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-white text-zinc-900 font-black italic uppercase tracking-[0.2em] py-6 rounded-[2rem] active:scale-95 transition-all shadow-xl shadow-white/5"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Merchant Edit Drawer implementation */}
      {showEditDrawer && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-4 sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowEditDrawer(false)} />
          <div className="relative bg-zinc-900/90 backdrop-blur-2xl rounded-[3.5rem] w-full max-w-lg overflow-hidden shadow-2xl p-10 border border-white/10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">修改商店资料</h3>
              <button onClick={() => setShowEditDrawer(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            <form onSubmit={handleUpdateShop} className="space-y-8">
              <div className="space-y-3">
                <label className="px-2 text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em]">商店名称</label>
                <input 
                  type="text" 
                  value={shopInfo.name} 
                  onChange={(e) => setShopInfo({...shopInfo, name: e.target.value})} 
                  className="w-full bg-white/5 border border-white/10 rounded-3xl py-5 px-8 text-white focus:ring-2 focus:ring-amber-400/20 transition-all outline-none" 
                />
              </div>
              <button type="submit" className="w-full bg-amber-400 text-zinc-900 font-black italic uppercase tracking-[0.2em] py-6 rounded-[2rem] active:scale-95 transition-all shadow-xl shadow-amber-400/20">
                保存修改
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}
