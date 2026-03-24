import { redirect } from 'next/navigation';

export default function Home() {
  // 全局唯一入口：强制拦截到登录页
  redirect('/login');
}
