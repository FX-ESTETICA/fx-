"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/shared/GlassCard";
import { Input } from "@/components/shared/Input";
import { UserCircle, Calendar, Activity, Building2, Store, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTranslations } from "next-intl";

export const CyberOnboardingModal = () => {
  const { user, refreshUserData } = useAuth();
  const t = useTranslations("CyberOnboardingModal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [roleSelection, setRoleSelection] = useState<'user' | 'merchant'>('user');

  // 计算18岁默认日期
  const defaultDate = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear() - 18;
    return `${year}-01-01`;
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    gender: "unknown",
    birthday: defaultDate, // 赋默认值
    brandName: "",
    industry: "beauty",
  });

  // 【强制防穿透与时空冻结锁】
  // 当蒙版出现时，锁定底层 Body 滚动，防止用户在底层瞎滑
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id || !formData.name) return;

    setIsSubmitting(true);
    try {
      // 1. 尝试持久化更新到底层物理表 (尊重底层的 RLS 和触发器机制)
      // 【终极零红字方案】：调用数据库内部的 RPC 原子操作，消除所有并发与 400 报错噪音
      const { error: rpcError } = await supabase.rpc('sync_user_profile', {
        p_id: user.id,
        p_email: user.email,
        p_name: formData.name,
        p_gender: formData.gender,
        p_birthday: formData.birthday || null
      });

      if (rpcError) throw rpcError;

      // 2. 终极兜底：强制将资料同步到 Auth Metadata (彻底绕过 profiles 空壳缺陷)
      await supabase.auth.updateUser({
        data: {
          name: formData.name,
          gender: formData.gender,
          birthday: formData.birthday || null,
        }
      });

      // 如果用户选择了“公司 (智控)” -> 执行秒激活物理链路
      if (roleSelection === 'merchant') {
        // 0. 同步创建商户申请记录 (这是入驻必须有的基因存根)
        const { error: appError } = await supabase
          .from('merchant_applications')
          .insert({
            user_id: user.id,
            brand_name: formData.brandName,
            contact_phone: "PENDING", // 在装修部署时再由用户补全真实号码
            maps_link: null,
            industry: formData.industry,
            status: 'approved' // 直接秒批
          });

        if (appError) throw appError;

        // a. 在 shops 表创建数字门店实体，默认 draft 或 active 均可，
        // 这里用 active 以允许在后台正常使用日历，但因为没有填坐标和配置，它不会在首页显示。
        const { data: newShop, error: shopError } = await supabase
          .from('shops')
          .insert({
            name: formData.brandName,
            industry: formData.industry,
            owner_principal_id: user.id,
            nebula_status: 'active' 
          })
          .select()
          .single();

        if (shopError) throw shopError;

        // b. 建立物理绑定关系
        const { error: bindError } = await supabase
          .from('shop_bindings')
          .insert({
            shop_id: newShop.id,
            user_id: user.id,
            role: 'OWNER'
          });

        if (bindError) throw bindError;

        // c. 物理升维：将用户角色提升为 merchant，打通底层 RLS
        const { error: roleError } = await supabase
          .from('profiles')
          .update({ role: 'merchant' })
          .eq('id', user.id);

        if (roleError) throw roleError;
      }

      setIsSuccess(true);
      
      // 3. 延迟 800ms 展示流光绿成功动画，然后触发全局刷新
      setTimeout(async () => {
        await refreshUserData();
        // refreshUserData 执行后，AppShell 层的 !user.name 条件将失效，组件自然卸载
      }, 800);

    } catch (error) {
      console.error("[Onboarding] Failed to update profile:", error);
      setIsSubmitting(false);
    }
  };

  return (
    // 绝对置顶层，完全剥离所有黑底与高斯模糊，实现真正的 100% 透明悬浮
    <div className="fixed inset-0 z-[9999] bg-transparent flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-6 sm:p-8 border border-white/10  relative overflow-hidden bg-black/10  max-h-[calc(100dvh-2rem)] flex flex-col">
          {/* 底部柔和黑色渐变阴影，托起弹窗并保证按钮清晰度 */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none rounded-b-2xl" />
          
          <div className="relative z-10 overflow-y-auto no-scrollbar pb-4 px-1">
            <AnimatePresence mode="wait">
              {!isSuccess && step === 'role' && (
                <motion.div 
                  key="role-selection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-4"
                >
                  <div className="flex flex-col items-center text-center mb-8">
                    <h2 className="text-2xl font-bold tracking-tighter text-white mb-2">
                      请选择您的使用身份
                    </h2>
                    <p className="text-xs text-white/40 tracking-widest">
                      选择后可随时在系统中更改或升级
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 生活 (个人) */}
                    <button 
                      onClick={() => { setRoleSelection('user'); setStep('form'); }} 
                      className="group relative p-6 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/5 hover:border-white/30 transition-all flex flex-col items-center gap-4 text-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <UserCircle className="w-8 h-8 text-white/60 group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <div className="font-bold text-white tracking-widest mb-1 text-lg">生活</div>
                        <div className="text-[10px] text-white/40 tracking-wider">预约服务 · 探索周边门店</div>
                      </div>
                    </button>

                    {/* 智控 (公司) */}
                    <button 
                      onClick={() => { setRoleSelection('merchant'); setStep('form'); }} 
                      className="group relative p-6 rounded-2xl border     transition-all flex flex-col items-center gap-4 text-center"
                    >
                      <div className="w-14 h-14 rounded-full  flex items-center justify-center  transition-colors ">
                        <Building2 className="w-8 h-8   transition-colors" />
                      </div>
                      <div>
                        <div className="font-bold  tracking-widest mb-1 text-lg">智控</div>
                        <div className="text-[10px]  tracking-wider">数字门店 · 智能排班日历</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {!isSuccess && step === 'form' && (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit} 
                  className="space-y-6"
                >
                  {/* Header with Back Button */}
                  <div className="flex items-center gap-4 mb-8">
                    <button 
                      type="button" 
                      onClick={() => setStep('role')} 
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 border border-white/5 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold tracking-tighter text-white">
                        {roleSelection === 'merchant' ? '创建数字门店' : '填写会员信息'}
                      </h2>
                      <p className="text-[10px] text-white/40 tracking-widest mt-1">
                        {roleSelection === 'merchant' ? '只需两步，即可开启智能日历' : '极简身份核验'}
                      </p>
                    </div>
                    {roleSelection === 'merchant' && (
                      <div className="w-10 h-10 rounded-full  border  flex items-center justify-center  ">
                        <Building2 className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <UserCircle className="w-3 h-3" />
                        {t('txt_60d045')}
                      </label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('txt_ab4b97')}
                        className="h-12 bg-black/50 text-white placeholder:text-white/20 border-white/10 "
                      />
                    </div>

                    {/* Gender (Custom Cyber Radio) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        {t('txt_787b56')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'male', label: t('txt_36a490') },
                          { id: 'female', label: t('txt_87c835') },
                          { id: 'unknown', label: t('txt_d8782f') }
                        ].map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g.id })}
                            className={`h-10 rounded-lg text-xs font-bold tracking-widest transition-all border ${
                              formData.gender === g.id 
                                ? "bg-white/10 border-white text-white" 
                                : "bg-black/50 border-white/5 text-white/40 hover:bg-white/5"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Birthday (Custom Dropdowns) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {t('txt_abbe4b')}
                      </label>
                      <div className="flex gap-2">
                        {/* Year */}
                        <div className="relative flex-1">
                          <select
                            value={formData.birthday.split('-')[0] || ''}
                            onChange={(e) => {
                              const [_, m, d] = formData.birthday.split('-');
                              setFormData({ ...formData, birthday: `${e.target.value}-${m || '01'}-${d || '01'}` });
                            }}
                            className="w-full h-12 bg-black/50 text-white border border-white/10 rounded-lg px-2 sm:px-3 text-sm appearance-none  focus:outline-none transition-colors"
                          >
                            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year} className=" text-white">{year}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">年</div>
                        </div>

                        {/* Month */}
                        <div className="relative flex-1">
                          <select
                            value={formData.birthday.split('-')[1] || ''}
                            onChange={(e) => {
                              const [y, _, d] = formData.birthday.split('-');
                              setFormData({ ...formData, birthday: `${y || new Date().getFullYear() - 18}-${e.target.value.padStart(2, '0')}-${d || '01'}` });
                            }}
                            className="w-full h-12 bg-black/50 text-white border border-white/10 rounded-lg px-2 sm:px-3 text-sm appearance-none  focus:outline-none transition-colors"
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                              <option key={month} value={month.toString().padStart(2, '0')} className=" text-white">{month}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">月</div>
                        </div>

                        {/* Day */}
                        <div className="relative flex-1">
                          <select
                            value={formData.birthday.split('-')[2] || ''}
                            onChange={(e) => {
                              const [y, m, _] = formData.birthday.split('-');
                              setFormData({ ...formData, birthday: `${y || new Date().getFullYear() - 18}-${m || '01'}-${e.target.value.padStart(2, '0')}` });
                            }}
                            className="w-full h-12 bg-black/50 text-white border border-white/10 rounded-lg px-2 sm:px-3 text-sm appearance-none  focus:outline-none transition-colors"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day.toString().padStart(2, '0')} className=" text-white">{day}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">日</div>
                        </div>
                      </div>
                    </div>

                    {roleSelection === 'merchant' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-4 pt-4 border-t border-white/10"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                            <Store className="w-3 h-3" />
                            店铺名称
                          </label>
                          <Input
                            required
                            value={formData.brandName}
                            onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                            placeholder="请输入您的店铺或品牌名称"
                            className="h-12 bg-black/50 text-white placeholder:text-white/20 border-white/10 "
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-white/60 tracking-widest flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            行业分类
                          </label>
                          <div className="relative">
                            <select
                              value={formData.industry}
                              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                              className="w-full h-12 bg-black/50 text-white border border-white/10 rounded-lg px-3 text-sm appearance-none  focus:outline-none transition-colors"
                            >
                              <option value="beauty">美业 / 美容美甲</option>
                              <option value="dining">餐饮 / 咖啡烘焙</option>
                              <option value="medical">医疗 / 牙科诊所</option>
                              <option value="fitness">健身 / 瑜伽普拉提</option>
                              <option value="expert">专家 / 独立顾问</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 text-xs">▼</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting || !formData.name || !formData.birthday || formData.gender === 'unknown' || (roleSelection === 'merchant' && !formData.brandName)}
                    className="w-full h-12 rounded-lg font-bold tracking-widest mt-4 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed  border   "
                  >
                    {isSubmitting ? t('txt_6c4783') : (roleSelection === 'merchant' ? '创建门店并进入智控台' : '开启体验')}
                  </button>
                </motion.form>
              )}
              
              {isSuccess && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 flex flex-col items-center text-center space-y-4"
                >
                  <p className=" font-bold tracking-widest text-lg">
                    {t('txt_6da9ee')}
                  </p>
                  <p className="text-xs font-mono text-white/40 tracking-[0.2em] animate-pulse uppercase">
                    {t('txt_22fc92')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
