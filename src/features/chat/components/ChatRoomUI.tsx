"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Blurhash } from 'react-blurhash';
import { ArrowLeft, MoreHorizontal, Image as ImageIcon, SendHorizontal, Loader2 } from 'lucide-react';
import { useChatEngine } from '../hooks/useChatEngine';
import { useTranslations } from "next-intl";

interface ChatRoomUIProps {
  currentUserId: string;
  receiverId?: string; // 1v1 私聊
  roomId?: string; // 商家群聊或同城频道
  roomName?: string; // 显示在顶部的名称
  onBack?: () => void; // 退回聊天列表
}

export default function ChatRoomUI({ currentUserId, receiverId, roomId, roomName = '加密频道', onBack }: ChatRoomUIProps) {
    const t = useTranslations('ChatRoomUI');
  const { messages, isSending, sendMessage } = useChatEngine(currentUserId, roomId, receiverId);
  const [inputText, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() && !selectedFile) return;
    
    await sendMessage(inputText, selectedFile || undefined);
    
    setTextInput('');
    setSelectedFile(null);
  };

  return (
    // 绝对透明容器，让底层星云透射上来
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col pt-safe-top">
      
      {/* 1. 顶部：导航与雷达仪 */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between z-20 border-b border-white/10 backdrop-blur-md bg-black/20">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-white/70 hover:text-cyan-400 transition-colors md:hidden"
        >
          <ArrowLeft className="w-6 h-6 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
        </button>
        
        <div className="flex flex-col items-center flex-1">
          <span className="text-white font-bold tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">{roomName}</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
            <span className="text-[10px] text-green-400 tracking-wider">{t('txt_be6f6a')}</span>
          </div>
        </div>

        <button className="p-2 -mr-2 text-white/50 hover:text-white transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* 2. 战场核心：全息字幕气泡区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 z-10 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/30 space-y-3">
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
               <span className="text-xl">📡</span>
            </div>
            <p className="text-sm tracking-widest">{t('txt_fad9fb')}</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              
              <div className={`
                relative max-w-[80%] rounded-2xl p-3.5 
                bg-transparent /* 禁用实心背景 */
                ${isMe 
                  ? 'border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.1)] rounded-tr-sm' 
                  : 'border border-white/15 rounded-tl-sm'
                }
              `}>
                {/* 文本渲染 (高亮字幕悬浮) */}
                {msg.content && (
                  <p className={`
                    text-[15px] leading-relaxed tracking-wide break-words
                    ${isMe 
                      ? 'text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' // 我的消息：带青色高光
                      : 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]' // 对方消息：纯白高光
                    }
                  `}>
                    {msg.content}
                  </p>
                )}

                {/* 图片渲染 (Blurhash 预加载与极速降解标签) */}
                {msg.image_url && (
                  <div className="relative mt-1 rounded-xl overflow-hidden border border-white/10 group">
                    {/* Blurhash 占位层 */}
                    {msg.blurhash && (
                      <Blurhash
                        hash={msg.blurhash}
                        width={300}
                        height={200}
                        resolutionX={32}
                        resolutionY={32}
                        punch={1}
                        className="absolute inset-0 z-0 opacity-40 blur-sm w-full h-full object-cover"
                      />
                    )}
                    {/* 真实图片 (加载极快，因为只有 100KB) */}
                    <img 
                      src={msg.image_url} 
                      alt="Chat Media" 
                      className="relative z-10 w-full h-auto object-cover max-h-[350px]"
                      loading="lazy"
                    />
                    {/* 赛博朋克极速降解标签 */}
                    <div className="absolute bottom-2 right-2 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 px-2 py-1 rounded-md flex items-center space-x-1.5 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[9px] text-white/90 font-mono tracking-widest">30d BURN</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 时间戳 (极小字号，贴底边) */}
                <div className={`
                  absolute -bottom-5 text-[10px] tracking-wider whitespace-nowrap
                  ${isMe ? 'right-1 text-cyan-500/60' : 'left-1 text-white/40'}
                `}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. 底部：量子指令台 (Quantum Input Bar) */}
      <div className="px-4 pb-safe-bottom pt-2 shrink-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
        {/* 图片预览与撤销 */}
        {selectedFile && (
          <div className="flex items-center justify-between mb-3 p-2 bg-gray-900/60 backdrop-blur-md rounded-xl border border-cyan-500/30 w-fit max-w-[80%]">
            <span className="text-xs text-cyan-300 truncate tracking-wide mr-4">📎 {selectedFile.name}</span>
            <button onClick={() => setSelectedFile(null)} className="text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
          </div>
        )}

        <div className="flex items-end space-x-3 mb-4 relative">
          
          {/* 媒体上传入口 (隐藏原生 Input) */}
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            className="hidden" 
            onChange={(e) => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
            }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center border border-white/20 bg-black/40 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all"
          >
            <ImageIcon className="w-5 h-5 text-white/70" />
          </button>

          {/* 悬浮输入舱 */}
          <div className="flex-1 relative group">
            <div className="absolute inset-0 rounded-2xl border border-white/15 group-focus-within:border-cyan-400/50 group-focus-within:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all pointer-events-none" />
            <textarea
              value={inputText}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('txt_0bbdcf')}
              rows={1}
              className="w-full bg-black/40 backdrop-blur-sm rounded-2xl border-none focus:ring-0 text-[15px] text-white placeholder:text-white/30 py-3 px-4 resize-none min-h-[44px] max-h-[120px] no-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          {/* 引擎点火发送键 */}
          <button 
            onClick={handleSend}
            disabled={isSending || (!inputText.trim() && !selectedFile)}
            className={`
              shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
              ${isSending 
                ? 'bg-transparent border border-cyan-500' 
                : (inputText.trim() || selectedFile)
                  ? 'bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.6)] text-black scale-100' 
                  : 'bg-white/10 text-white/30 scale-90'
              }
            `}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <SendHorizontal className={`w-5 h-5 ${(inputText.trim() || selectedFile) ? 'ml-0.5' : ''}`} />
            )}
          </button>

        </div>
      </div>

    </div>
  );
}
