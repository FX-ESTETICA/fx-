"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "zh", label: "简", name: "简体中文" },
  { code: "it", label: "IT", name: "Italiano" },
];

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLanguageChange = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      >
        <Globe className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-10 mb-2 w-28 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl origin-bottom-right animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className="w-full px-4 py-2 text-left text-[11px] font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between group"
              >
                <span>{lang.name}</span>
                <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-gx-cyan">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
