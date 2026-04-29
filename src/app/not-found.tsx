import { useTranslations } from "next-intl";

export default function NotFound() {
 const t = useTranslations('notfound');
 return (
 <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center relative z-50">
 <h1 className="text-6xl mb-4 ">404</h1>
 <p className="text-white tracking-widest uppercase">{t('txt_bfb989')}</p>
 </div>
 );
}