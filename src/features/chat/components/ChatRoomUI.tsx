"use client";

import { useState, useRef, useEffect } from 'react';
import { Blurhash } from 'react-blurhash';
import { ArrowLeft, X, MoreHorizontal, Camera, SendHorizontal, Loader2, Sparkles, Mic, Keyboard, CornerUpLeft, Languages, ArrowRight, Trash2, UserPlus } from 'lucide-react';
import { useChatEngine } from '../hooks/useChatEngine';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { useTranslations } from "next-intl";
import { supabase } from '@/lib/supabase';
import { LoginForm } from "@/features/auth/components/LoginForm"; // 复用系统现有的安全体系
import { useVisualSettings } from '@/hooks/useVisualSettings';
import { usePathname } from 'next/navigation';
import { useActiveTab } from '@/hooks/useActiveTab';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ChatRoomUIProps {
 currentUserId: string;
 currentRole: string;
 receiverId?: string; // 1v1 私聊
 receiverRole?: string; // 对方身份
 roomId?: string; // 商家群聊或同城频道
 roomName?: string; // 显示在顶部的名称
 onBack?: () => void; // 退回聊天列表
}

export default function ChatRoomUI({ currentUserId, currentRole, receiverId, receiverRole, roomId, roomName = '加密频道', onBack }: ChatRoomUIProps) {
 const t = useTranslations('ChatRoomUI');
 const { user } = useAuth();
 const { settings } = useVisualSettings();
 const pathname = usePathname();
 const activeTab = useActiveTab();
 
 const isCalendar = activeTab === "calendar" || pathname?.startsWith("/calendar");
 const isLight = isCalendar 
 ? settings.calendarBgIndex !== 0 
 : settings.frontendBgIndex !== 0;

 const myAvatar = currentRole === 'boss' ? (user as any)?.boss_avatar_url || (user as any)?.avatar : 
 currentRole === 'merchant' ? (user as any)?.merchant_avatar_url || (user as any)?.avatar : 
 (user as any)?.avatar;
 const myName = currentRole === 'boss' ? (user as any)?.boss_name || (user as any)?.name || 'BOSS' : 
 currentRole === 'merchant' ? (user as any)?.merchant_name || (user as any)?.name || '智控' : 
 (user as any)?.name || '生活';

 // 修复：如果是在聊天框中（当前用户与别人私聊），这里传入的 receiver_id 就是别人的 gxId
 const { messages, isLoading, isSending, sendMessage, deleteMessageForMe, deleteMessageForEveryone } = useChatEngine(currentUserId, currentRole, roomId, receiverId, receiverRole);
 const [inputText, setTextInput] = useState('');
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const scrollContainerRef = useRef<HTMLDivElement>(null);

 const isGroupChat = !!roomId;
 
 // 陌生人防骚扰网关状态 (Anti-Spam Gateway)
 const [isAntiSpamLocked, setIsAntiSpamLocked] = useState(false);
 const [isFriend, setIsFriend] = useState(false);
 const [allowStrangerMsgs, setAllowStrangerMsgs] = useState(false);

 useEffect(() => {
 if (!roomId && receiverId && currentUserId) {
 // 拦截非 UUID 的查询，防止报错
 const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if (!UUID_REGEX.test(receiverId) || !UUID_REGEX.test(currentUserId)) {
 setIsFriend(false);
 setAllowStrangerMsgs(true); // 游客或外部账号直接放行，不锁死
 return;
 }

 // 查询是否是好友，以及对方是否允许陌生人随意发消息
 const checkRelationAndPrivacy = async () => {
 // 检查好友关系 (由于是双向强制插入，查单向即可，加入身份隔离)
 const { data: friendData } = await supabase
 .from('friendships')
 .select('user_id')
 .match({ 
 user_id: currentUserId, 
 user_role: currentRole,
 friend_id: receiverId,
 friend_role: receiverRole || 'user'
 })
 .maybeSingle();
 
 setIsFriend(!!friendData);

 // 检查对方的隐私设置
 const { data: profileData } = await supabase
 .from('profiles')
 .select('allow_stranger_messages')
 .eq('id', receiverId)
 .maybeSingle();
 
 if (profileData) {
 setAllowStrangerMsgs(!!profileData.allow_stranger_messages);
 }
 };
 checkRelationAndPrivacy();
 }
 }, [currentUserId, currentRole, receiverId, receiverRole, roomId]);

 useEffect(() => {
 // 仅在 1v1 私聊时启用防骚扰网关
 if (!roomId && receiverId && messages.length > 0) {
 // 如果是好友，或者对方允许陌生人随意发消息，则永不锁定
 if (isFriend || allowStrangerMsgs) {
 setIsAntiSpamLocked(false);
 return;
 }

 const myMessagesCount = messages.filter(m => m.sender_id === currentUserId && (m.sender_role || 'user') === currentRole).length;
 const theirMessagesCount = messages.filter(m => m.sender_id === receiverId && (m.sender_role || 'user') === (receiverRole || 'user')).length;

 // 物理级防骚扰：如果我已发送 >= 1 条消息，且对方 0 回复，强制锁定输入框
 // 注意：这里需要检查对方是否给我发过消息（如果对方先发，我回复，不应该被锁定）
 if (myMessagesCount >= 1 && theirMessagesCount === 0) {
 setIsAntiSpamLocked(true);
 } else {
 setIsAntiSpamLocked(false);
 }
 } else {
 setIsAntiSpamLocked(false);
 }
 }, [messages, currentUserId, receiverId, roomId, isFriend, allowStrangerMsgs]);

 // 内源绑定状态 (游客转正)
 const [showBindModal, setShowBindModal] = useState(false);
 const [showMoreMenu, setShowMoreMenu] = useState(false);
 const [msgContextMenu, setMsgContextMenu] = useState<{ x: number, y: number, msgId: string, isMe: boolean } | null>(null);

 const handleMsgContextMenu = (e: React.MouseEvent, msgId: string, isMe: boolean) => {
 e.preventDefault();
 setMsgContextMenu({ x: e.clientX, y: e.clientY, msgId, isMe });
 };

 const handleClearHistory = () => {
 const targetId = roomId || receiverId;
 if (!targetId) return;
 
 // 设置本地清空锚点
 const key = `gx_cleared_${currentUserId}_${targetId}`;
 localStorage.setItem(key, Date.now().toString());
 
 // 发出全局清空事件 (通知 useChatEngine 和 useRecentChats 刷新)
 window.dispatchEvent(new CustomEvent('gx_chat_cleared', { detail: { targetId } }));
 setShowMoreMenu(false);
 };

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
 .select('name, avatar_url, merchant_name, merchant_avatar_url, boss_name, boss_avatar_url, merchant_gx_id, gx_id')
 .eq('id', receiverId)
 .maybeSingle();
 if (data) {
 if (receiverRole === 'merchant') {
 setTrueRoomName(data.merchant_name || `智控 ${data.merchant_gx_id?.substring(data.merchant_gx_id.length - 4) || ''}`);
 setTrueAvatar(data.merchant_avatar_url || data.avatar_url || null);
 } else if (receiverRole === 'boss') {
 setTrueRoomName(data.boss_name || data.name || 'BOSS');
 setTrueAvatar(data.boss_avatar_url || data.avatar_url || null);
 } else {
 setTrueRoomName(data.name || `信号源 ${data.gx_id?.substring(data.gx_id.length - 4) || ''}`);
 setTrueAvatar(data.avatar_url || null);
 }
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
 let displayPhone = `+${rawPhone}`;
 
 if (rawPhone.startsWith('86') && rawPhone.length === 13) {
 displayPhone = `+86 ${rawPhone.substring(2,5)} ${rawPhone.substring(5,9)} ${rawPhone.substring(9)}`;
 } else if (rawPhone.startsWith('39') && rawPhone.length >= 11) {
 displayPhone = `+39 ${rawPhone.substring(2,5)} ${rawPhone.substring(5,8)} ${rawPhone.substring(8)}`;
 } else if (rawPhone.length === 11 && rawPhone.startsWith('1')) {
 displayPhone = `+86 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,7)} ${rawPhone.substring(7)}`;
 } else if (rawPhone.length === 10 || rawPhone.length === 9) {
 displayPhone = `+39 ${rawPhone.substring(0,3)} ${rawPhone.substring(3,6)} ${rawPhone.substring(6)}`;
 }
 
 setTrueRoomName(displayPhone);
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
 <div 
 ref={containerRef} 
 className="w-full h-full bg-transparent flex flex-col pt-safe-top relative overflow-hidden"
 onContextMenu={(e) => {
 // 屏蔽整个聊天室的系统默认右键菜单，防止出现浏览器原生的"另存为/打印"等选项
 // 让应用具有真正的原生 App 体验
 e.preventDefault();
 }}
 >
 
 {/* 1. 顶部：导航与雷达仪 */}
 <div className="px-4 py-3 shrink-0 flex items-center justify-between z-20">
 <button 
 onClick={onBack}
 className={`p-2 -ml-2 flex items-center gap-1 group ${isLight ? 'text-black hover:text-black' : 'text-white hover:text-white'}`}
 >
 <X className="w-6 h-6 hidden md:block group-hover:rotate-90 " />
 <ArrowLeft className="w-6 h-6 md:hidden" />
 </button>
 
 <div className="flex flex-col items-center flex-1">
 <div className="flex items-center gap-2">
 {trueAvatar ? (
 <img src={trueAvatar} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
 ) : (
 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${isLight ? 'bg-black/5 text-black' : 'bg-white/5 text-white'}`}>
 {trueRoomName ? trueRoomName.charAt(0).toUpperCase() : '?'}
 </div>
 )}
 <span className={` tracking-widest uppercase flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
 {trueRoomName}
 {isWhatsApp && <span className="w-2 h-2 rounded-full bg-[#25D366] " />}
 </span>
 </div>
 {/* 内源转化：如果您是隐形账号 (游客/手机号)，提示您绑定 */}
 {(currentUserId.startsWith('phone_') || currentUserId.startsWith('guest_')) && (
 <button 
 onClick={() => setShowBindModal(true)}
 className={`text-[11px] mt-1 tracking-widest px-2 py-0.5 rounded-full border ${isLight ? 'border-black/20 text-black' : 'border-white/20 text-white'}`}
 >
 [ 永久保存档案 ]
 </button>
 )}
 </div>

 <div className="relative">
 <button 
 onClick={() => setShowMoreMenu(!showMoreMenu)}
 className={`p-2 -mr-2 ${isLight ? 'text-black hover:text-black' : 'text-white hover:text-white'}`}
 >
 <MoreHorizontal className="w-6 h-6" />
 </button>
 
 {showMoreMenu && (
 <>
 {/* 点击外部关闭 */}
 <div 
 className="fixed inset-0 z-[100]" 
 onClick={() => setShowMoreMenu(false)}
 />
 <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 z-[110] overflow-hidden py-1 bg-black/90 backdrop-blur-md">
 {!isFriend && !roomId && receiverId && (
 <button 
 onClick={async () => {
 try {
 await supabase.from('friend_requests').insert({
 sender_id: currentUserId,
 receiver_id: receiverId,
 message: '请求添加你为好友'
 });
 alert('好友申请已发送');
 } catch (e) {
 console.error(e);
 alert('发送失败');
 }
 setShowMoreMenu(false);
 }}
 className={`w-full px-4 py-3 flex items-center gap-3 group ${isLight ? 'text-black' : 'text-white'}`}
 >
 <UserPlus className="w-4 h-4 " />
 <span className="text-sm font-medium tracking-wide">添加好友</span>
 </button>
 )}
 <button 
 onClick={handleClearHistory}
 className={cn("w-full px-4 py-3 flex items-center gap-3 group", isLight ? "text-black" : "text-white")}
 >
 <Trash2 className="w-4 h-4 " />
 <span className="text-sm font-medium tracking-wide">清空聊天记录</span>
 </button>
 </div>
 </>
 )}
 </div>
 </div>

 {/* 内源绑定 Modal (借力打力，0 验证码注册) */}
 {showBindModal && (
 <div className={`absolute inset-0 z-[200] flex items-center justify-center p-4 ${isLight ? 'bg-white/80' : 'bg-black/80'}`}>
 <div className={`relative w-full max-w-sm rounded-3xl overflow-hidden p-6 border ${isLight ? 'bg-white border-black/10 shadow-xl' : 'bg-black border-white/10'}`}>
 <button 
 onClick={() => setShowBindModal(false)}
 className={`absolute top-4 right-4 ${isLight ? 'text-black hover:text-black' : 'text-white hover:text-white'}`}
 >
 <ArrowLeft className="w-5 h-5 rotate-180" />
 </button>
 <div className="text-center mb-6">
 <h3 className={`text-lg tracking-widest uppercase mb-2 ${isLight ? 'text-black' : 'text-white'}`}>安全授权通道</h3>
 <p className={`text-xs ${isLight ? 'text-black' : 'text-white'}`}>
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
 <div className={`absolute inset-0 ${isLight ? 'bg-white/80' : 'bg-black/60'}`} />

 {/* 雷达指示区 */}
 <div className="relative w-full h-[300px] flex items-end justify-center px-8">
 
 {/* 左侧：取消结界 (红色) */}
 <div className={`absolute left-0 bottom-0 w-1/2 h-full flex items-end justify-center pb-12 
 ${recordStatus === 'canceling' ? 'scale-110' : 'scale-100 '}
 `}>
 <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full 
 ${recordStatus === 'canceling' ? 'bg-red-500 ' : isLight ? 'bg-black/5 ' : 'bg-white/10 '}
 `}>
 <CornerUpLeft className={cn("w-8 h-8 mb-1", recordStatus === 'canceling' ? 'text-white' : (isLight ? "text-black" : "text-white"))} />
 <span className={cn("text-[11px] tracking-widest", recordStatus === 'canceling' ? 'text-white' : (isLight ? "text-black" : "text-white"))}>
 取消
 </span>
 </div>
 </div>

 {/* 右侧：转文字结界 (紫色) */}
 <div className={`absolute right-0 bottom-0 w-1/2 h-full flex items-end justify-center pb-12 
 ${recordStatus === 'converting' ? 'scale-110' : 'scale-100 '}
 `}>
 <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full 
 ${recordStatus === 'converting' ? ' ' : isLight ? 'bg-black/5 ' : 'bg-white/10 '}
 `}>
 <Languages className={`w-8 h-8 mb-1 ${recordStatus === 'converting' ? (isLight ? 'text-black' : 'text-white') : (isLight ? 'text-black' : 'text-white')}`} />
 <span className={`text-[11px] tracking-widest ${recordStatus === 'converting' ? (isLight ? 'text-black' : 'text-white') : (isLight ? 'text-black' : 'text-white')}`}>
 转文字
 </span>
 </div>
 </div>

 {/* 中心：雷达主波形 (仅在正常录音时显示) */}
 <div className={`absolute bottom-0 w-full flex flex-col items-center justify-end pb-8 
 ${recordStatus === 'recording' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
 `}>
 {/* 这里可以放一个更炫酷的大波形，目前先用文字和简易波形替代 */}
 <div className="flex items-center gap-1 mb-4">
 <div className={`w-1.5 h-6 rounded-full ${isLight ? 'bg-black/50' : 'bg-white/50'}`} />
 <div className={`w-1.5 h-10 rounded-full ${isLight ? 'bg-black/60' : 'bg-white/60'}`} />
 <div className={`w-1.5 h-14 rounded-full ${isLight ? 'bg-black/80' : 'bg-white/80'}`} />
 <div className={`w-1.5 h-8 rounded-full ${isLight ? 'bg-black/60' : 'bg-white/60'}`} />
 <div className={`w-1.5 h-4 rounded-full delay-[450ms] ${isLight ? 'bg-black/50' : 'bg-white/50'}`} />
 </div>
 <span className={` tracking-widest text-lg ${isLight ? 'text-black' : 'text-white'}`}>
 上滑 取消/转文字
 </span>
 </div>

 </div>
 </div>
 )}

 {/* 2. 战场核心：全息字幕气泡区 */}
 <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 py-6 space-y-1 z-10 no-scrollbar">

 {isLoading && messages.length === 0 ? (
 <div className="flex justify-center items-center h-full">
 <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-black' : 'text-white'}`} />
 </div>
 ) : (
 messages.map((msg, index) => {
 const isMe = msg.sender_id === currentUserId;
 const prevMsg = index > 0 ? messages[index - 1] : null;
 
 // ---------------- 时间线聚类法则 (Time Clustering) ----------------
 let showTimeAnchor = false;
 let timeAnchorText = '';
 
 const currentMsgTime = new Date(msg.created_at);
 if (!prevMsg) {
 showTimeAnchor = true;
 } else {
 const prevMsgTime = new Date(prevMsg.created_at);
 // 超过 5 分钟 (300000ms) 没发消息，显示时间锚点
 if (currentMsgTime.getTime() - prevMsgTime.getTime() > 300000) {
 showTimeAnchor = true;
 }
 }

 if (showTimeAnchor) {
 const now = new Date();
 const isToday = currentMsgTime.getDate() === now.getDate() && currentMsgTime.getMonth() === now.getMonth() && currentMsgTime.getFullYear() === now.getFullYear();
 
 const yesterday = new Date(now);
 yesterday.setDate(now.getDate() - 1);
 const isYesterday = currentMsgTime.getDate() === yesterday.getDate() && currentMsgTime.getMonth() === yesterday.getMonth() && currentMsgTime.getFullYear() === yesterday.getFullYear();
 
 const isThisWeek = now.getTime() - currentMsgTime.getTime() < 7 * 24 * 60 * 60 * 1000;
 
 const timeStr = currentMsgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 
 if (isToday) {
 timeAnchorText = timeStr;
 } else if (isYesterday) {
 timeAnchorText = `昨天 ${timeStr}`;
 } else if (isThisWeek) {
 const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
 timeAnchorText = `${weekDays[currentMsgTime.getDay()]} ${timeStr}`;
 } else {
 timeAnchorText = `${currentMsgTime.getFullYear()}年${currentMsgTime.getMonth() + 1}月${currentMsgTime.getDate()}日 ${timeStr}`;
 }
 }

 return (
 <div key={msg.id} className="flex flex-col w-full">
 {/* 时间锚点 (Time Anchor) */}
 {showTimeAnchor && (
 <div className="w-full flex justify-center my-2">
 <span className={`text-[11px] tracking-wider font-medium ${isLight ? 'text-black' : 'text-white'}`}>
 {timeAnchorText}
 </span>
 </div>
 )}
 
 <div className={`flex w-full mt-0.5 gap-1.5 items-center ${isMe ? 'justify-end' : 'justify-start'}`}>
 
 {/* 对方头像 */}
 {!isMe && (
 <div className="flex-shrink-0">
 {trueAvatar ? (
 <img src={trueAvatar} alt="avatar" className="w-[42px] h-[42px] rounded-full object-cover" />
 ) : (
 <div className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-[11px] ${isLight ? 'bg-black/5 text-black' : 'bg-white/5 text-white'}`}>
 {trueRoomName ? trueRoomName.charAt(0).toUpperCase() : '?'}
 </div>
 )}
 </div>
 )}

 <div 
 onContextMenu={(e) => handleMsgContextMenu(e, msg.id, isMe)}
 className={`
 relative max-w-[85%] px-1.5 py-0 flex items-center
 bg-transparent
 `}>
 
 {/* 特殊指令拦截：一键引流魔法卡片渲染 */}
 {msg.content && msg.content.includes("欢迎连接 GX 星云。您的专属体验舱已就绪") && msg.content.includes("https://app.gx.com/invite/") ? (
 <div className="flex flex-col gap-3 w-full sm:w-[320px]">
 <span className={`text-[15px] ${isLight ? 'text-black' : 'text-white'}`}>
 欢迎连接 GX 星云。您的专属体验舱已就绪，点击激活全息服务：
 </span>
 <a 
 href={msg.content.match(/https:\/\/app\.gx\.com\/invite\/\w+/)?.[0] || "https://app.gx.com"} 
 target="_blank" 
 rel="noopener noreferrer"
 className={`block relative overflow-hidden rounded-xl bg-gradient-to-br ${isLight ? 'to-black/5' : 'to-black'} border ${isLight ? 'border-black/10' : ''} p-4 group no-underline`}
 >
 <div className={`absolute inset-0 bg-[url('/noise.png')] ${isLight ? 'opacity-5' : ''} mix-blend-overlay pointer-events-none`} />
 <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none ${isLight ? 'bg-black/5' : ''}`} />
 
 <div className="relative z-10 flex items-start gap-3">
 <div className={`w-10 h-10 rounded-lg ${isLight ? 'bg-black/5 border-black/10' : 'bg-black border'} flex items-center justify-center shrink-0`}>
 <Sparkles className={`w-5 h-5 ${isLight ? 'text-black' : ''}`} />
 </div>
 <div className={`flex-1 min-w-0 ${isLight ? 'text-black' : 'text-white'}`}>
 <h4 className=" text-[15px] mb-1 tracking-wide truncate">GX 专属全息通行证</h4>
 <p className={`text-[11px] tracking-widest uppercase ${isLight ? 'text-black' : ''}`}>Click to activate Nexus</p>
 </div>
 </div>
 
 <div className={`relative z-10 mt-4 flex items-center justify-between border-t ${isLight ? 'border-black/10' : ''} pt-3`}>
 <span className={`text-[11px] tracking-widest ${isLight ? 'text-black' : ''}`}>SECURE LINK</span>
 <div className={`flex items-center gap-1 text-xs uppercase tracking-widest ${isLight ? 'text-black' : ''}`}>
 立即进入 <ArrowRight className="w-3 h-3 group-hover:translate-x-1 " />
 </div>
 </div>
 </a>
 </div>
 ) : (
 /* 文本渲染 (高亮字幕悬浮) */
 msg.content && (
 <p 
 className={`
 text-[14px] tracking-widest break-words translate-y-[1px]
 ${isLight ? 'text-black' : 'text-white'}
 `}
 >
 {msg.content}
 </p>
 )
 )}

 {/* 语音消息 */}
 {msg.audio_url && (
 <VoiceMessagePlayer audioUrl={msg.audio_url} duration={msg.audio_duration || 0} isLight={isLight} />
 )}

 {/* 图片渲染 (Blurhash 预加载与极速降解标签) */}
 {msg.image_url && (
 <div className={`relative mt-1 rounded-xl overflow-hidden border group ${isLight ? 'border-black/10' : 'border-white/10'}`}>
 {/* Blurhash 占位层 */}
 {msg.hash && (
 <Blurhash
 hash={msg.hash}
 width={300}
 height={200}
 resolutionX={32}
 resolutionY={32}
 punch={1}
 className="absolute inset-0 z-0 w-full h-full object-cover"
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
 <div className="absolute bottom-2 right-2 z-20 group-hover:opacity-100 ">
 <div className={`border px-2 py-1 rounded-md flex items-center space-x-1.5 backdrop-blur-md ${isLight ? 'bg-white/80 border-black/20' : 'bg-black/60 border-white/20'}`}>
 <div className="w-1.5 h-1.5 bg-red-500 rounded-full " />
 <span className={`text-[11px] tracking-widest ${isLight ? 'text-black' : 'text-white'}`}>30d BURN</span>
 </div>
 </div>
 </div>
 )}

 {/* 时间戳 (极小字号，贴底边) - 已被时间线聚类取代，此处隐藏 */}
 {/* <div className={`
 absolute -bottom-5 text-[11px] tracking-wider whitespace-nowrap
 ${isMe ? 'right-1 ' : 'left-1 text-white'}
 `}>
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </div> */}
 </div>

 {/* 我方头像 */}
 {isMe && (
 <div className="flex-shrink-0">
 {myAvatar ? (
 <img src={myAvatar} alt="avatar" className="w-[42px] h-[42px] rounded-full object-cover" />
 ) : (
 <div className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-[11px] ${isLight ? 'bg-black/5 text-black' : 'bg-white/5 text-white'}`}>
 {myName ? myName.charAt(0).toUpperCase() : '?'}
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
 }))}
 <div ref={messagesEndRef} />
 </div>

 {/* 3. 底部：量子指令台 (Quantum Input Bar) */}
 <div className="px-4 pb-safe-bottom pt-2 shrink-0 z-20">

 {/* 图片预览与撤销 */}
 {selectedFile && (
 <div className={`flex items-center justify-between mb-3 p-2 rounded-xl border w-fit max-w-[80%] ${isLight ? 'border-black/10' : 'border-white/10'}`}>
 <span className={`text-xs truncate tracking-wide mr-4 ${isLight ? 'text-black' : 'text-white'}`}>📎 {selectedFile.name}</span>
 <button onClick={() => setSelectedFile(null)} className={cn("text-xs", isLight ? "text-black" : "text-white")}>✕</button>
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

 {/* 防骚扰网关：强制锁定状态 */}
 {isAntiSpamLocked ? (
 <div className={`flex-1 relative group h-11 flex items-center justify-center border rounded-full cursor-not-allowed select-none ${isLight ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
 <span className={`text-xs tracking-widest uppercase ${isLight ? 'text-black' : 'text-white'}`}>
 对方回复后解锁发送权限
 </span>
 </div>
 ) : (
 <>
 {/* 悬浮输入舱 - 输入框容器 */}
 <div className="flex-1 relative group h-11">
 <div className={`absolute inset-0 rounded-full border pointer-events-none ${isLight ? 'border-black/15' : 'border-white/15'}`} />
 
 {/* 三态量子离合器：根据模式切换渲染 */}
 {inputMode === 'text' ? (
 <textarea
 value={inputText}
 onChange={(e) => setTextInput(e.target.value)}
 placeholder={t('txt_0bbdcf')}
 rows={1}
 className={`w-full h-full bg-transparent outline-none focus:outline-none rounded-full border-none focus:ring-0 text-[16px] font-[350] leading-[44px] py-0 pl-4 pr-12 resize-none no-scrollbar relative z-0
 ${isLight ? 'text-black placeholder:text-black' : 'text-white placeholder:text-white'}
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
 ? 'bg-red-500/20 '
 : recordStatus === 'converting'
 ? ' '
 : ' '
 : isLight ? 'bg-black/5 ' : 'bg-white/5 '
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
 <div className="w-2 h-2 rounded-full" />
 ) : (
 <>
 <div className="w-1 h-3 rounded-full " />
 <div className="w-1 h-5 rounded-full " />
 <div className="w-1 h-2 rounded-full " />
 </>
 )}
 </div>
 
 {/* 实时语音转文字的显化区 */}
 <div className="flex flex-col items-center justify-center max-w-[60%] overflow-hidden">
 {isSpeechSupported && (transcript || interimTranscript) ? (
 <span className={`text-sm truncate w-full text-center tracking-wide ${isLight ? 'text-black' : 'text-white'}`}>
 {transcript} <span className={`${isLight ? 'text-black' : 'text-white'}`}>{interimTranscript}</span>
 </span>
 ) : (
 <span className={` tracking-widest ${
 recordStatus === 'canceling' ? (isLight ? 'text-black' : 'text-white') :
 recordStatus === 'converting' ? '' :
 ''
 }`}>
 00:{recordDuration.toString().padStart(2, '0')}
 </span>
 )}
 </div>
 
 <span className={`text-xs ml-2 tracking-widest uppercase ${
 recordStatus === 'canceling' ? (isLight ? 'text-black ' : 'text-white ') :
 recordStatus === 'converting' ? ' ' :
 ' '
 }`}>
 {recordStatus === 'canceling' ? '松开取消' :
 recordStatus === 'converting' ? '松开转文字' :
 '松开结束'}
 </span>
 </div>
 ) : (
 <span className={` tracking-widest uppercase ${isLight ? 'text-black' : 'text-white'}`}>按住 说话</span>
 )}
 </div>
 )}

 {/* 内嵌的相机/图片上传入口 (仅在文本模式显示) */}
 {inputMode === 'text' && (
 <button 
 onClick={() => fileInputRef.current?.click()}
 className={`absolute right-1 top-1/2 -translate-y-1/2 p-2 z-10 ${isLight ? 'text-black hover:text-black' : 'text-white hover:text-white'}`}
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
 className={`w-11 h-8 rounded-xl flex items-center justify-center border group relative shrink-0 ${isLight ? 'border-black/10 text-black' : 'border-white/10 text-white'}`}
 title="发送全息通行证"
 >
 <Sparkles className="w-4 h-4 " />
 <span className={`absolute -top-6 right-0 text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded border ${isLight ? 'bg-white/80 border-black/10 text-black' : 'bg-black/80 border-white/10 text-white'}`}>一键引流</span>
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
 w-11 h-11 rounded-full flex items-center justify-center 
 ${isSending 
 ? 'bg-transparent border' 
 : (inputText.trim() || selectedFile)
 ? isLight ? 'bg-black text-white scale-100' : 'bg-white text-black scale-100' 
 : isLight ? 'bg-black/5 text-black scale-100' : 'bg-white/10 text-white scale-100' // 空状态下作为模式切换键
 }
 `}
 >
 {isSending ? (
 <Loader2 className="w-5 h-5 animate-spin" />
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
 </>
 )}

 </div>
 </div>

 {/* 消息右键菜单 */}
 {msgContextMenu && (
 <>
 <div 
 className="fixed inset-0 z-[100]" 
 onClick={() => setMsgContextMenu(null)}
 onContextMenu={(e) => { e.preventDefault(); setMsgContextMenu(null); }}
 />
 <div 
 className={`fixed w-48 rounded-xl border z-[110] overflow-hidden py-1 shadow-2xl backdrop-blur-xl ${isLight ? 'bg-white/90 border-black/10' : 'bg-black/90 border-white/10'}`}
 style={{ 
 left: `${msgContextMenu.x}px`, 
 top: `${msgContextMenu.y}px`,
 transform: `translate(min(0px, calc(100vw - 100% - ${msgContextMenu.x}px - 16px)), min(0px, calc(100vh - 100% - ${msgContextMenu.y}px - 16px)))`
 }}
 >
 <button 
 onClick={(e) => {
 e.stopPropagation();
 deleteMessageForMe(msgContextMenu.msgId);
 setMsgContextMenu(null);
 }}
 className={`w-full px-4 py-3 flex items-center gap-3 group ${isLight ? 'text-black' : 'text-white'}`}
 >
 <Trash2 className="w-4 h-4 " />
 <span className="text-sm font-medium tracking-wide">单向删除</span>
 </button>

 {msgContextMenu.isMe && (
 <button 
 onClick={(e) => {
 e.stopPropagation();
 deleteMessageForEveryone(msgContextMenu.msgId);
 setMsgContextMenu(null);
 }}
 className={cn("w-full px-4 py-3 flex items-center gap-3 group", isLight ? "text-black" : "text-white")}
 >
 <Trash2 className="w-4 h-4 " />
 <span className="text-sm font-medium tracking-wide">双向撤回</span>
 </button>
 )}
 </div>
 </>
 )}
 </div>
 );
}
