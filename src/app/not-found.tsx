import { useTranslations } from "next-intl";

export default function NotFound() {
    const t = useTranslations('notfound');
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-mono relative z-50">
      <h1 className="text-6xl text-gx-cyan mb-4 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">404</h1>
      <p className="text-white/60 tracking-widest uppercase">{t('txt_bfb989')}</p>
    </div>
  );
}