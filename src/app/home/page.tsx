import { supabase } from "@/lib/supabase";
import { HomeClient } from "./HomeClient";

// 服务端组件，不使用 "use client"
export default async function HomePage() {
  // 服务端拉取真实商铺数据，实现直出提速
  let realShops: any[] = [];
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .not('config', 'is', null)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      realShops = data;
    } else if (error) {
      console.warn("Failed to fetch real shops on server", error);
    }
  } catch (err) {
    console.error("Failed to fetch real shops on server", err);
  }

  // 将数据传给客户端组件进行渲染和交互
  return <HomeClient initialRealShops={realShops} />;
}
