"use client";

import { NebulaBackground } from "@/components/shared/NebulaBackground";
import { GlassCard } from "@/components/shared/GlassCard";
import { motion } from "framer-motion";
import { Building2, Rocket, ShieldCheck, Zap, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const benefits = [
    {
      icon: Rocket,
      title: "快速上线",
      desc: "5分钟完成节点配置，即刻接入银河流量池"
    },
    {
      icon: ShieldCheck,
      title: "安全合规",
      desc: "Zero-Trust 协议保护，所有交易上链存证"
    },
    {
      icon: Zap,
      title: "精准推送",
      desc: "基于 LBS 的智能算法，让附近的客户发现你"
    }
  ];

  return (
    <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <NebulaBackground rotation={0} />
      
      <div className="max-w-4xl mx-auto px-6 py-24 relative z-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 hover:text-gx-cyan transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-mono uppercase tracking-widest">返回 / BACK</span>
        </button>

        <div className="space-y-16">
          <header className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gx-cyan/10 border border-gx-cyan/20 rounded-full"
            >
              <Building2 className="w-4 h-4 text-gx-cyan" />
              <span className="text-[10px] font-mono text-gx-cyan uppercase tracking-[0.2em]">Node_Application // 节点申请</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              BECOME A <br />
              <span className="text-gradient-cyan">GALAXY NODE</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/40 text-lg max-w-xl leading-relaxed"
            >
              加入 GX 商业生态，将您的实体店或生活服务转化为数字化节点。
              利用赛博时代的流量杠杆，触达极致清醒的消费群体。
            </motion.p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((b, idx) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                <GlassCard className="h-full p-8 border-white/5 space-y-4 group hover:border-gx-cyan/30 transition-all duration-500">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-gx-cyan/10 transition-colors">
                    <b.icon className="w-6 h-6 text-white/40 group-hover:text-gx-cyan transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold">{b.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{b.desc}</p>
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
              className="w-full md:w-auto px-12 py-5 bg-gx-cyan text-black font-bold uppercase tracking-widest rounded-2xl hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:scale-105 transition-all duration-500 flex items-center justify-center gap-3"
            >
              立即入驻 / JOIN NOW
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-4 text-white/20">
              <div className="w-12 h-px bg-white/10" />
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">OR EXPLORE THE DOCS</span>
              <div className="w-12 h-px bg-white/10" />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
