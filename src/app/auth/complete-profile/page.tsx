'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { generateId } from '@/lib/utils'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestedId, setSuggestedId] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      setUser(session.user)
      
      // 如果已经有姓名，直接去首页
      if (session.user.user_metadata?.full_name) {
        router.push('/')
      }

      // 生成预期的专属 ID
      setSuggestedId(generateId('RP'))
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !user) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          custom_id: suggestedId,
          role: 'user' // 默认注册为普通用户
        }
      })

      if (error) {
        alert('更新失败: ' + error.message)
      } else {
        localStorage.setItem('demo_is_logged_in', 'true')
        localStorage.setItem('demo_user_role', 'user')
        window.dispatchEvent(new Event('storage'))
        router.push('/')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('发生错误，请重试')
    } finally {
      setIsLoading(false)
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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl mb-4 shadow-2xl">
            <Sparkles className="text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-2">
            开启探索之旅
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em]">
            最后一步：完善您的个人资料
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl text-center">
          <div className="mb-8">
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">您的专属 ID</p>
            <div className="inline-block px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-2xl font-black italic tracking-wider text-blue-400">
              {suggestedId || 'RP********'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="px-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                您的真实姓名
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="请输入您的姓名"
                  className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !fullName.trim()}
              className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-3xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? '正在保存...' : '完成并进入'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="mt-8 text-zinc-600 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            您的隐私受到我们的严格保护
          </p>
        </div>
      </div>
    </main>
  )
}
