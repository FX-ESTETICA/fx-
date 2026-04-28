"use client";

import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";
import { Building2, Rocket, ShieldCheck, Zap, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function OnboardingPage() {
    const t = useTranslations('onboarding');
  const router = useRouter();

  const benefits = [
    {
      icon: Rocket,
      title: t('benefit_1_title'),
      desc: t('benefit_1_desc')
    },
    {
      icon: ShieldCheck,
      title: t('benefit_2_title'),
      desc: t('benefit_2_desc')
    },
    {
      icon: Zap,
      title: t('benefit_3_title'),
      desc: t('benefit_3_desc')
    }
  ];

  return (
    <main className="min-h-[100dvh] bg-transparent text-white relative overflow-x-hidden">
      
      <div className="max-w-4xl mx-auto px-6 py-24 relative z-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white  transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-mono uppercase tracking-widest">{t('txt_7513ca')}</span>
        </button>

        <div className="space-y-16">
          <header className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2  border  rounded-full"
            >
              <Building2 className="w-4 h-4 " />
              <span className="text-[10px] font-mono  uppercase tracking-[0.2em]">{t('txt_5eb15b')}</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              BECOME A <br />
              <span className="">{t('txt_e8df34')}</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white text-lg max-w-xl leading-relaxed"
            >
              {t('txt_ed5102')}</motion.p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b, idx) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <GlassCard className="h-full p-8 border-white/5 space-y-4 group  transition-all duration-500">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center  transition-colors">
                    <b.icon className="w-6 h-6 text-white  transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold">{b.title}</h3>
                  <p className="text-sm text-white leading-relaxed">{b.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col md:flex-row items-center gap-8 pt-12"
          >
            <Link 
              href="/login?role=merchant" 
              className="w-full md:w-auto px-12 py-5  text-black font-bold uppercase tracking-widest rounded-2xl  hover:scale-105 transition-all duration-500 flex items-center justify-center gap-3"
              prefetch={false}
            >
              {t('txt_f9c0f6')}<ArrowRight className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-px bg-white/10" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">{t('txt_f1bdcd')}</span>
              <div className="w-12 h-px bg-white/10" />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
