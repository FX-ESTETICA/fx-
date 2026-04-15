"use client";

import { AnimatePresence, motion } from 'framer-motion';
import ChatListUI from '@/features/chat/components/ChatListUI';
import ChatRoomUI from '@/features/chat/components/ChatRoomUI';
import { NebulaBackground } from '@/components/shared/NebulaBackground';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChatStore } from '@/store/useChatStore';
import { useTranslations } from "next-intl";
import { BottomNavBar } from '@/components/shared/BottomNavBar';

export default function ChatListPage() {
  const t = useTranslations('chat');
  const { user } = useAuth();
  
  // 避免报错：如果用户没登录，给个占位符或者让他去登录
  const currentUserId = user?.id || 'guest_123';

  // 状态机：控制当前显示的视图和选中的聊天对象 (通过 Zustand 同步给全局)
  const { activeChat, setActiveChat } = useChatStore();

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
          <BottomNavBar className="absolute bottom-0 left-0 right-0" />
        </div>

        {/* 右侧：主战场（手机端如果没选中则隐藏；平板/PC端如果没选中则显示星云空场占位符） */}
        <div className={`flex-1 h-full relative ${!activeChat ? 'hidden md:flex' : 'block'}`}>
          <AnimatePresence initial={false} mode="wait">
            {activeChat ? (
              <motion.div
                key={activeChat.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-sm"
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
                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-white/30"
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
