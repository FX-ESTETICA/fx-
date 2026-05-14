"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, Heart, Share2, ShoppingBag, Headphones, ChevronRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { useRef, useState } from "react";

// 优选商城 Mock 数据 - 共享数据，真实场景应从 API 拉取
const MOCK_MALL_PRODUCTS = [
  {
    id: "p1",
    name: "星空磨砂美甲套盒",
    price: 299,
    sales: "100+",
    shopName: "FX ESTETICA",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop",
    tag: "GX PRO 官方认证",
    desc: "采用纳米级星空磨砂材质，打造独一无二的深邃质感。包含 12 种星系配色，随光线变幻折射出不同的光影效果。"
  },
  {
    id: "p2",
    name: "Lumina 抗老面霜",
    price: 899,
    sales: "500+",
    shopName: "Lumina 医美中心",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
    tag: "包邮",
    desc: "医美级核心抗老配方，深入肌底重塑胶原蛋白网络。质地如丝绸般顺滑，瞬间吸收无负担。"
  },
  {
    id: "p3",
    name: "极简碳纤维运动水壶",
    price: 129,
    sales: "2k+",
    shopName: "Zenith 健身俱乐部",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&auto=format&fit=crop",
    tag: "新品",
    desc: "航空级碳纤维材质，极致轻量化设计。双层真空保温保冷，适合全天候高强度运动场景。"
  },
  {
    id: "p4",
    name: "手工冷萃咖啡豆 (250g)",
    price: 88,
    sales: "300+",
    shopName: "Neon Coffee Roasters",
    image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=800&auto=format&fit=crop",
    tag: "热销",
    desc: "甄选高海拔阿拉比卡咖啡豆，采用独特的赛博朋克风冷萃烘焙工艺，释放出迷人的浆果与黑巧克力风味。"
  },
  {
    id: "p5",
    name: "深海海藻睡眠面膜",
    price: 199,
    sales: "800+",
    shopName: "Lumina 医美中心",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop",
    tag: "GX PRO 官方认证",
    desc: "提取自深海 3000 米的珍稀海藻精粹，夜间持续为肌肤注入澎湃水动力，清晨醒来肌肤水润透亮。"
  },
  {
    id: "p6",
    name: "赛博朋克调酒套装",
    price: 459,
    sales: "50+",
    shopName: "午夜霓虹赛博酒馆",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=800&auto=format&fit=crop",
    tag: "限量",
    desc: "限量版霓虹变色调酒套装，内置智能感应芯片，随调酒动作变换灯光，让你成为派对的绝对核心。"
  }
];

