import { useState, useEffect } from 'react';
import { useShop } from '@/features/shop/ShopContext';

export const useSubscriptionTimer = () => {
  const { subscription } = useShop();
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [remainingMilliseconds, setRemainingMilliseconds] = useState<number | null>(null);

  useEffect(() => {
    const initSystemTime = Date.now();
    const initPerformanceTime = performance.now();

    const calculateTimeRemaining = () => {
      const elapsed = performance.now() - initPerformanceTime;
      const trueNow = new Date(initSystemTime + elapsed);

      const { trialStartedAt, subscriptionEndsAt, subscriptionTier, gracePeriodEndsAt, gracePeriodActionsLeft } = subscription;

      if (!subscription.isLoaded) return;

      if (subscriptionEndsAt) {
        const end = new Date(subscriptionEndsAt);
        const diff = end.getTime() - trueNow.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          
          const timeStr = days > 0 ? `${days} 天` : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          
          setRemainingTime(timeStr);
          setRemainingMilliseconds(diff);
        } else {
          setRemainingTime("MEMBERSHIP_EXPIRED");
          setRemainingMilliseconds(0);
        }
      } else if (gracePeriodEndsAt) {
        const end = new Date(gracePeriodEndsAt);
        const diff = end.getTime() - trueNow.getTime();
        if (diff > 0) {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setRemainingTime(`${h}H ${m}M ${s}S`);
          setRemainingMilliseconds(diff);
        } else {
          setRemainingTime("MEMBERSHIP_EXPIRED");
          setRemainingMilliseconds(0);
        }
      } else if (subscriptionTier === 'FREE' && trialStartedAt) {
        const start = new Date(trialStartedAt);
        const end = new Date(start.getTime() + 5 * 60 * 1000);
        const diff = end.getTime() - trueNow.getTime();
        
        if (diff > 0) {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setRemainingTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          setRemainingMilliseconds(diff);
        } else {
          if (gracePeriodActionsLeft !== null) {
            if (gracePeriodActionsLeft > 0) {
              setRemainingTime("GRACE_PERIOD");
              setRemainingMilliseconds(0);
            } else {
              setRemainingTime("ACTIONS_EXHAUSTED");
              setRemainingMilliseconds(0);
            }
          } else {
            setRemainingTime("LIMIT_EXCEEDED");
            setRemainingMilliseconds(0);
          }
        }
      } else if (subscriptionTier === 'FREE' && !trialStartedAt) {
        setRemainingTime(null);
        setRemainingMilliseconds(null);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [subscription]);

  return { remainingTime, remainingMilliseconds };
};