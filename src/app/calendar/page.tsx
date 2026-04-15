"use client";

import { IndustryCalendar } from "@/features/calendar/components/IndustryCalendar";
import { Suspense } from "react";
import { SubscriptionLimitModal } from "@/features/nebula/components/SubscriptionLimitModal";
import { useShop } from "@/features/shop/ShopContext";

export default function CalendarPage() {
  const { subscription, subscriptionModalMode, closeSubscriptionModal } = useShop();

  return (
    <main className="h-screen w-screen bg-transparent text-white overflow-hidden relative flex flex-col">
      {/* 核心日历组件 App Shell 容器 */}
      <div className="flex-1 w-full relative z-10 overflow-hidden">
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center text-white/50">Loading Calendar...</div>}>
          <IndustryCalendar initialIndustry="beauty" mode="admin" />
        </Suspense>
      </div>

      {/* 全局算力矩阵大一统弹窗 (Global Subscription Matrix) */}
      <SubscriptionLimitModal 
        isOpen={subscriptionModalMode !== null} 
        onClose={closeSubscriptionModal} 
        currentTier={subscription.subscriptionTier || 'FREE'} 
        mode={subscriptionModalMode || 'NODE_LIMIT'}
        onStartGracePeriod={
          subscription.gracePeriodActionsLeft === null 
            ? async () => {
                if (!subscription.empireId) return;
                try {
                  const { supabase } = await import('@/lib/supabase');
                  await supabase.from('profiles').update({ grace_period_actions_left: 15 }).eq('id', subscription.empireId);
                } catch (e) {
                  console.error("Failed to start grace period actions:", e);
                }
              }
            : undefined
        }
      />
    </main>
  );
}
