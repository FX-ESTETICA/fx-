'use client'

import React, { useState, useEffect } from 'react'
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
  UserPlus,
  Database
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, generateId, validateUserName } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

type UserRole = 'user' | 'merchant' | 'guest' | 'admin'

export default function MePage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<UserRole>('user') 
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [showSessionError, setShowSessionError] = useState(false)
  const [showNameEditModal, setShowNameEditModal] = useState(false)
  const [newNameInput, setNewNameInput] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    const syncAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const demoRole = localStorage.getItem('demo_user_role') as UserRole
      
      if (session) {
        // 同步用户信息
        const email = session.user.email || ''
        // 管理员白名单邮箱
        const ADMIN_EMAILS = ['499755740@qq.com'] 
        // 如果是特定邮箱或者是管理员角色
        const isAdmin = ADMIN_EMAILS.includes(email) || email.includes('admin') || session.user.user_metadata?.role === 'admin'
        const role = isAdmin ? 'admin' : (session.user.user_metadata?.role || 'user')
        
        setUserRole(role as UserRole)
        setUserEmail(session.user.email ?? null)
        setUserName(session.user.user_metadata?.full_name ?? (session.user.email?.split('@')[0] || 'Explorer'))
        setUserAvatar(session.user.user_metadata?.avatar_url || null)
        
        let rp_id = session.user.user_metadata?.rp_id
        let mc_id = session.user.user_metadata?.mc_id
        let ad_id = session.user.user_metadata?.ad_id
        let updates: Record<string, any> = {}

        // 如果是管理员，确保 AD ID 存在
        if (role === 'admin' && !ad_id) {
          ad_id = generateId('AD')
          updates.ad_id = ad_id
          updates.role = 'admin' // 确保元数据中的角色也是 admin
        }

        // 无论当前是什么角色，都确保普通用户 ID (RP) 存在
        if (!rp_id) {
          rp_id = generateId('RP')
          updates.rp_id = rp_id
        }

        // 如果是管理员或商户，确保商户 ID (MC) 存在
        if ((role === 'merchant' || role === 'admin') && !mc_id) {
          mc_id = generateId('MC')
          updates.mc_id = mc_id
        }

        // 如果有新生成的 ID，同步到数据库
        if (Object.keys(updates).length > 0) {
          await supabase.auth.updateUser({
            data: { ...session.user.user_metadata, ...updates }
          })
        }
        
        // 根据当前角色显示对应的 ID
        if (role === 'admin') {
          setUserId(ad_id)
        } else {
          setUserId(role === 'merchant' ? mc_id : rp_id)
        }
        
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

  const handleUpdateName = async () => {
    setNameError(null)
    const validation = validateUserName(newNameInput, userEmail || undefined)
    if (!validation.isValid) {
      setNameError(validation.error || '名字格式不正确')
      return
    }

    if (isUpdatingName) return
    setIsUpdatingName(true)
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        const { error } = await supabase.auth.updateUser({
          data: { ...session.user.user_metadata, full_name: newNameInput.trim() }
        })
        
        if (error) throw error
        
        setUserName(newNameInput.trim())
        setShowNameEditModal(false)
      }
    } catch (error) {
      console.error('Update name error:', error)
      alert('更新名字失败，请稍后重试')
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleAvatarClick = () => {
    if (userRole === 'guest') return
    avatarInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. 文件类型限制
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('仅支持 JPG, PNG 或 WEBP 格式的图片')
      return
    }

    // 2. 文件大小限制 (最大 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    setIsUploadingAvatar(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) throw new Error('未登录')

      // 3. 上传到 Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) throw uploadError

      // 4. 获取公开 URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 5. 更新用户元数据
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...session.user.user_metadata, avatar_url: publicUrl }
      })

      if (updateError) throw updateError

      // 6. 强制刷新页面或更新状态（这里为了简单直接刷新头像）
      window.location.reload()
    } catch (error) {
      console.error('Avatar upload error:', error)
      alert('头像上传失败，请确保图片内容合规且网络正常')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const toggleRole = async () => {
    if (userRole === 'guest') return
    
    // 获取当前真实的管理员权限状态
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email || ''
    const ADMIN_EMAILS = ['499755740@qq.com']
    const isAdminUser = ADMIN_EMAILS.includes(email) || email.includes('admin') || session?.user?.user_metadata?.role === 'admin'

    let newRole: UserRole = 'user'
    if (userRole === 'user') {
      newRole = 'merchant'
    } else if (userRole === 'merchant') {
      // 只有真正的管理员才能切换到 admin 模式，否则跳回 user
      newRole = isAdminUser ? 'admin' : 'user'
    } else if (userRole === 'admin') {
      newRole = 'user'
    }
    
    if (session) {
      const mc_id = session.user.user_metadata?.mc_id
      const rp_id = session.user.user_metadata?.rp_id
      const ad_id = session.user.user_metadata?.ad_id
      
      if (newRole === 'merchant' && !mc_id) {
        const newMcId = generateId('MC')
        await supabase.auth.updateUser({
          data: { ...session.user.user_metadata, mc_id: newMcId, role: newRole }
        })
        setUserId(newMcId)
      } else if (newRole === 'admin' && !ad_id) {
        const newAdId = generateId('AD')
        await supabase.auth.updateUser({
          data: { ...session.user.user_metadata, ad_id: newAdId, role: newRole }
        })
        setUserId(newAdId)
      } else {
        // 更新元数据中的角色
        await supabase.auth.updateUser({
          data: { ...session.user.user_metadata, role: newRole }
        })
        
        if (newRole === 'admin') setUserId(ad_id)
        else setUserId(newRole === 'merchant' ? mc_id : rp_id)
      }
    }

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
      {/* Name Edit Modal */}
      {showNameEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowNameEditModal(false)} />
          <div className="relative w-full max-w-sm bg-zinc-900/90 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-6">修改您的名字</h3>
            <div className="space-y-4">
              <div className={cn(
                "bg-white/5 rounded-2xl border transition-colors p-4",
                nameError ? "border-rose-500/50" : "border-white/10"
              )}>
                <input 
                  type="text"
                  value={newNameInput}
                  onChange={(e) => {
                    setNewNameInput(e.target.value)
                    setNameError(null)
                  }}
                  placeholder="请输入新名字..."
                  className="w-full bg-transparent border-none text-white font-bold focus:ring-0 placeholder:text-zinc-600"
                  autoFocus
                />
              </div>
              {nameError && (
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-2 animate-in fade-in slide-in-from-top-1">
                  {nameError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowNameEditModal(false)
                    setNameError(null)
                  }}
                  className="flex-1 py-4 rounded-2xl bg-zinc-800 text-zinc-400 text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={handleUpdateName}
                  disabled={isUpdatingName}
                  className="flex-[2] py-4 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdatingName ? '更新中...' : '确认修改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {userRole === 'user' ? <User size={14} /> : (userRole === 'merchant' ? <Store size={14} /> : <ShieldCheck size={14} />)}
            <span className="opacity-80">切换身份:</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md",
              userRole === 'user' ? "bg-blue-500/20 text-blue-400" : (userRole === 'merchant' ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400")
            )}>
              {userRole === 'user' ? '普通用户' : (userRole === 'merchant' ? '商户' : '系统管理员')}
            </span>
          </button>
        </div>
      )}

      {/* Header Profile Card */}
      <div className={cn(
        "pt-16 pb-28 px-8 rounded-b-[4rem] shadow-2xl relative overflow-hidden transition-all duration-700 border-b border-white/5",
        userRole === 'admin'
          ? "bg-gradient-to-br from-rose-500/30 to-rose-900/10 backdrop-blur-2xl"
          : (userRole === 'merchant' 
              ? "bg-gradient-to-br from-amber-400/20 to-amber-600/5 backdrop-blur-2xl" 
              : (userRole === 'guest' 
                  ? "bg-gradient-to-br from-zinc-400/10 to-zinc-600/5 backdrop-blur-2xl" 
                  : "bg-gradient-to-br from-zinc-800/40 to-black/40 backdrop-blur-2xl"))
      )}>
        {/* Decorative Background Elements */}
        <div className={cn(
          "absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full blur-[100px] opacity-20 animate-pulse",
          userRole === 'admin' ? "bg-rose-500" : (userRole === 'merchant' ? "bg-amber-400" : "bg-blue-500")
        )} />
        
        <div className="relative z-10 flex items-center gap-6">
          <input 
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />
          <div 
            onClick={handleAvatarClick}
            className={cn(
              "w-24 h-24 rounded-[2.5rem] bg-white/5 p-1.5 shadow-2xl relative group overflow-hidden border border-white/10",
              userRole !== 'guest' && "cursor-pointer"
            )}
          >
            {userRole === 'guest' ? (
              <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-[2rem] flex items-center justify-center border border-white/5">
                <span className="text-2xl font-black italic text-white/80 tracking-tighter">GX⁺</span>
              </div>
            ) : (
              <>
                <img 
                  src={userAvatar || (userRole === 'admin' ? "/wallhaven-xe75wv.png" : (userRole === 'merchant' ? "/wallhaven-eo68l8.jpg" : "/wallhaven-qr3o8q.png"))} 
                  alt="Avatar" 
                  className="w-full h-full object-cover rounded-[2rem]"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  {isUploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera size={24} />
                      <span className="text-[8px] font-black uppercase mt-1 tracking-widest">更换</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex-1">
            <button 
              onClick={() => {
                if (userRole !== 'guest') {
                  setNewNameInput(userName || '')
                  setShowNameEditModal(true)
                }
              }}
              className="group flex items-center gap-3 text-left"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-white/80 transition-colors">
                  {userName}
                </h2>
                {userRole === 'admin' && (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-rose-500 blur-md opacity-50 animate-pulse rounded-full"></div>
                    <div className="relative bg-gradient-to-tr from-rose-500 to-amber-400 p-1 rounded-lg shadow-lg animate-bounce-in">
                      <ShieldCheck size={18} className="text-white fill-white/20" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <Sparkles size={12} className="text-amber-300 animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
              {userRole !== 'guest' && (
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={12} className="text-white/60" />
                </div>
              )}
            </button>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border",
                userRole === 'admin'
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : (userRole === 'merchant' 
                      ? "bg-amber-400/10 text-amber-400 border-amber-400/20" 
                      : (userRole === 'guest' 
                          ? "bg-zinc-700/30 text-zinc-400 border-white/5" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"))
              )}>
                {userRole === 'admin' ? '系统管理员' : (userRole === 'merchant' ? '认证商家' : (userRole === 'guest' ? '访客' : '普通用户'))}
              </span>
              {userRole === 'admin' ? (
                <span className="text-[11px] font-black tracking-[0.2em] bg-gradient-to-r from-rose-400 via-white to-blue-400 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto] py-1">
                  ID: {userId}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-zinc-400 tracking-wider">
                  ID: {userId}
                </span>
              )}
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
        {userRole === 'admin' ? (
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin" className="block">
              <div className="bg-rose-500/10 backdrop-blur-md p-6 rounded-[2.5rem] border border-rose-500/20 shadow-xl hover:bg-rose-500/20 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                    <Calendar size={18} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/60">日历管理</span>
                </div>
                <div className="text-2xl font-black italic text-white uppercase tracking-tighter">后台管理</div>
              </div>
            </Link>
            <div className="bg-zinc-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-700/50 flex items-center justify-center text-zinc-400">
                  <ShieldCheck size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">全系统权限</span>
              </div>
              <div className="text-2xl font-black italic text-white uppercase tracking-tighter">已激活</div>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Admin Quick Actions */}
      {userRole === 'admin' && (
        <div className="px-8 mt-12 animate-in slide-in-from-bottom duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">管理快捷入口</h3>
            <span className="h-[1px] flex-1 bg-rose-500/20 ml-4" />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button className="w-full p-6 rounded-[2rem] bg-gradient-to-r from-rose-500/20 to-rose-600/5 border border-rose-500/30 flex items-center justify-between group active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/40">
                  <Database size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-white uppercase italic tracking-wider">系统全局管理</div>
                  <div className="text-[10px] font-medium text-rose-500/60 uppercase tracking-widest mt-0.5">访问所有用户、商户及交易数据</div>
                </div>
              </div>
              <ChevronRight className="text-rose-500 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-between group active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-white">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-white uppercase italic tracking-wider">安全策略配置</div>
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">调整全系统的访问控制与安全级别</div>
                </div>
              </div>
              <ChevronRight className="text-zinc-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

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
