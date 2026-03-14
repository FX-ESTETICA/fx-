import React from 'react'
import { cn } from '@/lib/utils'
import { I18N } from '@/utils/calendar-constants'
import { getItalyTime } from '../hooks/useCalendarInit'
import { MemberHistoryItem, Member } from '@/utils/calendar-constants'
import { ModalInput, LabeledContainer } from '@/modules/core/components/ModalElements'
import { Globe, ShieldCheck, Heart, Plus, RefreshCw, Fingerprint, Award, Zap, AlertCircle } from 'lucide-react'
import { useGlobalPassport } from '@/modules/booking/hooks/useGlobalPassport'
import { GlobalPassport } from '@/modules/core/types/omni-flow'
import { createClient } from '@/utils/supabase/client'

interface MemberDetailViewProps {
  lang: 'zh' | 'it'
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
  memberName: string
  setMemberName: (name: string) => void
  memberId: string
  memberNote: string
  setMemberNote: (note: string) => void
  isNewMember: boolean
  today: Date
  onGenerateMemberId: (tagId: string) => void
  globalPassport: GlobalPassport | null
  onSyncPassport?: () => void
}

// 身份画像计算引擎 (Omni-Flow AI 引擎逻辑)
const calculateMemberPortrait = (passport: any) => {
  if (!passport) return null;
  const points = passport.loyalty_points || 0;
  
  if (points > 5000) return { label: '至尊黑钻', color: 'text-amber-400', icon: Award, level: 'Level 5' };
  if (points > 2000) return { label: '白金精英', color: 'text-blue-300', icon: Zap, level: 'Level 4' };
  if (points > 800) return { label: '黄金会员', color: 'text-yellow-500', icon: ShieldCheck, level: 'Level 3' };
  return { label: '标准通行证', color: 'text-zinc-400', icon: Globe, level: 'Level 1' };
};

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({ 
  lang,
  selectedMember,
  setSelectedMember,
  memberName,
  setMemberName,
  memberId,
  memberNote,
  setMemberNote,
  isNewMember,
  today,
  onGenerateMemberId,
  globalPassport,
  onSyncPassport
}) => {
  const { updateGlobalPreferences, syncLocalToGlobal, isSyncing } = useGlobalPassport()
  const [currentMerchantId, setCurrentMerchantId] = React.useState<string | null>(null)
  const portrait = calculateMemberPortrait(globalPassport);

  // 获取当前商户 ID (用于数据确权溯源)
  React.useEffect(() => {
    const fetchMerchantId = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const metadata = session?.user?.user_metadata
      const mc_id = metadata?.mc_id || metadata?.ad_id || metadata?.rp_id
      if (mc_id) setCurrentMerchantId(mc_id)
    }
    fetchMerchantId()
  }, [])

  if (!selectedMember) return null

  const handleAddPreference = async (pref: string) => {
    if (!globalPassport) return;
    // 注入“数据确权”：每个偏好都带上来源商户元数据
    const newPrefs = { [pref]: true };
    await updateGlobalPreferences(globalPassport.id, newPrefs, currentMerchantId || 'unknown');
    onSyncPassport?.();
  };

  const handleSyncLocalToGlobal = async () => {
    if (!globalPassport || !selectedMember) return;
    await syncLocalToGlobal(
      globalPassport.id, 
      { notes: selectedMember.note }, 
      currentMerchantId || 'unknown'
    );
    onSyncPassport?.();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Global Passport - G-ID Verification (Identity Protocol Visualization) */}
      {globalPassport ? (
        <div className="bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-blue-600/20 rounded-2xl p-4 border border-white/10 shadow-2xl relative overflow-hidden group">
          {/* Background Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
                <div className="absolute inset-0 bg-emerald-400/20 blur-sm animate-pulse rounded-full" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block leading-none">全球护照已激活</span>
                <span className="text-[8px] text-emerald-400/60 uppercase font-bold tracking-tighter">G-ID PROTOCOL VERIFIED</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleSyncLocalToGlobal}
                title="同步本地备注到全球画像"
                className={cn(
                  "px-2 py-1 flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all",
                  isSyncing && "opacity-50 cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("w-2.5 h-2.5", isSyncing && "animate-spin")} />
                原子同步
              </button>
              <button 
                type="button"
                onClick={onSyncPassport}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all",
                  isSyncing && "animate-spin"
                )}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">全球通用积分</span>
              </div>
              <div className="text-xl font-black text-white leading-none tabular-nums">
                {globalPassport.loyalty_points || 0}
              </div>
            </div>
            
            <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-1.5 mb-1">
                {portrait && <portrait.icon className={cn("w-3 h-3", portrait.color)} />}
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">身份画像</span>
              </div>
              <div className={cn("text-sm font-black italic uppercase leading-none", portrait?.color)}>
                {portrait?.label || '普通用户'}
              </div>
              <div className="text-[8px] text-zinc-500 font-bold">{portrait?.level}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-800/30 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center py-8 group hover:border-white/10 transition-all">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Globe className="w-6 h-6 text-zinc-500" />
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-zinc-400 mb-1">未关联全球通行证</div>
            <div className="text-[10px] text-zinc-600">关联手机号以同步跨店偏好</div>
          </div>
        </div>
      )}

      {/* Member Basic Info (Omni-Flow Minimalist Design) */}
      <div className="bg-zinc-900/40 rounded-3xl p-6 border border-white/5 space-y-6">
        <div className="space-y-4">
          <LabeledContainer label="客户姓名">
            <ModalInput
              value={selectedMember.name}
              onChange={(e) => 
                setSelectedMember(prev => (prev ? { ...prev, name: e.target.value } : prev))
              }
              placeholder="输入客户姓名..."
              className="text-lg font-bold"
            />
          </LabeledContainer>

          <div className="grid grid-cols-2 gap-4">
            <LabeledContainer label="会员编号">
              <div className="relative group">
                <ModalInput
                  value={selectedMember.card}
                  readOnly
                  className="bg-zinc-800/30 border-dashed opacity-80"
                />
                {!selectedMember.card.startsWith('ID') && (
                  <button
                    type="button"
                    onClick={() => onGenerateMemberId('M')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </LabeledContainer>

            <LabeledContainer label="当前等级">
              <div className="px-3 py-2.5 rounded-xl bg-zinc-800/30 border border-white/5 text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Award className="w-4 h-4" />
                {selectedMember.level}
              </div>
            </LabeledContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">累计消费</span>
            <div className="text-xl font-black text-white tabular-nums">€{selectedMember.totalSpend}</div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">到店次数</span>
            <div className="text-xl font-black text-white tabular-nums">{selectedMember.totalVisits} 次</div>
          </div>
        </div>
      </div>

      {/* Preferences & Tags (Global Syncable Attributes) */}
      {globalPassport && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">全球服务偏好</span>
            <span className="text-[8px] text-emerald-500/60 font-bold tracking-tighter uppercase">Auto-Sync Active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['酒精过敏', '偏好安静', '力度偏重', '温水洗卸'].map(pref => {
              const prefData = globalPassport.preferences?.[pref];
              // 兼容新旧数据结构
              const isActive = prefData === true || (prefData && typeof prefData === 'object' && prefData.value === true);
              const source = (prefData && typeof prefData === 'object') ? prefData.source : null;
              
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => handleAddPreference(pref)}
                  className={cn(
                    "relative group px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                    isActive 
                      ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                      : "bg-zinc-800/50 border-white/5 text-zinc-500 hover:border-white/10"
                  )}
                >
                  <span className="flex items-center gap-1">
                    {pref}
                    {isActive && source && (
                      <span className="text-[7px] opacity-40 font-black uppercase tracking-tighter bg-white/10 px-1 rounded">
                        {source === 'current-merchant-id' ? '本机' : '跨店'}
                      </span>
                    )}
                  </span>
                  
                  {/* Hover Tooltip for Data Ownership */}
                  {isActive && prefData?.updated_at && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-white/10 rounded text-[8px] text-zinc-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                      确权商户: {source || '系统'} | 同步于: {new Date(prefData.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </button>
              )
            })}
            <button className="px-2 py-1.5 rounded-full bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 transition-all">
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <LabeledContainer label={I18N[lang].notes}>
        <textarea
          value={selectedMember.note}
          placeholder={I18N[lang].notesPlaceholder}
          onChange={(e) => 
            setSelectedMember(prev => (prev ? { ...prev, note: e.target.value } : prev))
          }
          className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px] resize-none"
        />
      </LabeledContainer>
    </div>
  )
}
