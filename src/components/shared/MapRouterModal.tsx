"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation, Globe, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface MapRouterModalProps {
  isOpen: boolean;
  onChoice: (choice: 'app' | 'web' | 'cancel', remember: boolean) => void;
}

export const MapRouterModal = ({ isOpen, onChoice }: MapRouterModalProps) => {
  const [remember, setRemember] = useState(false);
  const t = useTranslations('MapRouterModal');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => onChoice('cancel', false)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500" />
            
            <button
              onClick={() => onChoice('cancel', false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-cyan-400" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-2">{t('txt_4dffc7')}</h2>
              <p className="text-sm text-white/50 mb-6">
                {t('txt_979a49')}
              </p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => onChoice('app', remember)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3 text-cyan-400">
                    <Navigation className="w-5 h-5" />
                    <span className="font-medium">{t('txt_d67bde')}</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                </button>

                <button
                  onClick={() => onChoice('web', remember)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3 text-white/70">
                    <Globe className="w-5 h-5" />
                    <span className="font-medium">{t('txt_d484e5')}</span>
                  </div>
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40 cursor-pointer" onClick={() => setRemember(!remember)}>
                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${remember ? 'bg-cyan-500/20 border-cyan-500/50' : 'border-white/20'}`}>
                  {remember && <ShieldCheck className="w-3 h-3 text-cyan-400" />}
                </div>
                <span>{t('txt_8a2ef6')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
