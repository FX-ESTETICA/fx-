"use client";

import { useState, useRef, useEffect } from 'react';
import { Blurhash } from 'react-blurhash';
import { ArrowLeft, X, MoreHorizontal, Camera, SendHorizontal, Loader2, Sparkles, Mic, Keyboard, CornerUpLeft, Languages, ArrowRight } from 'lucide-react';
import { useChatEngine } from '../hooks/useChatEngine';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { useTranslations } from "next-intl";
import { supabase } from '@/lib/supabase';
import { LoginForm } from "@/features/auth/components/LoginForm"; // 复用系统现有的安全体系

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isGroupChat = !!roomId;
  
  // 内源绑定状态 (游客转正)
  const [showBindModal, setShowBindModal] = useState(false);

  // ---------------- 真实身份反查逻辑 ----------------
  const [trueRoomName, setTrueRoomName] = useState(roomName);
  const [trueAvatar, setTrueAvatar] = useState<string | null>(null);

  useEffect(() => {
    // 如果是单聊且有 receiverId，去查对方的真实档案 (加入 UUID 防御)
    if (receiverId && !roomId) {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (UUID_REGEX.test(receiverId)) {
        const fetchProfile = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', receiverId)
            .maybeSingle();
          if (data) {
            if (data.name) setTrueRoomName(data.name);
            if (data.avatar_url) setTrueAvatar(data.avatar_url);
          }
        };
        fetchProfile();
      } else {
        // 拦截非 UUID 非法查询 (如 wa_3, phone_3937, guest_001)
        if (receiverId.startsWith('wa_')) {
          setTrueRoomName(`WA客户 ${receiverId.replace('wa_', '').substring(0, 4)}`);
          setTrueAvatar(null);
        } else if (receiverId.startsWith('phone_')) {
          const rawPhone = receiverId.replace('phone_', '');
          setTrueRoomName(`+86 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,7)} ${rawPhone.substring(7)}`);
          setTrueAvatar(null);
        } else if (receiverId.startsWith('guest_')) {
          setTrueRoomName(`游客 ${receiverId.replace('guest_', '')}`);
          setTrueAvatar(null);
        } else {
          setTrueRoomName(roomName);
        }
      }
    } else {
      setTrueRoomName(roomName);
    }
  }, [receiverId, roomId, roomName]);

  // ---------------- 身份判断 ----------------
  const isWhatsApp = receiverId?.startsWith('wa_') || roomName.includes('WHATSAPP');

  // 自动滚动到最新消息
  const scrollToBottom = (isInitial = false) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: isInitial ? 'auto' : 'smooth'
      });
    }
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    scrollToBottom(isInitialMount.current);
    isInitialMount.current = false;
  }, [messages]);

  // ---------------- 终极语音状态机 (Voice State Machine) ----------------
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState<'recording' | 'canceling' | 'converting'>('recording');
  const [recordDuration, setRecordDuration] = useState(0);
  
  // 原生录音桥接状态 (真实录音引擎)
  const { startRecording: startAudioRecord, stopRecording: stopAudioRecord, cancelRecording: cancelAudioRecord } = useAudioRecorder();
  
  // 本地降维翻译引擎 (Web Speech API)
  const { isSupported: isSpeechSupported, transcript, interimTranscript, startListening, stopListening, abortListening } = useSpeechRecognition();

  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 核心防御结界与全屏扇形雷达结算 (WeChat Style - 局部容器坐标系)
  const handleTouchMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRecording) {
      if (e.cancelable) e.preventDefault();
      
      if (!containerRef.current) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // 获取当前聊天窗口容器的物理坐标和尺寸
      const rect = containerRef.current.getBoundingClientRect();
      
      // 计算手指在聊天容器内的相对位置
      const relativeX = currentX - rect.left;
      const relativeY = currentY - rect.top;
      
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      
      // 以聊天容器的绝对中心线为界
      const isLeftSide = relativeX < containerWidth / 2;
      
      // 计算手指距离容器底部的高度
      const distFromBottom = containerHeight - relativeY;
      
      // 触发结界的垂直高度阈值 (向上滑超过 100px 进入结算区)
      const VERTICAL_THRESHOLD = 100;

      if (distFromBottom > VERTICAL_THRESHOLD) {
        if (isLeftSide) {
          // 手指在容器左半边，且滑过高度阈值 -> 触发取消 (红色区域)
          setRecordStatus('canceling');
        } else {
          // 手指在容器右半边，且滑过高度阈值 -> 触发转文字 (紫色区域)
          setRecordStatus('converting');
        }
      } else {
        // 在高度阈值以下的安全区内 -> 正常录音 (青色区域)
        setRecordStatus('recording');
      }
    }
  };

  const handleStartRecord = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
    
    if (buttonRef.current) {
      buttonRef.current.setPointerCapture(e.pointerId);
    }

    touchStartPos.current = { x: e.clientX, y: e.clientY };
    setIsRecording(true);
    setRecordStatus('recording');
    setRecordDuration(0);
    
    // 【双轨引擎启动】
    // 轨道 A：启动本地语音转文字监听 (作为降维打击)
    if (isSpeechSupported) {
      startListening();
    }
    
    // 轨道 B：启动真实的底层音频录制
    await startAudioRecord();

    recordTimerRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecord = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
    
    if (buttonRef.current && buttonRef.current.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    
    if (isRecording) {
      if (recordStatus === 'canceling') {
        console.log("【动作结算】录音/识别已取消");
        if (isSpeechSupported) abortListening(); 
        cancelAudioRecord(); // 丢弃音频文件
      } else if (recordStatus === 'converting') {
        console.log("【动作结算】转文字处理");
        cancelAudioRecord(); // 用户选择了转文字，就不需要保存音频文件了，直接废弃音频流
        
        if (isSpeechSupported) {
          stopListening();
          const finalText = (transcript + ' ' + interimTranscript).trim();
          if (finalText) {
            setTextInput(finalText);
            setInputMode('text');
          } else {
            setInputMode('text');
          }
        }
      } else {
        console.log("【动作结算】发送真实录音，时长：", recordDuration);
        
        if (isSpeechSupported) stopListening();
        
        // 获取真实的音频 Blob
        const audioBlob = await stopAudioRecord();
        
        if (audioBlob && recordDuration > 0) {
          // 调用 sendMessage 上传音频
          sendMessage(undefined, undefined, audioBlob, recordDuration);
        }
        
        setInputMode('text'); 
      }
    }
    
    setIsRecording(false);
    setRecordStatus('recording');
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedFile) return;
    
    await sendMessage(inputText, selectedFile || undefined);
    
    setTextInput('');
    setSelectedFile(null);
  };

  return (
    // 绝对透明容器，让底层星云透射上来
    <div ref={containerRef} className="w-full h-full bg-transparent flex flex-col pt-safe-top relative overflow-hidden">
      
      {/* 1. 顶部：导航与雷达仪 */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between z-20 border-b border-white/10 backdrop-blur-md bg-black/20">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-white/70 hover:text-cyan-400 transition-colors flex items-center gap-1 group"
        >
          <X className="w-6 h-6 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] hidden md:block group-hover:rotate-90 transition-transform" />
          <ArrowLeft className="w-6 h-6 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] md:hidden" />
        </button>
        
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center gap-2">
            {trueAvatar ? (
              <img src={trueAvatar} alt="avatar" className="w-6 h-6 rounded-full border border-white/20 object-cover shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
            ) : (
              <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {trueRoomName ? trueRoomName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <span className="text-white font-bold tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] uppercase flex items-center gap-2">
              {trueRoomName}
              {isWhatsApp && <span className="w-2 h-2 rounded-full bg-[#25D366] shadow-[0_0_5px_rgba(37,211,102,0.8)] animate-pulse" />}
            </span>
          </div>
          {/* 内源转化：如果您是隐形账号 (游客/手机号)，提示您绑定 */}
          {(currentUserId.startsWith('phone_') || currentUserId.startsWith('guest_')) && (
            <button 
              onClick={() => setShowBindModal(true)}
              className="text-[10px] font-mono text-cyan-400 mt-1 hover:text-cyan-300 tracking-widest bg-cyan-900/30 px-2 py-0.5 rounded-full border border-cyan-500/30"
            >
              [ 永久保存档案 ]
            </button>
          )}
        </div>

        <button className="p-2 -mr-2 text-white/50 hover:text-white transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* 内源绑定 Modal (借力打力，0 验证码注册) */}
      {showBindModal && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-black border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6">
            <button 
              onClick={() => setShowBindModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white tracking-widest uppercase mb-2">安全授权通道</h3>
              <p className="text-xs text-white/40 font-mono">
                绑定您的真实邮箱/Google账号，<br/>永久保存当前所有聊天记录与特权。
              </p>
            </div>
            
            {/* 直接复用系统的登录组件，在成功回调里处理合并逻辑 */}
            <div className="scale-90 origin-top">
              <LoginForm />
            </div>
          </div>
        </div>
      )}

      {/* 【全屏录音结界 / 扇形雷达渲染区】 */}
      {isRecording && (
        <div className="absolute inset-0 z-[100] pointer-events-none flex flex-col justify-end pb-[120px] rounded-r-3xl overflow-hidden">
          {/* 结界背景遮罩 (带微弱渐变) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

          {/* 雷达指示区 */}
          <div className="relative w-full h-[300px] flex items-end justify-center px-8">
            
            {/* 左侧：取消结界 (红色) */}
            <div className={`absolute left-0 bottom-0 w-1/2 h-full flex items-end justify-center pb-12 transition-all duration-300
              ${recordStatus === 'canceling' ? 'scale-110' : 'scale-100 opacity-60'}
            `}>
              <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all
                ${recordStatus === 'canceling' ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)]' : 'bg-white/10 backdrop-blur-md'}
              `}>
                <CornerUpLeft className={`w-8 h-8 mb-1 ${recordStatus === 'canceling' ? 'text-white' : 'text-red-400'}`} />
                <span className={`text-[10px] font-bold tracking-widest ${recordStatus === 'canceling' ? 'text-white' : 'text-red-400'}`}>
                  取消
                </span>
              </div>
            </div>

            {/* 右侧：转文字结界 (紫色) */}
            <div className={`absolute right-0 bottom-0 w-1/2 h-full flex items-end justify-center pb-12 transition-all duration-300
              ${recordStatus === 'converting' ? 'scale-110' : 'scale-100 opacity-60'}
            `}>
              <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all
                ${recordStatus === 'converting' ? 'bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]' : 'bg-white/10 backdrop-blur-md'}
              `}>
                <Languages className={`w-8 h-8 mb-1 ${recordStatus === 'converting' ? 'text-white' : 'text-purple-400'}`} />
                <span className={`text-[10px] font-bold tracking-widest ${recordStatus === 'converting' ? 'text-white' : 'text-purple-400'}`}>
                  转文字
                </span>
              </div>
            </div>

            {/* 中心：雷达主波形 (仅在正常录音时显示) */}
            <div className={`absolute bottom-0 w-full flex flex-col items-center justify-end pb-8 transition-all duration-300
              ${recordStatus === 'recording' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
            `}>
              {/* 这里可以放一个更炫酷的大波形，目前先用文字和简易波形替代 */}
              <div className="flex items-center gap-1 mb-4">
                <div className="w-1.5 h-6 bg-cyan-400 rounded-full animate-pulse" />
                <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-pulse delay-75" />
                <div className="w-1.5 h-14 bg-cyan-400 rounded-full animate-pulse delay-150" />
                <div className="w-1.5 h-8 bg-cyan-400 rounded-full animate-pulse delay-300" />
                <div className="w-1.5 h-4 bg-cyan-400 rounded-full animate-pulse delay-[450ms]" />
              </div>
              <span className="text-cyan-400 font-bold tracking-widest text-lg drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                上滑 取消/转文字
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 2. 战场核心：全息字幕气泡区 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 z-10 no-scrollbar">


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
                {/* 特殊指令拦截：一键引流魔法卡片渲染 */}
                {msg.content && msg.content.includes("欢迎连接 GX 星云。您的专属体验舱已就绪") && msg.content.includes("https://app.gx.com/invite/") ? (
                  <div className="flex flex-col gap-3 w-full sm:w-[320px]">
                    <span className={`text-[15px] leading-relaxed tracking-wide ${isMe ? 'text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]'}`}>
                      欢迎连接 GX 星云。您的专属体验舱已就绪，点击激活全息服务：
                    </span>
                    <a 
                      href={msg.content.match(/https:\/\/app\.gx\.com\/invite\/\w+/)?.[0] || "https://app.gx.com"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/60 to-black border border-purple-500/30 p-4 hover:border-purple-400/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all group no-underline"
                    >
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
                      
                      <div className="relative z-10 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black border border-purple-500/40 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-purple-100 font-bold text-[15px] mb-1 tracking-wide truncate">GX 专属全息通行证</h4>
                          <p className="text-purple-300/60 text-[10px] font-mono tracking-widest uppercase">Click to activate Nexus</p>
                        </div>
                      </div>
                      
                      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-purple-500/20 pt-3">
                        <span className="text-[10px] text-purple-400/50 font-mono tracking-widest">SECURE LINK</span>
                        <div className="flex items-center gap-1 text-purple-400 text-xs font-bold uppercase tracking-widest group-hover:text-purple-300 transition-colors">
                          立即进入 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </a>
                  </div>
                ) : (
                  /* 文本渲染 (高亮字幕悬浮) */
                  msg.content && (
                    <p className={`
                      text-[15px] leading-relaxed tracking-wide break-words
                      ${isMe 
                        ? 'text-cyan-50 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' // 我的消息：带青色高光
                        : 'text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]' // 对方消息：纯白高光
                      }
                    `}>
                      {msg.content}
                    </p>
                  )
                )}

                {/* 语音渲染 */}
                {msg.audio_url && (
                  <VoiceMessagePlayer audioUrl={msg.audio_url} duration={msg.audio_duration || 0} />
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

        {/* 最外层包裹容器 */}
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
          {/* 悬浮输入舱 - 输入框容器 */}
          <div className="flex-1 relative group h-11">
            <div className={`absolute inset-0 rounded-full border transition-all pointer-events-none
              border-white/15 group-focus-within:border-cyan-400/50 group-focus-within:shadow-[0_0_20px_rgba(34,211,238,0.15)]
              `} 
            />
            
            {/* 三态量子离合器：根据模式切换渲染 */}
            {inputMode === 'text' ? (
              <textarea
                value={inputText}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={t('txt_0bbdcf')}
                rows={1}
                className={`w-full h-full bg-transparent outline-none focus:outline-none rounded-full border-none focus:ring-0 text-[15px] leading-[44px] py-0 pl-4 pr-12 resize-none no-scrollbar relative z-0
                  text-white placeholder:text-white/30
                `}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            ) : (
              // 录音按压舱 (Press-to-Talk Pod)
              <div 
                ref={buttonRef}
                className={`
                  w-full h-full flex items-center justify-center rounded-full select-none
                  ${isRecording 
                    ? recordStatus === 'canceling' 
                      ? 'bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all'
                      : recordStatus === 'converting'
                        ? 'bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all'
                        : 'bg-gx-cyan/20 shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all'
                    : 'bg-white/5 hover:bg-white/10 transition-colors'
                  }
                `}
                style={{
                  touchAction: 'none', // 物理级结界：彻底禁止该区域的滚动与缩放
                  WebkitTouchCallout: 'none', // 杀掉 iOS 默认长按菜单
                }}
                onPointerDown={handleStartRecord}
                onPointerUp={handleStopRecord}
                onPointerCancel={handleStopRecord}
                onPointerLeave={handleStopRecord}
                onPointerMove={handleTouchMove}
              >
                {isRecording ? (
                  <div className="flex items-center gap-2">
                    {/* 赛博波形指示器 (简易版) */}
                    <div className="flex items-center gap-0.5">
                      {recordStatus === 'canceling' ? (
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                      ) : recordStatus === 'converting' ? (
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      ) : (
                        <>
                          <div className="w-1 h-3 bg-gx-cyan rounded-full animate-pulse" />
                          <div className="w-1 h-5 bg-gx-cyan rounded-full animate-pulse delay-75" />
                          <div className="w-1 h-2 bg-gx-cyan rounded-full animate-pulse delay-150" />
                        </>
                      )}
                    </div>
                    
                    {/* 实时语音转文字的显化区 */}
                    <div className="flex flex-col items-center justify-center max-w-[60%] overflow-hidden">
                      {isSpeechSupported && (transcript || interimTranscript) ? (
                        <span className="text-white text-sm truncate w-full text-center tracking-wide">
                          {transcript} <span className="text-white/60">{interimTranscript}</span>
                        </span>
                      ) : (
                        <span className={`font-mono font-bold tracking-widest ${
                          recordStatus === 'canceling' ? 'text-red-500' :
                          recordStatus === 'converting' ? 'text-purple-500' :
                          'text-gx-cyan'
                        }`}>
                          00:{recordDuration.toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    
                    <span className={`text-xs ml-2 tracking-widest uppercase ${
                      recordStatus === 'canceling' ? 'text-red-500 animate-pulse font-bold' :
                      recordStatus === 'converting' ? 'text-purple-500 animate-pulse font-bold' :
                      'text-gx-cyan/60 animate-pulse'
                    }`}>
                      {recordStatus === 'canceling' ? '松开取消' :
                       recordStatus === 'converting' ? '松开转文字' :
                       '松开结束'}
                    </span>
                  </div>
                ) : (
                  <span className="text-white/70 font-bold tracking-widest uppercase">按住 说话</span>
                )}
              </div>
            )}

            {/* 内嵌的相机/图片上传入口 (仅在文本模式显示) */}
            {inputMode === 'text' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-cyan-400 transition-colors z-10 drop-shadow-[0_0_3px_rgba(255,255,255,0.2)]"
                title="拍照或发送图片"
              >
                <Camera className="w-[22px] h-[22px]" />
              </button>
            )}
          </div>

          {/* 引擎点火发送键 & 语音切换键 */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* 一键引流魔法 (仅 WhatsApp 且未超时显示) */}
            {isWhatsApp && (
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                     // 自动发送通行证链接
                     sendMessage("欢迎连接 GX 星云。您的专属体验舱已就绪，点击激活全息服务：https://app.gx.com/invite/123", undefined);
                  }}
                  className="w-11 h-8 rounded-xl flex items-center justify-center border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/30 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all group relative shrink-0"
                  title="发送全息通行证"
                >
                  <Sparkles className="w-4 h-4 text-purple-300" />
                  <span className="absolute -top-6 right-0 text-[9px] whitespace-nowrap text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded border border-purple-500/30">一键引流</span>
                </button>
              </div>
            )}

            {/* 群聊禁用语音功能判断 */}
            {!isGroupChat || (inputText.trim() || selectedFile) ? (
              <button 
                onClick={() => {
                  // 如果有文字或图片，执行发送
                  if (inputText.trim() || selectedFile) {
                    handleSend();
                  } else {
                    // 否则执行模式切换 (Text <-> Voice)
                    if (!isGroupChat) setInputMode(prev => prev === 'text' ? 'voice' : 'text');
                  }
                }}
                disabled={isSending}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                  ${isSending 
                    ? 'bg-transparent border border-cyan-500' 
                    : (inputText.trim() || selectedFile)
                      ? 'bg-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.6)] text-black scale-100' 
                      : 'bg-white/10 hover:bg-white/20 text-white/50 hover:text-white scale-100' // 空状态下作为模式切换键
                  }
                `}
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : (inputText.trim() || selectedFile) ? (
                  <SendHorizontal className="w-5 h-5 ml-0.5" />
                ) : inputMode === 'text' ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <Keyboard className="w-5 h-5" />
                )}
              </button>
            ) : null}
          </div>

        </div>
      </div>

    </div>
  );
}
