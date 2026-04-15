"use client";

import { useShop } from "@/features/shop/ShopContext";

export const SubscriptionWatermark = () => {
  const { subscription } = useShop();
  const { subscriptionTier, remainingTime, trialStartedAt, isGracePeriodActive, gracePeriodActionsLeft } = subscription;

  // 只要有剩余时间，或者免费但还没开始试用，就显示雷达
  if (remainingTime || (!trialStartedAt && subscriptionTier === 'FREE')) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] pointer-events-none opacity-40 mix-blend-screen flex flex-col items-end">
        <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-emerald-500/80 mb-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
          {subscriptionTier === 'FREE' ? (isGracePeriodActive ? 'ACTIONS_REMAINING' : 'FULL_POWER_TRIAL') : 'MEMBERSHIP_ACTIVE'}
        </div>
        <div className="text-2xl font-black font-mono text-emerald-500/50 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          {isGracePeriodActive ? `${gracePeriodActionsLeft}/15` : (remainingTime || "AWAITING_ACTIVATION")}
        </div>
      </div>
    );
  }

  return null;
};