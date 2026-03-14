import React from 'react'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/utils/calendar-constants'

interface LockOverlayProps {
  mode: 'admin' | 'customer'
  isCalendarLocked: boolean
  setIsCalendarLocked: (locked: boolean) => void
  isVersionOutdated: boolean
  unlockError: boolean
  setUnlockError: (error: boolean) => void
  handleUnlock: (e: React.FormEvent) => void
  checkVersion: () => Promise<boolean>
  lockPassword: string
  setLockPassword: (password: string) => void
}

export const LockOverlay: React.FC<LockOverlayProps> = ({ 
  mode,
  isCalendarLocked,
  setIsCalendarLocked,
  isVersionOutdated,
  unlockError,
  setUnlockError,
  handleUnlock,
  checkVersion,
  lockPassword,
  setLockPassword
}) => {
  if (mode !== 'admin' || !isCalendarLocked) return null

  return (
    <div className="fixed inset-0 z-[99999] bg-transparent flex items-center justify-center transition-all duration-500 pointer-events-auto">
      <div className="flex flex-col items-center gap-6 p-10 rounded-[2.5rem] bg-transparent border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        {isVersionOutdated ? (
          <div className="flex flex-col items-center gap-6 text-center max-w-xs">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-2 border border-rose-500/30">
              <Settings2 className="w-8 h-8 text-rose-500 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black italic tracking-[0.2em] text-white uppercase">版本更新提示</h2>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                亲：请刷新网页更新最新版本
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-600 active:scale-95 transition-all shadow-xl shadow-rose-500/20"
            >
              立即刷新网页
            </button>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
              Current: v{APP_VERSION}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-2 border border-white/10">
                <span className="text-3xl font-black text-white tracking-tighter">FX</span>
              </div>
              <h2 className="text-xl font-black italic tracking-[0.3em] text-white uppercase [text-shadow:0_1px_1px_rgba(0,0,0,0.8)]">ESTETICA</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Calendar Restricted</p>
            </div>

            <form onSubmit={handleUnlock} className="flex flex-col items-center gap-4 w-64">
              <div className="relative w-full group">
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={lockPassword}
                  onChange={async (e) => {
                    const val = e.target.value
                    setLockPassword(val)
                    if (val === "0428") {
                      const isVersionOk = await checkVersion();
                      if (isVersionOk) {
                        setIsCalendarLocked(false)
                        setUnlockError(false)
                        setLockPassword("")
                      }
                    }
                  }}
                  placeholder="Enter Password"
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-center text-xl font-black tracking-[0.5em] text-white placeholder:text-zinc-700 placeholder:tracking-normal placeholder:text-xs focus:outline-none transition-all",
                    unlockError ? "border-rose-500/50 bg-rose-500/5 ring-4 ring-rose-500/10" : "focus:border-white/20 focus:bg-white/10"
                  )}
                />
                {unlockError && (
                  <p className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-bold text-rose-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                    Invalid Password
                  </p>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
