import React from 'react'
import { 
  ChevronLeft, 
  ShieldCheck, 
  Zap, 
  Database, 
  ArrowRightLeft, 
  TrendingUp, 
  Sparkles,
  AlertCircle,
  Info,
  Lightbulb,
  RefreshCw,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BillingRow } from './BillingRow'
import { TotalBilling } from './TotalBilling'
import { TrustBadge } from './TrustBadge'
import { useOmniStore } from '@/modules/core/store/useOmniStore'

export interface BillingItemRow {
  itemName: string;
  itemKey: string;
  itemData: {
    name: string;
    price: number;
  };
  itemStaffId: string;
  staffFirstAppearanceIdx?: number;
}

export interface BillingLayoutProps {
  allItemRows: BillingItemRow[];
  extraStaff: any[];
  staffMembers: any[];
  staffAmounts: Record<string, string>;
  customItemPrices: Record<string, string>;
  editingPriceItemKey: string | null;
  showCustomKeypad: boolean;
  manualTotalAmount: string | null;
  showCheckoutPreview: boolean;
  mergedTotalPrice: number | string;
  atomicSplits: {
    merchant: number;
    staff: number;
    platform: number;
  };
  resourceLoadFactors: Record<string, number>;
  aiSchedulingInsights: string[];
  predictedOccupancy: Record<string, number>;
  presetPricesMap: Record<string, number[]>;
  getStaffColorClass: (id: string, members: any[], type: 'text' | 'bg') => string;
  onClose: () => void;
  onUpdateItemPrice: (itemKey: string, price: string, diff: number, staffId?: string) => void;
  onOpenCustomKeypad: (target: { key: string, staffId: string, basePrice: number, name: string }) => void;
  onSetEditingPriceItemKey: (key: string | null) => void;
}

/**
 * 原子组件：账单布局
 * 纯展示层，不依赖 store
 */
