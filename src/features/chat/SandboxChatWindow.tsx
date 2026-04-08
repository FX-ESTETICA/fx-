import React, { useState } from 'react';
import { useChatEngine } from './hooks/useChatEngine';
import { Blurhash } from 'react-blurhash';
import { useTranslations } from "next-intl";

interface SandboxChatProps {
  currentUserId: string;
  receiverId?: string; // 1v1 私聊
  roomId?: string; // 商家群聊
}

/**
 * 极简沙盒聊天舱 (仅供逻辑验证与联调)
 * 集成：文本发送、极速图片降维上传、Blurhash 占位符渲染、Realtime 毫秒级拉取
 */
export default function SandboxChatWindow({ currentUserId, receiverId, roomId }: SandboxChatProps) {
    const t = useTranslations('SandboxChatWindow');
  const { messages, isSending, sendMessage } = useChatEngine(currentUserId, roomId, receiverId);
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSend = async () => {
    if (!textInput && !selectedFile) return;
    
    // 触发 useChatEngine 中的降维与发送逻辑
    await sendMessage(textInput, selectedFile || undefined);
    
    // 发送成功后清空状态
    setTextInput('');
    setSelectedFile(null);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-black text-white border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* 1. 顶部全息状态栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-sm font-medium tracking-widest uppercase text-gray-300">
            {roomId ? `空间群聊: ${roomId}` : `加密私聊`}
          </span>
        </div>
        <span className="text-xs text-gray-600 font-mono">Realtime 0ms</span>
      </div>

      {/* 2. 聊天信息流瀑布 (高度聚合) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-3 ${isMe ? 'bg-indigo-900/40 border border-indigo-500/30' : 'bg-gray-800/50 border border-gray-700/50'}`}>
                {/* 文本内容 */}
                {msg.content && (
                  <p className="text-sm leading-relaxed text-gray-200 break-words">{msg.content}</p>
                )}
                
                {/* 图片与 Blurhash 渲染核心逻辑 */}
                {msg.image_url && (
                  <div className="mt-2 relative rounded-xl overflow-hidden bg-gray-900">
                    {/* 如果存在 Blurhash，先铺一层极低成本的色彩占位符 */}
                    {msg.blurhash && (
                       <Blurhash
                         hash={msg.blurhash}
                         width={200}
                         height={150}
                         resolutionX={32}
                         resolutionY={32}
                         punch={1}
                         className="absolute inset-0 z-0 opacity-50"
                       />
                    )}
                    {/* 等真实图片加载完毕后覆盖在上方 (由于被压成了 100KB，加载速度极快) */}
                    <img 
                      src={msg.image_url} 
                      alt="chat_media" 
                      className="relative z-10 w-full h-auto object-cover max-h-[300px] rounded-xl shadow-lg"
                      loading="lazy"
                    />
                    
                    {/* 降维话术：坦诚 Web 端的缓存易失性 */}
                    <div className="absolute bottom-2 right-2 z-20">
                       <span className="text-[10px] text-white/50 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">
                         {t('txt_b0a14d')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. 底部指令舱 (包含极限图片压缩入口) */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
        <div className="flex items-end space-x-3 bg-black rounded-xl p-2 border border-gray-800">
          
          {/* 选择图片按钮 (隐藏原生 input) */}
          <label className="cursor-pointer shrink-0 p-2 rounded-lg hover:bg-gray-800 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              }} 
            />
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </label>

          <div className="flex-1 flex flex-col">
            {/* 图片预览与撤销 */}
            {selectedFile && (
              <div className="flex items-center space-x-2 mb-2 px-2 py-1 bg-gray-800 rounded-md max-w-fit">
                <span className="text-xs text-indigo-400 truncate max-w-[120px]">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            )}
            
            {/* 文本输入框 */}
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('txt_f8ea23')}
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-200 resize-none h-10 py-2 px-1 placeholder-gray-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

          {/* 发送按钮 (绑定 isSending 状态防止连击爆破) */}
          <button 
            onClick={handleSend}
            disabled={isSending || (!textInput && !selectedFile)}
            className="shrink-0 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
