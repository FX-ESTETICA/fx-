'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, ArrowRight, Chrome, Facebook, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { Provider } from '@supabase/supabase-js'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('code')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isCounting, setIsCounting] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isCounting && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    } else if (countdown === 0) {
      setIsCounting(false)
    }
    return () => clearInterval(timer)
  }, [isCounting, countdown])

  const handleGetCode = async () => {
    if (!email) return
    setIsCounting(true)
    setCountdown(60)
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (data.error) {
        console.error('Failed to send email:', data.error)
        // Reset countdown if failed
        setIsCounting(false)
        setCountdown(0)
        alert('发送验证码失败: ' + data.error)
      } else {
        console.log('Verification code sent to:', email)
      }
    } catch (error) {
      console.error('Error sending code:', error)
      setIsCounting(false)
      setCountdown(0)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Set simulation flags
    localStorage.setItem('demo_is_logged_in', 'true')
    // Default to merchant for demo if it's the admin email, else user
    const role = email.includes('admin') ? 'merchant' : 'user'
    localStorage.setItem('demo_user_role', role)
    window.dispatchEvent(new Event('storage'))
    
    setIsLoading(false)
    router.push('/me')
  }

  const handleSocialLogin = async (provider: Provider) => {
    const supabase = createClient()
    // 强制使用 localhost 域名，避免 0.0.0.0 导致重定向失败
    const origin = window.location.origin.replace('0.0.0.0', 'localhost')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    })

    if (error) {
      console.error('Social login error:', error.message)
      alert('登录失败: ' + error.message)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Image with Dark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src="/wallhaven-eo68l8.jpg" 
          alt="background" 
          className="w-full h-full object-cover opacity-20 grayscale-[0.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/80 via-transparent to-[#0a0a0c]/90" />
      </div>

      {/* Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Brand Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-4 shadow-2xl">
            <span className="text-2xl font-black italic text-white tracking-tighter">R.</span>
          </div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-2">
            RAPALLO
          </h1>
          <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.3em]">
            本地生活服务平台
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-zinc-500 text-xs font-bold mb-4 text-center">使用社交账号一键进入</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all group font-black uppercase text-[10px] tracking-widest shadow-xl shadow-white/5"
                title="Google"
              >
                <Chrome size={18} />
                Google
              </button>
              <button 
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#1877F2] text-white hover:bg-[#1877F2]/90 transition-all group font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/10"
                title="Facebook"
              >
                <Facebook size={18} />
                Facebook
              </button>
            </div>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-[#0a0a0c] px-4 text-zinc-600">或者使用账号密码</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                电子邮箱
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  required
                />
              </div>
            </div>

            {loginMode === 'code' ? (
              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  验证码
                </label>
                <div className="relative group flex gap-3">
                  <div className="relative flex-1">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                    <input 
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="输入验证码"
                      maxLength={6}
                      className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                      required
                    />
                  </div>
                  <button 
                    type="button"
                    disabled={isCounting || !email}
                    onClick={handleGetCode}
                    className={cn(
                      "px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      isCounting ? "bg-white/5 text-zinc-500 cursor-not-allowed" : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 active:scale-95 disabled:opacity-50"
                    )}
                  >
                    {isCounting ? `${countdown}S` : '获取验证码'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  密码
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full bg-white text-black font-black italic uppercase tracking-[0.2em] py-5 rounded-3xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-white/10",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  登 录
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setLoginMode(loginMode === 'code' ? 'password' : 'code')}
                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-400 transition-colors"
              >
                {loginMode === 'code' ? '使用密码登录' : '使用验证码登录'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-center text-zinc-500 text-xs font-bold">
          还没有账号?{' '}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 transition-colors">
            立即注册
          </Link>
        </p>
      </div>
    </main>
  )
}
