import { motion } from 'framer-motion';
import { cn } from "@/utils/cn";
import { useShop } from "@/features/shop/ShopContext";

export const GracePeriodBanner = ({ remainingTime, remainingMilliseconds, isReadOnlyMode, isGracePeriodActive, gracePeriodActionsLeft }: { remainingTime: string | null; remainingMilliseconds?: number | null; isReadOnlyMode: boolean; isGracePeriodActive?: boolean; gracePeriodActionsLeft?: number | null }) => {
 const { openSubscriptionModal } = useShop();

 // 横幅在过期状态下不再隐藏，保持显示以供测试和视觉定位
 if (!remainingTime) return null;

 // 终极拦截：如果拥有超过 1 天（24小时）的剩余时间，说明是正式付费用户，永久隐藏底部横条！
 if (remainingMilliseconds !== null && remainingMilliseconds !== undefined && remainingMilliseconds > 24 * 60 * 60 * 1000) {
 return null;
 }

 const isExhausted = remainingTime === "ACTIONS_EXHAUSTED";

 return (
 <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
 <motion.div 
 
 
 className=" bg-black/80 border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 pointer-events-auto"
 >
 <div className="flex items-center gap-2">
 {isReadOnlyMode || isExhausted ? (
 <span className="text-red-500 flex items-center gap-2 tracking-wider text-sm">
 <span className="w-2 h-2 rounded-full bg-red-500 " />
 您的会员已到期请订阅
 </span>
 ) : (
 <>
 <span className="text-white text-xs font-medium uppercase tracking-wider">
 {isGracePeriodActive ? '紧急调度额度' : '试用倒计时'}
 </span>
 <span className={cn(
 " tracking-wider",
 isGracePeriodActive ? "text-gx-gold" : ""
 )}>
 {isGracePeriodActive ? `${gracePeriodActionsLeft}/15 次` : remainingTime}
 </span>
 </>
 )}
 </div>
 <div className="w-[1px] h-4 bg-white/10" />
 <button 
 onClick={() => {
 openSubscriptionModal('UPGRADE_INTENT');
 }}
 className="text-white text-xs uppercase tracking-wider "
 >
 {isExhausted ? '升级订阅' : '升级订阅'}
 </button>
 </motion.div>
 </div>
 );
};