export const BillingLayout: React.FC<BillingLayoutProps> = ({
  allItemRows,
  extraStaff,
  staffMembers,
  staffAmounts,
  customItemPrices,
  editingPriceItemKey,
  showCustomKeypad,
  manualTotalAmount,
  showCheckoutPreview,
  mergedTotalPrice,
  atomicSplits,
  resourceLoadFactors,
  aiSchedulingInsights,
  predictedOccupancy,
  presetPricesMap,
  getStaffColorClass,
  onClose,
  onUpdateItemPrice,
  onOpenCustomKeypad,
  onSetEditingPriceItemKey
}) => {
  const { isProcessing, lastRpcId, status, setTransaction } = useOmniStore(state => ({
    isProcessing: state.transaction.isProcessing,
    lastRpcId: state.transaction.lastRpcId,
    status: state.transaction.status,
    setTransaction: state.setTransaction
  }))
  const [dismissedInsights, setDismissedInsights] = React.useState<Set<number>>(new Set());
  const [expandedIdx, setExpandedIdx] = React.useState<number | null>(null);

  // Handle insight dismissal
  const handleDismissInsight = (idx: number) => {
    if (expandedIdx === idx) setExpandedIdx(null);
    setDismissedInsights(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  // Toggle expanded insight
  const toggleExpandInsight = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  // 当原子分账发生变化时，模拟一次计算过程
  React.useEffect(() => {
    if (atomicSplits) {
      setTransaction({ 
        isProcessing: true, 
        status: 'preparing' 
      });
      const timer = setTimeout(() => {
        setTransaction({ 
          isProcessing: false, 
          status: 'idle',
          lastRpcId: Math.random().toString(36).substring(7).toUpperCase()
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [atomicSplits, setTransaction]);

  return (
    <div className="h-full flex flex-col space-y-1 overflow-visible animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Receipt Header */}
      <div className="flex items-center justify-between mb-1 px-2 relative touch-none overscroll-contain">
        <button 
          onClick={onClose}
          className="absolute left-0 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center justify-center flex-1">
          <h2 className="text-xl font-black italic tracking-[0.4em] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)]">BILLING</h2>
        </div>
      </div>

      {/* Items & Staff Alignment Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar overflow-x-visible pb-12">
        <div className={cn(
          "grid gap-x-6 px-2 transition-all duration-300",
          showCustomKeypad ? "grid-cols-1 space-y-2" : "grid-cols-2"
        )}>
          {/* Headers */}
          {!showCustomKeypad && (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] subpixel-antialiased">项目 / Items</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 pl-6">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] subpixel-antialiased">人员 / Staff</span>
              </div>
            </>
          )}

          {/* Render Rows */}
          {allItemRows.map((row, rowIndex) => {
            const { itemName, itemKey, itemData, itemStaffId } = row;
            const colorClass = getStaffColorClass(itemStaffId, staffMembers, 'text');
            const bgClass = getStaffColorClass(itemStaffId, staffMembers, 'bg');
            
            // Determine if this is the first appearance of this staff
            const isFirstAppearance = allItemRows.findIndex(r => r.itemStaffId === itemStaffId) === rowIndex;
            const staff = staffMembers.find(s => s.id === itemStaffId);

            const presetKey = Object.keys(presetPricesMap).find(k => k.toLowerCase() === itemData.name.toLowerCase());
            const prices = presetKey ? presetPricesMap[presetKey] : [10, 20, 30];

            return (
              <React.Fragment key={itemKey}>
                <BillingRow 
                  label={itemName}
                  amount={customItemPrices[itemKey] || itemData.price}
                  colorClass={colorClass}
                  dotColorClass={bgClass || 'bg-white'}
                  onAmountClick={() => onSetEditingPriceItemKey(editingPriceItemKey === itemKey ? null : itemKey)}
                  isEditing={editingPriceItemKey === itemKey}
                  presetPrices={prices}
                  showCustomKeypad={showCustomKeypad}
                  onPresetClick={(price) => {
                    const newVal = price.toString();
                    const oldVal = (customItemPrices[itemKey] || itemData.price).toString();
                    const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
                    onUpdateItemPrice(itemKey, newVal, diff, itemStaffId);
                    onSetEditingPriceItemKey(null);
                  }}
                  onCustomClick={() => {
                    onOpenCustomKeypad({ 
                      key: itemKey, 
                      staffId: itemStaffId, 
                      basePrice: itemData.price,
                      name: itemData.name
                    });
                    onSetEditingPriceItemKey(null);
                  }}
                />

                {!showCustomKeypad && (
                  <div className="pl-6 flex flex-col justify-center h-[34px]">
                    {isFirstAppearance && staff ? (
                      <div className="relative group">
                        <BillingRow 
                          label={staff.name}
                          amount={staffAmounts[staff.name] || ''}
                          colorClass={getStaffColorClass(staff.id, staffMembers, 'text')}
                          dotColorClass={getStaffColorClass(staff.id, staffMembers, 'bg') || 'bg-white'}
                          isStaffRow={true}
                          onAmountClick={() => {
                            onOpenCustomKeypad({ 
                              key: `STAFF_${staff.name}`, 
                              staffId: staff.id, 
                              basePrice: 0,
                              name: staff.name
                            });
                          }}
                        />
                        {/* 资源负载率指示器 (微步 22.1/22.2: 增加预测指标) */}
                        {resourceLoadFactors[staff.id] !== undefined && (
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className={cn(
                              "w-1 h-4 rounded-full transition-colors",
                              resourceLoadFactors[staff.id] > 0.8 ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" : 
                              resourceLoadFactors[staff.id] < 0.3 ? "bg-emerald-500" : "bg-sky-500"
                            )} />
                            <div className="flex flex-col -space-y-0.5">
                              <span className="text-[8px] font-black italic tabular-nums text-white/40 leading-none">
                                {(resourceLoadFactors[staff.id] * 100).toFixed(0)}%
                              </span>
                              {predictedOccupancy[staff.id] !== undefined && (
                                <span className={cn(
                                  "text-[6px] font-bold tabular-nums leading-none",
                                  predictedOccupancy[staff.id] > resourceLoadFactors[staff.id] ? "text-rose-400/40" : "text-emerald-400/40"
                                )}>
                                  {predictedOccupancy[staff.id] > resourceLoadFactors[staff.id] ? '↑' : '↓'}
                                  {(predictedOccupancy[staff.id] * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <div className="h-full" />}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Extra Staff Rows */}
          {extraStaff.map((staff) => (
            <React.Fragment key={staff.id}>
              <div className="h-[34px]" />
              <div className="pl-6 flex flex-col justify-center h-[34px]">
                <BillingRow 
                  label={staff.name}
                  amount={staffAmounts[staff.name] || ''}
                  colorClass={getStaffColorClass(staff.id, staffMembers, 'text')}
                  dotColorClass={getStaffColorClass(staff.id, staffMembers, 'bg') || 'bg-white'}
                  isStaffRow={true}
                  onAmountClick={() => {
                    onOpenCustomKeypad({ 
                      key: `STAFF_${staff.name}`, 
                      staffId: staff.id, 
                      basePrice: 0,
                      name: staff.name
                    });
                  }}
                />
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Value Protocol Summary (Value Circulation Engine Visualization) */}
        {!showCustomKeypad && atomicSplits && (
          <div className="mt-4 mx-2 p-4 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-2xl relative overflow-hidden group shadow-2xl">
            {/* Background Animation Overlay */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Database className="w-16 h-16 text-emerald-400" />
            </div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className={cn("w-3.5 h-3.5 text-emerald-400", isProcessing ? "animate-spin" : "animate-pulse")} />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">原子价值流转协议</span>
                </div>
                <span className={cn(
                  "text-[7px] font-bold uppercase tracking-tighter transition-colors duration-300",
                  isProcessing ? "text-emerald-400" : "text-emerald-400/60"
                )}>
                  {isProcessing ? 'CALCULATING ATOMIC FLOW...' : 'VALUE CIRCULATION ENGINE ACTIVE'}
                </span>
              </div>
              <TrustBadge />
            </div>

            <div className="grid grid-cols-3 gap-3 relative z-10">
              {[
                { 
                  label: 'MERCHANT', 
                  value: atomicSplits.merchant, 
                  icon: Database, 
                  color: 'text-emerald-400', 
                  bg: 'bg-emerald-500/10',
                  logic: '净利润 = 总额 - 员工分润 - 平台费'
                },
                { 
                  label: 'STAFF', 
                  value: atomicSplits.staff, 
                  icon: Zap, 
                  color: 'text-sky-400', 
                  bg: 'bg-sky-500/10',
                  logic: '基于 AI 实时博弈的弹性分润率'
                },
                { 
                  label: 'PLATFORM', 
                  value: atomicSplits.platform, 
                  icon: ShieldCheck, 
                  color: 'text-rose-400', 
                  bg: 'bg-rose-500/10',
                  logic: '底层 Atomic RPC 协议固定结算费用'
                }
              ].map((item, i) => (
                <div key={i} className={cn("p-2.5 rounded-2xl border border-white/5 transition-all duration-500 relative group/split", item.bg, isProcessing && "scale-95 opacity-50")}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <item.icon className={cn("w-3 h-3", item.color)} />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">{item.label}</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[9px] font-medium text-white/30">¥</span>
                    <span className="text-sm font-black text-white tabular-nums leading-none">
                      {isProcessing ? '---' : item.value.toFixed(1)}
                    </span>
                  </div>

                  {/* 逻辑透明化 Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-white/10 rounded-lg opacity-0 group-hover/split:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest">{item.logic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Scheduling Insights (Omni-Flow AI Integration) */}
        {!showCustomKeypad && aiSchedulingInsights.length > 0 && (
          <div className="mt-2 mx-2 p-4 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-2xl relative overflow-hidden group shadow-2xl animate-in slide-in-from-bottom-2 duration-500">
            {/* Background Icon */}
            <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles className="w-20 h-20 text-sky-400" />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">OMNI-FLOW AI 调度洞察</span>
                <span className="text-[7px] font-bold text-sky-400/60 uppercase tracking-tighter">PREDICTIVE RESOURCE OPTIMIZATION</span>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              {aiSchedulingInsights.map((insight, idx) => {
                if (dismissedInsights.has(idx)) return null;

                // Determine icon and color based on keywords
                let Icon = Info;
                let iconColor = "text-sky-400";
                let borderColor = "border-white/5";
                let bgHover = "hover:bg-white/10";
                
                if (insight.includes('警告') || insight.includes('负载过高') || insight.includes('冲突')) {
                  Icon = AlertCircle;
                  iconColor = "text-rose-400";
                  borderColor = "border-rose-500/20";
                  bgHover = "hover:bg-rose-500/5";
                } else if (insight.includes('建议') || insight.includes('推荐') || insight.includes('调价')) {
                  Icon = Lightbulb;
                  iconColor = "text-amber-400";
                  borderColor = "border-amber-500/20";
                  bgHover = "hover:bg-amber-500/5";
                } else if (insight.includes('趋势') || insight.includes('预测') || insight.includes('同步')) {
                  Icon = RefreshCw;
                  iconColor = "text-emerald-400";
                  borderColor = "border-emerald-500/20";
                  bgHover = "hover:bg-emerald-500/5";
                }

                const isExpanded = expandedIdx === idx;

                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleExpandInsight(idx)}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 border transition-all duration-500 group/insight animate-in slide-in-from-right-4 cursor-pointer",
                      borderColor,
                      bgHover,
                      isExpanded && "bg-white/10 border-white/20"
                    )}
                  >
                    <div className={cn("p-1 rounded-lg bg-white/5 group-hover/insight:scale-110 transition-transform", iconColor)}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={cn(
                        "text-[10px] font-medium text-white/70 leading-relaxed italic group-hover/insight:text-white transition-all duration-300",
                        !isExpanded && "line-clamp-2"
                      )}>
                        {insight}
                      </p>
                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-sky-400" />
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">实时调度详情 / Scheduling Details</span>
                          </div>
                          <p className="text-[9px] text-white/50 leading-tight">
                            该建议基于当前技师负载因子、历史趋势预测及全店资源占用情况综合生成。
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-center self-stretch justify-between">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissInsight(idx);
                        }}
                        className="opacity-0 group-hover/insight:opacity-100 p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-emerald-400 transition-all duration-300"
                        title="标记为已读"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {dismissedInsights.size > 0 && dismissedInsights.size === aiSchedulingInsights.length && (
                <div className="py-4 text-center">
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">所有调度建议已处理</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <TotalBilling 
        amount={manualTotalAmount !== null ? (manualTotalAmount || '0') : (
          (Object.values(staffAmounts).reduce((sum, val) => sum + (Number(val) || 0), 0) || 
          (Number(mergedTotalPrice) || 0)).toString()
        )}
        onAmountClick={() => {
          onOpenCustomKeypad({ 
            key: 'TOTAL', 
            staffId: 'TOTAL', 
            basePrice: 0, 
            name: 'TOTAL BILLING' 
          });
        }}
        showSwipeHint={showCheckoutPreview}
      />
    </div>
  );
};
