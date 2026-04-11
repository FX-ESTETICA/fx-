import { useRef, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Send, Mic, Phone, CalendarCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabase";
import { BookingService } from "@/features/booking/api/booking";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bookingAction?: {
    time: string;
    service: string;
    tech: string;
  };
}

interface AiBookingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  shop: any;
}

export function AiBookingAssistant({ isOpen, onClose, shop }: AiBookingAssistantProps) {
  const config = shop?.config || {};
  const capsules = config.capsules || [];
  
  // 确立真实的 shop_id
  const actualShopId = shop?.id || shop?.shopId || "afff6352-2ec2-4f89-ae89-647579039024";

  // --- 防弹架构：完全原生接管 ---
  const [realCategories, setRealCategories] = useState<any[]>([]);
  const [realServices, setRealServices] = useState<any[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  // 核心：在弹窗打开时，穿透表层，直接向数据库底层 `shop_configs` 索要真实的日历配置数据
  useEffect(() => {
    if (isOpen && actualShopId) {
      const fetchDeepConfigs = async () => {
        setIsConfigLoading(true);
        try {
          const { data } = await BookingService.getConfigs(actualShopId);
          if (data) {
            setRealCategories(data.categories || []);
            setRealServices(data.services || []);
          }
        } catch (e) {
          console.error("AI管家底层穿透拉取失败:", e);
        } finally {
          setIsConfigLoading(false);
        }
      };
      fetchDeepConfigs();
    }
  }, [isOpen, actualShopId]);

  // 动态获取系统语言
  const systemLang = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN';
  const isItalian = systemLang.startsWith('it');
  const isEnglish = systemLang.startsWith('en');

  const welcomeMessage = useMemo(() => {
    if (isItalian) return `Ho scansionato gli orari in tempo reale per **${shop?.name || "il negozio"}**.\n\nChe servizio vorresti prenotare oggi? Puoi dirmi direttamente l'orario che preferisci (es. "Vorrei un trattamento alle 10:30").`;
    if (isEnglish) return `I've scanned the real-time schedule for **${shop?.name || "the shop"}**.\n\nWhat service would you like to book today? You can just tell me your preferred time (e.g., "I'd like a treatment at 10:30").`;
    return `为您扫描了 **${shop?.name || "门店"}** 的实时档期。\n\n请问您今天想做什么项目？您可以直接告诉我期望的时间（例如：“我想做光疗，十点半过来”）。`;
  }, [shop?.name, isItalian, isEnglish]);

  // 稳定的初始状态
  const initialMessages: Message[] = useMemo(() => [
    {
      id: "welcome",
      role: "assistant",
      content: welcomeMessage
    }
  ], [welcomeMessage]);

  const body = useMemo(() => {
    // 智能升维：将真实拉取的服务列表打包为完整的字典对象，包含全称(fullName)和价格(prices[0] 或 price)
    const aiServices = realServices.length > 0 
      ? realServices.map((s: any) => ({
          code: s.name,
          fullName: s.fullName || s.name,
          price: s.prices && s.prices.length > 0 ? s.prices[0] : (s.price || 0),
          category: realCategories.find((c: any) => c.id === s.categoryId)?.name || "Uncategorized"
        }))
      : capsules.map((c: any) => ({ code: c.name || c.label, fullName: c.name || c.label, price: 0, category: "Uncategorized" }));

    return {
      shopConfig: {
        name: shop?.name,
        industryType: shop?.industryType || shop?.industry_type || "美业/美容美甲", // 核心：注入商户行业属性
        services: aiServices,
        clientLanguage: systemLang
      }
    };
  }, [shop, realServices, realCategories, capsules, systemLang]);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [localInput, setLocalInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 最终物理锁定：写入 Supabase
  const handleLockBooking = async (action: any, msgId: string) => {
    if (!action || isLocking) return;
    setIsLocking(true);

    try {
      // 1. 解析时间格式 (假设 AI 输出 "2026-04-10 14:00")
      const timeStr = action.time || "";
      const [datePart, timePart] = timeStr.split(" ");
      const date = datePart || new Date().toISOString().split("T")[0];
      const startTime = timePart ? (timePart.length === 5 ? `${timePart}:00` : timePart) : "00:00:00";

      // 2. 组装极简 Payload (与 SQL 测试验证一致)
      const payload = {
        shop_id: actualShopId, // 核心：使用真实的动态门店ID，打破隔离壁垒
        date: date,
        start_time: startTime,
        duration_min: 60, // 默认 60 分钟，后续可根据服务字典动态计算
        status: "PENDING", // 新增：打上待确认的烙印
        data: {
          customServiceText: action.service, // 完美适配前端日历的未定项目读取
          originalUnassigned: true, // 核心：让日历的自动寻位算法捕捉它
          customerName: "AI 智能预约",
          tech: action.tech,
          source: "ai_assistant"
        }
      };

      // 3. 底层直连入库
      const { error } = await supabase.from('bookings').insert(payload);

      if (error) {
        throw new Error(error.message);
      }

      // 4. 成功后：追加一条管家确认消息，并将原消息的按钮禁用或移除
      setMessages(prev => {
        // 移除原消息中的 bookingAction 避免重复点击
        const updated = prev.map(msg => 
          msg.id === msgId ? { ...msg, bookingAction: undefined } : msg
        );
        // 追加成功确认
        return [...updated, {
          id: Date.now().toString(),
          role: "assistant",
          content: `**锁定成功！**\n\n您的 [${action.service}] 已经成功写入门店系统。\n期待在 ${action.time} 为阁下服务。如需修改，请随时吩咐。`
        }];
      });

      // 5. 极其重要的物理级通讯：发射事件通知日历组件刷新！
      // 这能确保即使在同一个页面，日历也能瞬间捕获到这颗刚诞生的数据流星。
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('gx-sandbox-bookings-updated'));
      }

    } catch (err: any) {
      console.error("写入日历失败:", err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `（系统警告：写入终端失败 - ${err.message}）`
      }]);
    } finally {
      setIsLocking(false);
    }
  };

  // 核心发送引擎 (原生 fetch 流式读取)
  const sendMessage = async (text: string) => {
    if (!text || isLoading) return;

    // 1. 乐观 UI 更新：立即上屏客户消息
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLocalInput("");
    setIsLoading(true);

    // 2. 预占位：为管家创建一个空消息气泡
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      // 3. 坚如磐石的原生 fetch 请求
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          shopConfig: body.shopConfig
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`网络或接口异常 (${response.status})`);
      }

      // 4. 流式解码器：逐字读取打字机效果
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = "";
      let bookingActionData = undefined;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          
          // 实时更新气泡内容，并隐藏系统指令标签
          let displayContent = assistantContent;
          
          // 意图拦截器：检测 [ACTION:BOOKING|time:xxx|service:xxx|tech:xxx]
          const actionRegex = /\[ACTION:BOOKING\|time:(.*?)\|service:(.*?)\|tech:(.*?)\]/;
          const match = assistantContent.match(actionRegex);
          if (match) {
             bookingActionData = { time: match[1], service: match[2], tech: match[3] };
             // 从显示内容中剔除这行难看的系统代码
             displayContent = assistantContent.replace(actionRegex, "").trim();
          }

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: displayContent, bookingAction: bookingActionData }
                : msg
            )
          );
        }
      }
    } catch (error: any) {
      console.error("装甲车网络拦截:", error);
      // 优雅降级：绝不崩溃，只做提示
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMsgId && !msg.content
            ? { ...msg, content: "（管家星际链路受阻，暂时无法连通终端。请检查您的网络代理或稍后再试...）" }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(localInput.trim());
  };

  const handleQuickReply = async (text: string) => {
    await sendMessage(text);
  };

  // 处理文本格式化 (简单的 markdown 粗体和换行)
  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i} className="block mb-1">
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </span>
    ));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-assistant-modal"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-12 md:bottom-12 md:w-[400px] h-[60vh] max-h-[600px] min-h-[400px] z-[1001] rounded-3xl overflow-hidden flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto"
        >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gx-cyan/20 border border-gx-cyan/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <Sparkles className="w-4 h-4 text-gx-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    GX⁺ 管家
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono tracking-wider">AI ASSISTANT ONLINE</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full flex-col",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-white/10 text-white border border-white/5 rounded-tr-sm"
                      : "bg-transparent text-white/90 border-l-2 border-gx-cyan pl-4 pr-0 py-1"
                  )}>
                    {formatMessage(msg.content)}
                  </div>
                  
                  {/* 如果该消息带有预订意图标记，渲染确认卡片 */}
                  {msg.bookingAction && (
                    <div className="mt-3 bg-black/40 border border-gx-cyan/30 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden max-w-[85%] self-start ml-4">
                      {/* 赛博朋克扫描线动画 */}
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gx-cyan to-transparent animate-[shimmer_2s_infinite]" />
                      
                      <div className="text-xs text-gx-cyan font-bold flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        <span>等待终端授权锁定</span>
                      </div>
                      
                      <div className="text-xs text-white/80 space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-white/50 shrink-0">项目</span>
                          <span className="font-mono text-white text-right">{msg.bookingAction.service}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-white/50 shrink-0">时间</span>
                          <span className="font-mono text-white text-right">{msg.bookingAction.time}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-white/50 shrink-0">技师</span>
                          <span className="font-mono text-white text-right">{msg.bookingAction.tech}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleLockBooking(msg.bookingAction, msg.id)}
                        disabled={isLocking}
                        className="mt-2 w-full py-2 bg-gx-cyan text-black text-xs font-bold rounded hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLocking ? (
                          <>
                            <span className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            <span>物理锁定中...</span>
                          </>
                        ) : (
                          "一键物理锁定 (写入日历)"
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex w-full justify-start"
                >
                  <div className="bg-transparent text-white/50 border-l-2 border-gx-cyan/50 pl-4 pr-0 py-1 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Quick Replies (优先渲染真实的 categories，没有则降级显示 capsules) */}
              {messages.length === 1 && messages[0].role === "assistant" && (realCategories.length > 0 || capsules.length > 0) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap gap-2 mt-4 pl-4"
                >
                  {realCategories.length > 0 ? (
                    realCategories.map((cat: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(cat.name)}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all backdrop-blur-md disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {cat.name}
                      </button>
                    ))
                  ) : (
                    capsules.map((cap: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(cap.label || cap.name)}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all backdrop-blur-md disabled:opacity-50"
                        disabled={isLoading}
                      >
                        {cap.label || cap.name}
                      </button>
                    ))
                  )}
                </motion.div>
              )}
              
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
              <form onSubmit={handleFormSubmit} className="relative flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden focus-within:border-gx-cyan/50 focus-within:bg-white/10 transition-all">
                <button type="button" className="p-3 text-white/40 hover:text-white transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={localInput}
                  onChange={(e) => setLocalInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="告诉管家您的需求..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white placeholder:text-white/30 px-2 disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!localInput.trim() || isLoading}
                  className="p-3 text-gx-cyan hover:text-white disabled:opacity-30 disabled:hover:text-gx-cyan transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