export default function ProductDetailClient({ productId }: { productId: string }) {
  const router = useRouter();
  const t = useTranslations("ProductDetail");
  const { settings: visualSettings } = useVisualSettings();
  const isLight = visualSettings.frontendBgIndex >= 1;
  const [isLiked, setIsLiked] = useState(false);

  const product = MOCK_MALL_PRODUCTS.find((p) => p.id === productId) || MOCK_MALL_PRODUCTS[0];

  // 视差滚动控制
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  const scale = useTransform(scrollY, [0, 300], [1, 1.1]);

  return (
    <main className="relative min-h-[100dvh] w-full bg-transparent overflow-x-hidden">
      {/* 沉浸式商品画廊 (Hero Gallery) */}
      <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-black">
        <motion.div style={{ y, opacity, scale }} className="absolute inset-0 origin-top">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {/* 底部渐变暗场，用于过渡到内容区 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </motion.div>

        {/* 顶部悬浮控制栏 */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-50 mt-safe">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <Heart className={cn("w-5 h-5 transition-colors", isLiked ? "fill-red-500 text-red-500" : "")} />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 核心内容舱 (Information Hub) - 随滚动上浮 */}
      <div className={cn(
        "relative z-20 min-h-[50vh] -mt-10 rounded-t-3xl p-6 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]",
        isLight ? "bg-white/90 backdrop-blur-2xl" : "bg-[#0A0A0A]/90 backdrop-blur-2xl"
      )}>
        {/* 顶部指示条 */}
        <div className="w-12 h-1.5 rounded-full bg-gray-500/30 mx-auto mb-8" />

        {/* 价格与标题 */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-yellow-500 text-xl font-bold">¥</span>
              <span className="text-yellow-500 text-4xl font-black tracking-tighter leading-none">{product.price}</span>
            </div>
            <span className={cn("text-xs tracking-widest uppercase", isLight ? "text-black/40" : "text-white/40")}>
              {t("sold")} {product.sales}
            </span>
          </div>
          
          <h1 className={cn("text-2xl font-bold tracking-wider leading-snug", isLight ? "text-black" : "text-white")}>
            {product.name}
          </h1>

          {/* 标签区 */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 text-[10px] uppercase tracking-widest">
              {product.tag}
            </span>
            <span className={cn("px-2 py-1 rounded border text-[10px] uppercase tracking-widest", isLight ? "bg-black/5 border-black/10 text-black/60" : "bg-white/5 border-white/10 text-white/60")}>
              {t("stock")}
            </span>
            <span className={cn("px-2 py-1 rounded border text-[10px] uppercase tracking-widest", isLight ? "bg-black/5 border-black/10 text-black/60" : "bg-white/5 border-white/10 text-white/60")}>
              {t("shipping")}
            </span>
          </div>
        </div>

        <div className={cn("w-full h-px my-6", isLight ? "bg-black/10" : "bg-white/10")} />

        {/* 来源门店引流区 (Store Link) */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl border cursor-pointer group",
          isLight ? "bg-black/5 border-black/10 hover:bg-black/10" : "bg-white/5 border-white/10 hover:bg-white/10"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", isLight ? "bg-white border-black/10" : "bg-black/50 border-white/10")}>
              <CheckCircle2 className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="flex flex-col">
              <span className={cn("text-sm font-bold tracking-wider", isLight ? "text-black" : "text-white")}>{product.shopName}</span>
              <span className={cn("text-[10px] tracking-widest uppercase", isLight ? "text-black/50" : "text-white/50")}>{t("authentic")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-yellow-600">
            <span>{t("store")}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        <div className={cn("w-full h-px my-6", isLight ? "bg-black/10" : "bg-white/10")} />

        {/* 详情图文区 (Rich Content) */}
        <div className="space-y-4">
          <h2 className={cn("text-sm font-bold tracking-widest uppercase", isLight ? "text-black" : "text-white")}>
            {t("description")}
          </h2>
          <p className={cn("text-sm leading-relaxed tracking-wide", isLight ? "text-black/70" : "text-white/70")}>
            {product.desc}
          </p>
          {/* 模拟长图 */}
          <div className="w-full aspect-[4/5] relative rounded-2xl overflow-hidden mt-6 border border-white/5">
            <Image src={product.image} alt="detail" fill className="object-cover" />
          </div>
        </div>
      </div>

      {/* 降维交互底栏 (Zero-Friction Action Bar) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 pb-safe pointer-events-none z-50 flex justify-center">
        <div className={cn(
          "w-full max-w-md p-2 rounded-full flex items-center gap-2 pointer-events-auto border shadow-2xl",
          isLight ? "bg-white/80 backdrop-blur-xl border-black/10" : "bg-black/80 backdrop-blur-xl border-white/10"
        )}>
          {/* 客服图标 */}
          <button className={cn(
            "flex flex-col items-center justify-center w-14 h-12 rounded-full hover:bg-black/5 transition-colors",
            isLight ? "text-black/70" : "text-white/70"
          )}>
            <Headphones className="w-5 h-5 mb-0.5" />
            <span className="text-[8px] uppercase tracking-widest">{t("customer_service")}</span>
          </button>
          
          {/* 购物车图标 */}
          <button className={cn(
            "flex flex-col items-center justify-center w-14 h-12 rounded-full hover:bg-black/5 transition-colors",
            isLight ? "text-black/70" : "text-white/70"
          )}>
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            <span className="text-[8px] uppercase tracking-widest">CART</span>
          </button>

          {/* 购买按钮区 */}
          <div className="flex-1 flex items-center gap-2 px-2">
            <button className={cn(
              "flex-1 h-12 rounded-full border text-xs font-bold tracking-widest uppercase transition-colors",
              isLight ? "border-black text-black hover:bg-black/5" : "border-white/30 text-white hover:bg-white/10"
            )}>
              {t("add_to_cart")}
            </button>
            <button className="flex-1 h-12 rounded-full bg-yellow-500 text-black text-xs font-bold tracking-widest uppercase hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              {t("buy_now")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
