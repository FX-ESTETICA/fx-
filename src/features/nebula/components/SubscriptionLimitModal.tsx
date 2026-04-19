import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useEffect, useState } from "react";
import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { supabase } from "@/lib/supabase";

import { SubscriptionModalMode, useShop } from "@/features/shop/ShopContext";
import { useHardwareBack } from "@/hooks/useHardwareBack";

interface SubscriptionLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  mode?: SubscriptionModalMode;
  onStartGracePeriod?: () => void;
}

const TIER_LIMITS: Record<string, number> = {
  FREE: 1,
  BASIC: 3,
  PRO: 10,
  ENTERPRISE: 9999, // 无限
};

const PADDLE_PRICES = {
  FREE: 'pri_01kp9eymwgh0y8fpnfe3bh4qwc',
  BASIC: 'pri_01kp9f0kawf39jg3rjqb4j2zxt',
  PRO: 'pri_01kp9f2dsx370schxp07sxe60n',
  ENTERPRISE: 'pri_01kp9f4b1exnpntneywz9z53kr',
};

export const SubscriptionLimitModal = ({ isOpen, onClose, currentTier, mode = 'NODE_LIMIT', onStartGracePeriod }: SubscriptionLimitModalProps) => {
  const [paddle, setPaddle] = useState<Paddle>();
  const { subscription } = useShop(); // 获取当前用户的 empireId

  const registerBack = useHardwareBack(state => state.register);
  const unregisterBack = useHardwareBack(state => state.unregister);

  useEffect(() => {
    if (isOpen) {
      registerBack('subscription-limit', () => {
        onClose();
        return true;
      }, 40);
    } else {
      unregisterBack('subscription-limit');
    }
    return () => unregisterBack('subscription-limit');
  }, [isOpen, onClose, registerBack, unregisterBack]);

  useEffect(() => {
    if (isOpen && !paddle) {
      initializePaddle({ 
        environment: 'sandbox', 
        token: 'test_71aa785f189494f81f7e5014fb5',
        eventCallback: async function(data) {
          if (data.name === "checkout.completed") {
            console.log("Checkout completed successfully!", data);
            
            // 沙盒测试期：前端直接触发提权 (真实生产环境应交给 Webhook 处理)
            if (subscription.empireId) {
              // 提取刚才购买的层级 (从 customData 中)，类型断言规避 ts 报错
              const customData = data.data?.custom_data as Record<string, any> | undefined;
              const targetTier = customData?.target_tier || 'PRO';
              
              // 物理级写入数据库
              const nextMonth = new Date();
              nextMonth.setMonth(nextMonth.getMonth() + 1);

              const { error } = await supabase
                .from('profiles')
                .update({ 
                  subscription_tier: targetTier,
                  // 注入新的到期时间：当前时间 + 30天
                  current_period_end: nextMonth.toISOString(),
                  // 重置试用期和剩余次数，代表正式成为了尊贵的付费用户
                  grace_period_actions_left: null 
                })
                .eq('id', subscription.empireId);

              if (error) {
                console.error("Failed to upgrade tier:", error);
              } else {
                console.log("Tier upgraded successfully to:", targetTier);
                // 强制刷新页面或触发全局事件让 context 重新拉取
                window.location.reload();
              }
            }
            
            // 支付成功后，自动关闭弹窗
            onClose();
          }
        }
      }).then(
        (paddleInstance: Paddle | undefined) => {
          if (paddleInstance) {
            setPaddle(paddleInstance);
          }
        }
      ).catch(err => console.error("Failed to initialize Paddle", err));
    }
  }, [isOpen, paddle, onClose]);

  const handleCheckout = (priceId: string) => {
    if (paddle) {
      // 获取订阅等级名称，用于在后台记录
      const tierName = Object.entries(PADDLE_PRICES).find(([_, id]) => id === priceId)?.[0] || 'UNKNOWN';

      paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customData: {
          empire_id: subscription.empireId || '',
          target_tier: tierName
        }
      });
    } else {
      console.warn("Paddle is still loading, please wait...");
    }
  };

  // 内测专属：手动一键延长试用期 360 天
  const handleBetaExtension = async () => {
    if (!subscription.empireId) return;
    
    // 强制将试用期重置为当前时间，以便重新开始计算
    // 注意：当前系统的免费试用时长是由全局变量（如 5 分钟）决定的，
    // 为了真正获得 360 天，最完美的方法是直接把他的订阅强行升为 'PRO'，并给一个 360 天后的到期时间
    const nextYear = new Date();
    nextYear.setDate(nextYear.getDate() + 360);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: 'PRO', // 赠送 PRO 连锁版
        current_period_end: nextYear.toISOString(),
        trial_started_at: new Date().toISOString(), // 重置试用期起算点，防止旧倒计时逻辑卡死
        grace_period_actions_left: null // 抹除紧急额度限制
      })
      .eq('id', subscription.empireId);

    if (!error) {
      console.log("Beta extension applied: PRO for 360 days");
      
      // 同步清理本地的试用期缓存，防止双轨制干扰
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`gx_trial_empire_${subscription.empireId}`);
      }
      
      window.location.reload();
    } else {
      console.error("Failed to apply beta extension", error);
    }
  };

  if (!isOpen) return null;

  const maxNodes = TIER_LIMITS[currentTier] || 1;
  const isExpiredWarning = mode === 'EXPIRED_WARNING';
  const isUpgradeIntent = mode === 'UPGRADE_INTENT';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Header 锁定提示 */}
          <div className="flex flex-col items-center justify-center pt-8 md:pt-12 pb-6 md:pb-8 px-4 md:px-6 relative shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 md:top-6 md:right-6 text-white/40 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gx-gold/10 border border-gx-gold/20 flex items-center justify-center text-gx-gold mb-4 md:mb-6 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
              <Lock className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-widest mb-3 md:mb-4 text-center">
              {isExpiredWarning ? '您的订阅已到期' : isUpgradeIntent ? '星际算力网络' : '公司数量上限'}
            </h2>
            
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 text-xs md:text-sm text-white/60 tracking-widest font-mono text-center">
              <div className="flex items-center gap-2">
                <span>您当前的订阅为</span>
                <span className="px-2 py-0.5 rounded bg-gx-gold/20 text-gx-gold border border-gx-gold/30 font-black">
                  {currentTier}
                </span>
              </div>
              {!isExpiredWarning && (
                <span>支持最大公司上限：<strong className="text-white text-base md:text-lg">{maxNodes}</strong>。</span>
              )}
            </div>
            
            <p className="mt-2 md:mt-4 text-xs md:text-sm text-white/40 tracking-wider text-center">
              {isExpiredWarning ? '您的全功能体验时间已耗尽，日历已进入只读模式。' : '如需扩张新的公司，请升级订阅。'}
            </p>

            {/* 内测专属后门按钮：一键延期 360 天 */}
            <button 
              onClick={handleBetaExtension}
              className="mt-6 px-4 py-1.5 rounded-full bg-gx-purple/20 border border-gx-purple/50 text-gx-purple text-[10px] font-mono tracking-widest hover:bg-gx-purple hover:text-white transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] animate-pulse"
            >
              [内测专属] 一键延长 360 天 PRO 版体验
            </button>
          </div>

          {/* Pricing Matrix 算力矩阵 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 md:p-8 bg-white/[0.02] border-t border-white/5 relative flex-1 overflow-y-auto scrollbar-hide">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
            />

            {/* 单店版 (FREE) - 白银 */}
            <div className={cn(
              "relative z-10 flex flex-col bg-black/40 border rounded-2xl p-5 md:p-6 transition-all group",
              currentTier === 'FREE' ? "border-gray-300 bg-gray-300/5 shadow-[0_0_20px_rgba(209,213,219,0.15)]" : "border-white/10 hover:border-gray-300/50"
            )}>
              <h3 className="text-xl font-black tracking-widest text-gray-300 mb-1 md:mb-2">单店</h3>
              <p className="text-xs text-gray-400 tracking-wider mb-6 md:mb-8">支持单个商店</p>
              
              <div className="mt-auto pt-4 md:pt-6 border-t border-white/5 relative">
                {/* 如果是过期警告模式，并且当前是FREE，提供幽灵续命按钮 */}
                {isExpiredWarning && currentTier === 'FREE' && onStartGracePeriod && (
                  <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 w-full text-center">
                    <button 
                      onClick={() => {
                        onStartGracePeriod();
                        onClose();
                      }}
                      className="text-[10px] text-white/30 hover:text-gray-300 transition-colors font-mono tracking-widest uppercase whitespace-nowrap"
                    >
                      或开启最后 15 次紧急额度
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => handleCheckout(PADDLE_PRICES.FREE)}
                  className={cn(
                    "w-full py-2.5 md:py-3 rounded-xl font-black tracking-widest uppercase border transition-all text-xs md:text-sm",
                    currentTier === 'FREE'
                      ? "bg-gray-300/10 text-gray-300 border-gray-300/30 hover:bg-gray-300 hover:text-black shadow-[0_0_15px_rgba(209,213,219,0.1)]"
                      : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {currentTier === 'FREE' ? '续费' : '升级订阅'}
                </button>
              </div>
            </div>

            {/* 多店版 (BASIC) - 青蓝 */}
            <div className={cn(
              "relative z-10 flex flex-col bg-black/40 border rounded-2xl p-5 md:p-6 transition-all group",
              currentTier === 'BASIC' ? "border-gx-cyan bg-gx-cyan/5 shadow-[0_0_20px_rgba(0,242,255,0.15)]" : "border-white/10 hover:border-gx-cyan/50"
            )}>
              <h3 className="text-xl font-black tracking-widest text-gx-cyan mb-1 md:mb-2">多店</h3>
              <p className="text-xs text-gx-cyan/60 tracking-wider mb-6 md:mb-8">支持 3 家商店</p>
              
              <div className="mt-auto pt-4 md:pt-6 border-t border-white/5">
                <button 
                  onClick={() => handleCheckout(PADDLE_PRICES.BASIC)}
                  className={cn(
                    "w-full py-2.5 md:py-3 rounded-xl font-black tracking-widest uppercase border transition-all text-xs md:text-sm",
                    currentTier === 'BASIC'
                      ? "bg-gx-cyan/10 text-gx-cyan border-gx-cyan/30 hover:bg-gx-cyan hover:text-black shadow-[0_0_15px_rgba(0,242,255,0.1)]"
                      : "bg-gx-cyan/5 text-gx-cyan/60 border-gx-cyan/20 hover:bg-gx-cyan/20 hover:text-gx-cyan"
                  )}
                >
                  {currentTier === 'BASIC' ? '续费' : '升级订阅'}
                </button>
              </div>
            </div>

            {/* 连锁版 (PRO) - 霓虹紫 (Recommended) */}
            <div className={cn(
              "relative z-10 flex flex-col bg-black border rounded-2xl p-5 md:p-6 transform transition-all group",
              currentTier === 'PRO' 
                ? "border-gx-purple shadow-[0_0_30px_rgba(188,19,254,0.25)] md:-translate-y-4" 
                : "border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:border-gx-purple/50"
            )}>
              <div className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-all whitespace-nowrap",
                currentTier === 'PRO' ? "bg-gx-purple text-white shadow-[0_0_10px_rgba(188,19,254,0.5)]" : "bg-gx-purple/20 text-gx-purple/80"
              )}>
                Recommended
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-widest text-gx-purple mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(188,19,254,0.5)]">连锁</h3>
              <p className="text-xs text-gx-purple/80 tracking-wider mb-6 md:mb-8">支持 10 家商店</p>
              
              <div className="mt-auto pt-4 md:pt-6 border-t border-white/5">
                <button 
                  onClick={() => handleCheckout(PADDLE_PRICES.PRO)}
                  className={cn(
                    "w-full py-3 md:py-4 rounded-xl font-black tracking-widest uppercase transition-all border text-xs md:text-sm",
                    currentTier === 'PRO' 
                      ? "bg-gx-purple/10 text-gx-purple border-gx-purple/30 hover:bg-gx-purple hover:text-white shadow-[0_0_20px_rgba(188,19,254,0.4)]" 
                      : "bg-gx-purple/10 text-gx-purple border-gx-purple/30 shadow-[0_0_20px_rgba(188,19,254,0.2)] hover:shadow-[0_0_30px_rgba(188,19,254,0.6)] hover:bg-gx-purple hover:text-white hover:scale-105"
                  )}
                >
                  {currentTier === 'PRO' ? '续费' : '升级订阅'}
                </button>
              </div>
            </div>

            {/* 集团版 (ENTERPRISE) - 暗金 */}
            <div className={cn(
              "relative z-10 flex flex-col bg-black/40 border rounded-2xl p-5 md:p-6 transition-all group",
              currentTier === 'ENTERPRISE' ? "border-[#FFD700] bg-[#FFD700]/5 shadow-[0_0_20px_rgba(255,215,0,0.15)]" : "border-white/10 hover:border-[#FFD700]/50"
            )}>
              <h3 className="text-xl font-black tracking-widest text-[#FFD700] mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">集团</h3>
              <p className="text-xs text-[#FFD700]/60 tracking-wider mb-6 md:mb-8">无上限</p>
              
              <div className="mt-auto pt-4 md:pt-6 border-t border-white/5">
                <button 
                  onClick={() => handleCheckout(PADDLE_PRICES.ENTERPRISE)}
                  className={cn(
                    "w-full py-2.5 md:py-3 rounded-xl font-black tracking-widest uppercase border transition-all text-xs md:text-sm",
                    currentTier === 'ENTERPRISE'
                      ? "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700] hover:text-black shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                      : "bg-[#FFD700]/5 text-[#FFD700]/60 border-[#FFD700]/20 hover:bg-[#FFD700]/20 hover:text-[#FFD700]"
                  )}
                >
                  {currentTier === 'ENTERPRISE' ? '续费' : '升级订阅'}
                </button>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};