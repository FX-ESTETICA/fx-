"use client";

import { AnimatePresence, motion } from 'framer-motion';
import ChatListUI from '@/features/chat/components/ChatListUI';
import ChatRoomUI from '@/features/chat/components/ChatRoomUI';
import { NebulaBackground } from '@/components/shared/NebulaBackground';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChatStore } from '@/store/useChatStore';
import { useTranslations } from "next-intl";
import { BottomNavBar } from '@/components/shared/BottomNavBar';
import { useEffect, useRef } from 'react';
import { useHardwareBack } from '@/hooks/useHardwareBack';
import { useSearchParams } from 'next/navigation';

export default function ChatListPage() {
  const t = useTranslations('chat');
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const targetParam = searchParams.get('target');
  const shopIdParam = searchParams.get('shopId');
  
  // 核心逻辑 1：无感身份赋予。没登录时优先使用 URL 里的 target (wa_xxx) 作为游客身份
  const currentUserId = user?.id || targetParam || 'guest_123';

  // 状态机：控制当前显示的视图和选中的聊天对象 (通过 Zustand 同步给全局)
  const { activeChat, setActiveChat } = useChatStore();
  const hasAutoOpened = useRef(false);

  // 核心逻辑 2：自动开门。如果有 shopIdParam，自动弹开聊天窗
  useEffect(() => {
    // 只有在没有 activeChat 的时候才自动打开，防止覆盖用户的后续操作
    if (shopIdParam && !activeChat && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setActiveChat({
        id: shopIdParam,
        name: '连接中...',
        isGroup: false,
      });
    }
  }, [shopIdParam, activeChat, setActiveChat]);

  // 注册物理返回键拦截（顶端架构：仅收起聊天室，不后退页面）
  const registerBack = useHardwareBack(state => state.register);
  const unregisterBack = useHardwareBack(state => state.unregister);

  useEffect(() => {
    if (activeChat) {
      registerBack('chat-room', () => {
        setActiveChat(null);
        return true; // 消费拦截事件
      }, 10);
    } else {
      unregisterBack('chat-room');
    }
    return () => unregisterBack('chat-room');
  }, [activeChat, setActiveChat, registerBack, unregisterBack]);

  return (
    // 修复高度塌陷：必须使用强制视口高度 h-[100dvh] 而不是 min-h-[100dvh]
    <main className="relative w-full h-[100dvh] bg-black overflow-hidden">
      {/* 模拟宇宙深空背景（底层常量） */}
      <div className="absolute inset-0 z-0">
         {/* 使用 NebulaBackground 产生星空流光效果 */}
         <NebulaBackground />
      </div>
      
      {/* 挂载极致清透的聊天枢纽（支持手机端单屏切换，平板/PC端分屏并列） */}
      <div className="relative z-10 w-full h-full overflow-hidden flex">
        {/* 左侧：雷达列表（手机端默认显示，如果选中了聊天则在手机端隐藏；平板/PC端始终显示） */}
        <div className={`relative w-full md:w-[380px] lg:w-[420px] h-full shrink-0 border-r border-white/10 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 overflow-hidden">
            <ChatListUI 
              currentUserId={currentUserId}
              onChatSelect={(chat) => setActiveChat(chat)} 
            />
          </div>
          
          {/* 桌面端：底部导航栏只在左侧显示，且手机端未选中聊天时也在此处显示底栏 */}
          <div className="absolute bottom-0 left-0 right-0 z-[100] pointer-events-auto">
            <BottomNavBar />
          </div>
        </div>

        {/* 右侧：主战场（手机端如果没选中则隐藏；平板/PC端如果没选中则显示星云空场占位符） */}
        <div className={`flex-1 h-full relative ${!activeChat ? 'hidden md:flex' : 'block'}`}>
          
          {/* 世界顶级修复法则：毛玻璃层持久化剥离 (Persistent Glass Shield)
              绝对禁止将 backdrop-blur 放入带有动态 key 的 AnimatePresence 容器中！
              将毛玻璃层提升为静态兄弟节点，仅控制 opacity，彻底消灭 GPU 重建渲染层导致的黑场闪烁。
          */}
          <div 
            className={`absolute inset-0 w-full h-full bg-black/40 backdrop-blur-sm pointer-events-none transition-opacity duration-300 ${activeChat ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
            style={{ willChange: 'opacity' }}
          />

          <AnimatePresence initial={false} mode="wait">
            {activeChat ? (
              <motion.div
                key={activeChat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 w-full h-full z-10"
              >
                <ChatRoomUI 
                  currentUserId={currentUserId} 
                  receiverId={activeChat.isGroup ? undefined : activeChat.id} 
                  roomId={activeChat.isGroup ? activeChat.id : undefined}
                  roomName={activeChat.name} 
                  onBack={() => setActiveChat(null)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-white/30 z-10"
              >
                <div className="w-24 h-24 mb-6 rounded-full border border-white/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-t border-gx-cyan animate-spin opacity-50" />
                  <span className="text-4xl">📡</span>
                </div>
                <p className="text-sm tracking-[0.2em] uppercase font-mono">{t('txt_71f8fd')}</p>
                <p className="text-xs text-white/20 mt-2">{t('txt_d9d041')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
