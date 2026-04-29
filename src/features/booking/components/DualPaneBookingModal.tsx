"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, User, X, ArrowLeft } from 'lucide-react';
import { cn } from "@/utils/cn";
import { BookingService, BookingUpsertInput } from "@/features/booking/api/booking";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";
import { BookingScheduler } from "@/features/booking/utils/scheduler";

interface DualPaneBookingModalProps {
 isOpen: boolean;
 onClose: () => void;
 initialDate?: Date; // 接收当前日历的日期
 initialTime?: string; // 接收战术准星传递的精确时间
 initialResourceId?: string; // 接收战术准星传递的员工ID
 editingBooking?: BookingEdit; // 传入要编辑的预约数据
 staffs: StaffMember[];
 categories: CategoryItem[];
 services: ServiceItem[];
 isReadOnly?: boolean;
}

type ServiceItem = {
 id: string;
 name?: string;
 duration?: number;
 prices?: number[];
 assignedEmployeeId?: string | null;
 [key: string]: unknown;
};

type CategoryItem = {
 id: string;
 name?: string;
 [key: string]: unknown;
};

type StaffMember = {
 id: string;
 name?: string;
 role?: string;
 status?: string;
 color?: string;
 [key: string]: unknown;
};

type MatchedProfile = {
 gx_id?: string;
 name?: string;
 avatar_url?: string;
 role?: string;
 phone?: string;
};

export type BookingEdit = {
 id?: string;
 date?: string;
 startTime?: string;
 duration?: number;
 customerId?: string;
 customerPhone?: string;
 customerName?: string;
 services?: ServiceItem[];
 isSuperBooking?: boolean;
 relatedBookings?: BookingEdit[];
 resourceId?: string | null;
 masterOrderId?: string;
 paymentMethod?: string;
 [key: string]: unknown;
};

import { useVisualSettings } from "@/hooks/useVisualSettings";

export function DualPaneBookingModal({
 isOpen,
 onClose,
 initialDate,
 initialTime,
 editingBooking,
 staffs,
 categories,
 services,
 isReadOnly
}: DualPaneBookingModalProps) {
 const t = useTranslations('DualPaneBookingModal');
 const { activeShopId, refreshBookings, trackAction } = useShop();
 const { settings } = useVisualSettings();
 const isLight = settings.headerTitleColorTheme === 'coreblack';

 // --- 结账模式状态 (Neon Core Checkout) ---
 const [checkoutOverride, setCheckoutOverride] = useState<boolean | null>(null);
 // const [checkoutProgress, setCheckoutProgress] = useState(0); // 用于滑动结账的进度

 // --- 状态机：右侧面板模式 ---
 type RightPaneMode = 'service' | 'member' | 'date' | 'time' | 'duration';
 const [activePaneMode, setActivePaneMode] = useState<RightPaneMode>(() => editingBooking ? 'member' : 'service');

 // --- 悬浮审批舱状态 (AI PENDING) ---
 const [isAIPending, setIsAIPending] = useState(() => editingBooking?.status === 'PENDING');

 // --- 服务项目状态 (支持多选与印章涂色) ---
 const [selectedServices, setSelectedServices] = useState<ServiceItem[]>(() => {
 if (!editingBooking?.services || editingBooking.services.length === 0) return [];
 
 // 【状态隔离法则：回归单体本源】
 // 绝对废弃在初始化时拼凑连单的逻辑！
 // 弹窗初始化的 selectedServices 必须只包含当前被点击的这一个 block 的服务。
 // 这保证了左侧的“预约编辑界面”只对当前点击的子订单负责，防止编辑状态被兄弟订单污染。
 return editingBooking.services.map((s) => ({
 ...s,
 assignedEmployeeId: editingBooking.originalUnassigned ? null : editingBooking.resourceId
 }));
 });
 // 服务内容的自定义附加文本
 const [customServiceText, setCustomServiceText] = useState<string>(() => (editingBooking?.customServiceText as string) || "");
 // 当前全局的“印章/笔刷”员工ID，null 代表未指定(默认印章)
 const [currentBrushEmployeeId, setCurrentBrushEmployeeId] = useState<string | null>(() => {
 if (editingBooking?.resourceId) return editingBooking.resourceId;
 // 遵循绝对液态派发法则：新建预约时，员工画笔强制默认【无指定 (TBD)】，忽略点击的列坐标
 return null;
 }); 
 // 当前处于“待重定向”状态的已选服务ID
 const [retargetingServiceId, setRetargetingServiceId] = useState<string | null>(null);
 const [activeCategory, setActiveCategory] = useState<string | null>(() => categories[0]?.id || null);
 
 // --- 会员信息状态 ---
 // 原 memberInfo 废弃，改为多轨电话数组
 const [phoneTracks, setPhoneTracks] = useState<string[]>(() => {
 if (editingBooking?.customerName && editingBooking.customerName !== "散客 Walk-in") {
 return editingBooking.customerName.split(',');
 }
 return [''];
 });
 // 当前正在编辑的电话索引，null 代表静默态
 const [editingPhoneIndex, setEditingPhoneIndex] = useState<number | null>(null);

 // 核心：客户ID (例如 CO 0000001, GV 0001)
 // 核心：新建会员时的分类 (GV/AD/AN/UM)，null代表散客
 const [newCustomerType, setNewCustomerType] = useState<string | null>(null);
 
 // 新增：控制左侧会员信息栏是否处于“主动输入状态”
 const [isMemberInputFocused, setIsMemberInputFocused] = useState(false);

 // --- C端匹配状态 (Cross-Domain Match) ---
 const [matchedProfile, setMatchedProfile] = useState<MatchedProfile | null>(null);

 // --- 历史老客匹配状态 (Historical B-End Match) ---
 const [matchedHistoryCustomer, setMatchedHistoryCustomer] = useState<{name?: string, phone: string, gx_id: string} | null>(null);

 // --- 会员真实姓名 (Customer Real Name) ---
 const [customerRealName, setCustomerRealName] = useState<string>(() => {
 if (editingBooking) {
 const name = editingBooking.customerName || "";
 const phone = editingBooking.customerPhone || "";
 const actualPhone = phone || name;
 return name === actualPhone ? "" : name;
 }
 return "";
 });

 // 当匹配到 C端或历史客资时，自动填充名字
 useEffect(() => {
 if (matchedProfile?.name) {
 setCustomerRealName(matchedProfile.name);
 } else if (matchedHistoryCustomer?.name) {
 setCustomerRealName(matchedHistoryCustomer.name);
 }
 }, [matchedProfile, matchedHistoryCustomer]);

 // --- 会员真实历史消费流 (Real History Data Stream) ---
 const [realHistoryStream, setRealHistoryStream] = useState<any[]>([]);
 const [isFetchingHistory, setIsFetchingHistory] = useState(false);

 // --- 模糊搜索下拉状态 ---
 const [fuzzyResults, setFuzzyResults] = useState<any[]>([]);
 const [isFuzzySearching, setIsFuzzySearching] = useState(false);

 // --- 动态日历状态 ---
 const [calendarViewDate, setCalendarViewDate] = useState(() => {
 const targetDate = editingBooking?.date 
 ? new Date(editingBooking.date.replace(/-/g, '/'))
 : (initialDate || new Date());
 return new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
 });

 // --- 日期与时间状态 ---
 const [selectedDate, setSelectedDate] = useState(() => {
 if (editingBooking?.date) return editingBooking.date.replace(/-/g, '/');
 const targetDate = initialDate || new Date();
 const year = targetDate.getFullYear();
 const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
 const day = targetDate.getDate().toString().padStart(2, '0');
 return `${year}/${month}/${day}`;
 });
 const [selectedTime, setSelectedTime] = useState(() => {
 if (editingBooking?.startTime) return editingBooking.startTime;
 if (initialTime) return initialTime;
 const now = new Date();
 const nextHour = (now.getHours() + 1) % 24;
 return `${nextHour.toString().padStart(2, '0')}:00`;
 });

 // --- 预分配心跳锁引擎 (Pre-allocation Heartbeat Lock) ---
 // 将锁引擎移至所有依赖状态（如 newCustomerType）声明之后，避免 ReferenceError
 const [allocatedId, setAllocatedId] = useState<string | null>(null);
 const allocatedIdRef = useRef<string | null>(null);

 // 同步 ref 以便在闭包中获取最新状态
 useEffect(() => {
 allocatedIdRef.current = allocatedId;
 }, [allocatedId]);

 useEffect(() => {
 if (!isOpen || editingBooking) return;
 
 let isMounted = true;
 const prefix = newCustomerType || 'CO';

 const fetchId = async () => {
 // 1. 读取数据库，执行断层扫描并返回可用ID
 const nextId = await BookingService.getAvailableCustomerId(activeShopId || 'default', prefix);
 
 if (!isMounted) return;

 // 2. 写入本地幽灵锁 (防止同一个浏览器多开窗口撞车)
 const match = nextId.match(/^([a-zA-Z]+)\s*(.+)$/i);
 if (match) {
 const num = parseInt(match[2], 10);
 if (!isNaN(num)) {
 const rawLocks = localStorage.getItem(`gx_locked_ids_${prefix}`);
 const locks = rawLocks ? JSON.parse(rawLocks) : {};
 locks[num] = Date.now() + 5 * 60 * 1000;
 localStorage.setItem(`gx_locked_ids_${prefix}`, JSON.stringify(locks));
 }
 }
 setAllocatedId(nextId);
 };

 fetchId();

 return () => {
 isMounted = false;
 // 绝对安全释放幽灵锁：使用 ref 读取最新状态，打破闭包陷阱
 const idToRelease = allocatedIdRef.current;
 if (idToRelease) {
 const match = idToRelease.match(/^([a-zA-Z]+)\s*(.+)$/i);
 if (match) {
 const relPrefix = match[1].toUpperCase();
 const relNum = parseInt(match[2], 10);
 if (!isNaN(relNum)) {
 const rawLocks = localStorage.getItem(`gx_locked_ids_${relPrefix}`);
 const locks = rawLocks ? JSON.parse(rawLocks) : {};
 if (locks[relNum]) {
 delete locks[relNum];
 localStorage.setItem(`gx_locked_ids_${relPrefix}`, JSON.stringify(locks));
 }
 }
 }
 }
 setAllocatedId(null);
 allocatedIdRef.current = null;
 };
 }, [isOpen, editingBooking, newCustomerType, activeShopId]);

 // --- 服务时长微调状态 ---
 const [durationOffset, setDurationOffset] = useState<number>(() => {
 if (!editingBooking?.services || editingBooking.services.length === 0) return 0;
 const baseD = editingBooking.services.reduce((acc, s) => acc + (s.duration || 0), 0);
 const totalDuration = editingBooking.duration ?? baseD;
 return totalDuration - baseD;
 });

 // --- 双轨 HUD 时间选择器状态 ---
 const [timeSelectionMode, setTimeSelectionMode] = useState<'hour' | 'minute'>('hour');
 // const [isSwitching, setIsSwitching] = useState(false);
 const [centerDragStart, setCenterDragStart] = useState<number | null>(null);
 const phoneMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

 const updateSelectedTime = (time: string) => {
 setSelectedTime(time);
 };

 const scheduleProfileMatch = (phone: string) => {
 if (phoneMatchTimerRef.current) {
 clearTimeout(phoneMatchTimerRef.current);
 }
 
 // 如果输入的字符少于3个，清空搜索状态
 if (!phone || phone.length < 3) {
 setMatchedProfile(null);
 setMatchedHistoryCustomer(null);
 setFuzzyResults([]);
 setIsFuzzySearching(false);
 return;
 }
 
 // 开启搜索动画
 setIsFuzzySearching(true);
 
 phoneMatchTimerRef.current = setTimeout(async () => {
 try {
 // 1. 获取模糊搜索历史预约记录 (仅作为模糊搜索的下拉选项来源，同时用于检测老客)
 const { data: historyData } = await BookingService.searchProfilesByPhoneFuzzy(activeShopId || 'default', phone);
 setFuzzyResults(historyData || []);
 
 // 2. 如果输入足够长，且历史记录中唯一匹配上，或者有C端账号，执行精确匹配
 if (phone.length >= 6) {
 // A. 尝试 C 端精确匹配联动 (保持软件设计的原样)
 const { data: exactCData } = await BookingService.getProfileByPhone(phone);
 setMatchedProfile(exactCData);

 // B. 尝试 B 端老客匹配联动
 const exactHistoryMatch = historyData?.find((r: any) => r.phone === phone);
 if (exactHistoryMatch) {
 setMatchedHistoryCustomer({
 name: exactHistoryMatch.name,
 phone: exactHistoryMatch.phone,
 gx_id: exactHistoryMatch.gx_id
 });
 } else {
 setMatchedHistoryCustomer(null);
 }
 } else {
 setMatchedProfile(null);
 setMatchedHistoryCustomer(null);
 }
 } finally {
 setIsFuzzySearching(false);
 }
 }, 500);
 };

 const updatePhoneTracks = (nextTracks: string[], skipAutoMatch = false) => {
 setPhoneTracks(nextTracks);
 if (!skipAutoMatch) {
 scheduleProfileMatch(nextTracks[0]?.trim() || "");
 }
 };

 const customerId = useMemo(() => {
 if (editingBooking?.customerId) return editingBooking.customerId;
 if (matchedHistoryCustomer?.gx_id) return matchedHistoryCustomer.gx_id; // 【核心修复】优先使用历史记录的编号
 return allocatedId || `${newCustomerType || 'CO'} --`;
 }, [editingBooking?.customerId, allocatedId, newCustomerType, matchedHistoryCustomer?.gx_id]);

 const autoCheckoutMode = useMemo(() => {
 if (!isOpen || !editingBooking || !editingBooking.date) return false;
 try {
 const [year, month, day] = editingBooking.date.split(/[-/]/).map(Number);
 const [hours, minutes] = (editingBooking.startTime || "00:00").split(':').map(Number);
 const now = new Date();
 const start = new Date(year, month - 1, day, hours, minutes);
 const durationMs = (editingBooking.duration || 60) * 60 * 1000;
 const elapsedMs = now.getTime() - start.getTime();
 return elapsedMs >= durationMs / 2;
 } catch {
 return false;
 }
 }, [isOpen, editingBooking]);

 const isCheckoutMode = checkoutOverride ?? autoCheckoutMode;
 
 // 新增：结账逻辑状态
 const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
 const [checkoutSlideProgress, setCheckoutSlideProgress] = useState(() => { 
 return (editingBooking?.status as string | undefined)?.toUpperCase() === 'COMPLETED' ? 100 : 0;
 });

 // 【结账舱独立价格状态】记录每个服务最终选定的结账价格，格式: { serviceId: price }
 const [checkoutPrices, setCheckoutPrices] = useState<Record<string, number>>({});
 const [editingCustomPriceId, setEditingCustomPriceId] = useState<string | null>(null);
 const [customPriceInput, setCustomPriceInput] = useState("");

 // 检查当前订单是否已经是已结账状态
 const isAlreadyCompleted = useMemo(() => {
 const statusStr = (editingBooking?.status as string | undefined)?.toUpperCase();
 return statusStr === 'COMPLETED' || statusStr === 'CHECKED_OUT';
 }, [editingBooking]);

 const isCheckoutReady = selectedPaymentMethod !== null || isAlreadyCompleted;

 // --- 获取真实历史消费数据 (History Data Stream Probe) ---
 useEffect(() => {
 let isMounted = true;
 
 const fetchHistory = async () => {
 // 只有在右侧处于 'member' 模式，且有有效标识（C端/B端老客/输入的电话/非散客编号）时才触发
 const hasValidIdentity = matchedProfile || matchedHistoryCustomer || (phoneTracks[0] && phoneTracks[0].length >= 3) || (customerId && !customerId.startsWith('CO'));
 
 if (!hasValidIdentity || activePaneMode !== 'member') {
 if (isMounted) setRealHistoryStream([]);
 return;
 }

 setIsFetchingHistory(true);
 try {
 let query = supabase
 .from('bookings')
 .select('*')
 .eq('shop_id', activeShopId || 'default')
 .neq('status', 'VOID')
 .order('created_at', { ascending: false });

 // 优先使用确定的 customerId 进行查询，其次使用电话号码
 if (customerId && !customerId.startsWith('CO')) {
 query = query.eq('data->>customerId', customerId);
 } else if (phoneTracks[0]) {
 query = query.ilike('data->>customerName', `%${phoneTracks[0]}%`);
 } else {
 if (isMounted) setRealHistoryStream([]);
 return;
 }

 const { data, error } = await query.limit(20); // 取最近 20 条

 if (error) throw error;
 
 if (isMounted && data) {
 // 我们不再简单粗暴地排除当前订单
 // 而是按照“时空法则”过滤：只有当订单状态是“已结账(COMPLETED)”、“已退房(CHECKED_OUT)” 或 “爽约(NO_SHOW)” 或者是过去日期的订单，才算作“历史”
 // 为了绝对严谨，我们直接在这里进行内存过滤，或者直接在 supabase query 里过滤。
 // 这里我们在前端进行逻辑判断，这样能保留当天的未结账草稿状态用于展示你说的“当天跑马灯”。
 
 // 但我们需要排除那些“尚未真正创建(正在编辑中且未保存)”或者是完全未来且未结账的订单。
 // 这里我们干脆展示所有（因为查出来的都是数据库里的），然后在渲染时根据日期和状态来区分！
 // 为了避免显示太多未来的未完成订单，我们过滤掉“日期大于今天，且未结账”的订单
 // const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 
 // 砸碎物理结界：不要过滤未来的未结账订单，直接吸入所有查询到的数据
 const filteredData = data;
 
 // 时空排序法则：按照日期从未来到过去排列（降序），日期相同则按时间降序
 filteredData.sort((a, b) => {
 if (a.date !== b.date) {
 return a.date > b.date ? -1 : 1;
 }
 const timeA = a.start_time || '00:00';
 const timeB = b.start_time || '00:00';
 return timeA > timeB ? -1 : 1;
 });

 setRealHistoryStream(filteredData);
 }
 } catch (err) {
 console.error("Failed to fetch real history stream:", err);
 } finally {
 if (isMounted) setIsFetchingHistory(false);
 }
 };

 fetchHistory();

 return () => { isMounted = false; };
 }, [customerId, phoneTracks, matchedProfile, matchedHistoryCustomer, activePaneMode, activeShopId, editingBooking?.id]);

 // 计算真实总消费金额 (Total Spent)
 const realTotalSpent = useMemo(() => {
 return realHistoryStream.reduce((sum, booking) => {
 // 只有已结账的订单才计入总金额
 const isCompleted = ['COMPLETED', 'CHECKED_OUT'].includes(booking.status?.toUpperCase());
 if (!isCompleted) return sum;

 // 这里简化处理，取 data.services 里面的 prices 数组
 const services = booking.data?.services || [];
 const bookingTotal = services.reduce((sSum: number, s: any) => {
 const price = (s.prices && s.prices.length > 0) ? s.prices[0] : 0;
 return sSum + price;
 }, 0);
 
 return sum + bookingTotal;
 }, 0);
 }, [realHistoryStream]);

 // 获取某个服务在结账舱里的当前生效价格
 const getCheckoutPrice = useCallback((serviceId: string, defaultPrices: number[] | number | undefined) => {
 if (checkoutPrices[serviceId] !== undefined) {
 return checkoutPrices[serviceId];
 }
 return Array.isArray(defaultPrices) && defaultPrices.length > 0 ? defaultPrices[0] : (typeof defaultPrices === 'number' ? defaultPrices : 0);
 }, [checkoutPrices]);

 const resetFormState = useCallback(() => {
 setSelectedServices([]);
 setCustomServiceText("");
 setCurrentBrushEmployeeId(null);
 setRetargetingServiceId(null);
 setActivePaneMode('service');
 setPhoneTracks(['']);
 setDurationOffset(0);
 setEditingPhoneIndex(null);
 setMatchedProfile(null);
 setNewCustomerType(null);
 setCheckoutOverride(null);
 setSelectedPaymentMethod(null);
 setCheckoutSlideProgress(0);
 setCheckoutPrices({});
 setEditingCustomPriceId(null);
 }, []);

 const handleClose = useCallback(() => {
 resetFormState();
 onClose();
 }, [onClose, resetFormState]);

 useEffect(() => {
 return () => {
 if (phoneMatchTimerRef.current) {
 clearTimeout(phoneMatchTimerRef.current);
 }
 };
 }, []);

 // 处理服务多选与印章涂色
 const handleToggleService = (service: ServiceItem) => {
 // 如果当前有正在重定向的服务，点击矩阵中的任何其他服务或本身，都取消重定向状态
 if (retargetingServiceId) {
 setRetargetingServiceId(null);
 }

 setSelectedServices(prev => {
 const existingService = prev.find(s => s.id === service.id);
 
 if (existingService) {
 // 如果已经选中了该服务
 if (existingService.assignedEmployeeId === currentBrushEmployeeId) {
 // 如果当前印章和已分配的员工一致，则认为是“取消选中”
 return prev.filter(s => s.id !== service.id);
 } else {
 // 如果当前印章和已分配的员工不一致，则认为是“重新涂色/覆盖绑定”
 return prev.map(s => 
 s.id === service.id ? { ...s, assignedEmployeeId: currentBrushEmployeeId } : s
 );
 }
 } else {
 // 未选中，添加并直接盖上当前印章
 return [...prev, { ...service, assignedEmployeeId: currentBrushEmployeeId }];
 }
 });
 };

 // 切换当前的印章/笔刷，或者为待重定向的服务分配新员工
 const handleSetBrush = (employeeId: string | null) => {
 if (retargetingServiceId) {
 // 模式 A：正在重定向某个已选服务
 setSelectedServices(prev => prev.map(s => 
 s.id === retargetingServiceId ? { ...s, assignedEmployeeId: employeeId } : s
 ));
 setRetargetingServiceId(null); // 完成重定向后解除状态
 setCurrentBrushEmployeeId(employeeId); // 顺便把画笔也切过去，符合直觉
 } else {
 // 模式 B：正常的切换印章
 setCurrentBrushEmployeeId(employeeId);
 }
 };

 // 触发已选服务的重定向状态
 const handleRetargetService = (serviceId: string) => {
 setRetargetingServiceId(prev => prev === serviceId ? null : serviceId);
 };

 // 手势拦截系统 (原生触控向量引擎 - Native Touch Vector Engine)
 const touchStartRef = useRef<{ x: number, y: number } | null>(null);

 const handleTouchStart = (e: React.TouchEvent) => {
 if (e.touches.length === 1) {
 touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
 }
 };

 const handleTouchEnd = (e: React.TouchEvent) => {
 if (!touchStartRef.current || e.changedTouches.length === 0) return;
 
 const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
 const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
 
 // 物理向量判定法则：只有横向滑动距离大于 50px，且横向位移绝对值显著大于纵向位移，才判定为“横向手势”
 // 这完美解决了在上下滚动的列表里误触横向切换的 0 弊端难题
 if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
 if (activePaneMode === 'member') {
 // 会员模式下：右滑结账，左滑返回
 if (!isCheckoutMode && deltaX > 50) {
 setCheckoutOverride(true);
 } else if (isCheckoutMode && deltaX < -50) {
 setCheckoutOverride(false);
 }
 } else if (activePaneMode === 'service' && categories.length > 0) {
 // 服务模式下：左右滑切换分类
 const currentIndex = categories.findIndex(c => c.id === activeCategory);
 if (deltaX < -50) {
 // 向左划：看下一个分类
 const nextIndex = (currentIndex + 1) % categories.length;
 setActiveCategory(categories[nextIndex].id);
 } else if (deltaX > 50) {
 // 向右划：退回上一个分类
 const prevIndex = (currentIndex - 1 + categories.length) % categories.length;
 setActiveCategory(categories[prevIndex].id);
 }
 }
 }
 touchStartRef.current = null; // 重置
 };

 // 处理滑轨结账
 // const handleCheckoutComplete = () => {
 // // 这里可以加入更复杂的结账存盘逻辑，目前仅演示关闭
 // alert('结账成功！');
 // onClose();
 // };

 // --- 核心业务逻辑：标记爽约 (NO SHOW) ---
 const handleMarkAsNoShow = async () => {
 if (!editingBooking) return;
 
 try {
 // 植入“历史消费探针”
 const { data: historyBookings, error } = await supabase
 .from('bookings')
 .select('id')
 .eq('shop_id', activeShopId || 'default')
 .eq('data->>customerId', editingBooking.customerId)
 .neq('status', 'VOID');
 
 if (error) throw error;

 // 判断是否是老客（大于 1 单，或者不等于当前订单的唯一一单）
 const isOldCustomer = historyBookings && historyBookings.length > 1;

 let targetCustomerId = editingBooking.customerId;
 
 if (!isOldCustomer) {
 // 0 消费新客，执行降维打击：换上 NO 编号，释放原会员号退回可用池
 targetCustomerId = await BookingService.getAvailableCustomerId(activeShopId || 'default', 'NO');
 }

 const updatedBookings = [{
 ...editingBooking,
 date: editingBooking.date || selectedDate.replace(/\//g, '-'),
 startTime: editingBooking.startTime || "00:00",
 duration: editingBooking.duration || 60,
 customerId: targetCustomerId, 
 status: 'no_show',
 resourceId: 'NO', // 可以将其移动到“爽约”列，如果存在的话
 }];
 
 await BookingService.upsertBookings(updatedBookings);
 refreshBookings();
 trackAction();
 handleClose();
 } catch (error) {
 console.error("Failed to mark as No Show:", error);
 }
 };

 // --- 核心业务逻辑：确认并拆分预约 (Data Transformer) ---
 const handleConfirmBooking = async () => {
 if (isReadOnly) {
 console.warn("System is in READ_ONLY mode. Cannot save bookings.");
 return;
 }
 if (selectedServices.length === 0) {
 alert("请至少选择一个服务项目");
 return;
 }

 // 1. 按员工归组 (Group by Employee)
 const groupedByEmployee = selectedServices.reduce<Record<string, ServiceItem[]>>((acc, service) => {
 // 如果没有指定员工，我们这里可以默认分配给一个特定员工，或者作为“待分配”状态
 // 为了沙盒演示，如果没有 assignedEmployeeId，我们将其分配给 default_unassigned
 const empId = service.assignedEmployeeId || 'unassigned';
 if (!acc[empId]) {
 acc[empId] = [];
 }
 acc[empId].push(service);
 return acc;
 }, {});

 // 2. 生成拆分后的预约卡片数据
 const newBookings: BookingEdit[] = [];
 const customerPhoneStr = phoneTracks.filter(t => t.trim() !== "").join(',');
 const finalCustomerName = customerRealName.trim() || customerPhoneStr || "散客 Walk-in";
 const baseDate = selectedDate.replace(/\//g, '-'); // 确保格式为 YYYY-MM-DD 以便解析
 
 // 如果编辑的是连单，复用其 masterOrderId；否则生成新的
 const masterOrderId = editingBooking?.masterOrderId || `ORD-${Date.now()}`;

 // --- 消耗/更新客户编号 (Consume Customer ID) ---
 // 真正的计数器和 ID 生成交由 Supabase 后端序列处理，本地无需再手动管理
 // 断层扫描分配器已保证 `customerId` 完美填坑
 // 【重要修复】：优先使用已匹配的历史会员编号（matchedHistoryCustomer.gx_id），否则使用新生成的 allocatedId 或 CO 散客编号
 const finalCustomerId = editingBooking?.customerId || matchedHistoryCustomer?.gx_id || allocatedId || `${newCustomerType || 'CO'} --`;


 // 废弃串行连单推演，改为“绝对并发创建 (Parallel Time Pipeline)”：
 // 如果选了多个服务给不同员工，它们都将从相同的基准时间 (selectedTime) 开始。
 let baseStartTimeMin = 0;
 if (selectedTime) {
 const [h, m] = selectedTime.split(':').map(Number);
 // 15 点是 15 * 60 = 900
 baseStartTimeMin = h * 60 + m;
 }
 
 // 如果是从 AI 的待确认状态转正过来的，我们将状态更新为已确认 (CONFIRMED)
 // 其他情况保留原逻辑 (对于新建则是 CONFIRMED)
 const finalStatus = (editingBooking?.status === 'PENDING') ? 'CONFIRMED' : (editingBooking?.status || 'CONFIRMED');

 // 遍历每个员工的服务组
 Object.entries(groupedByEmployee).forEach(([empId, servicesInGroup], groupIndex) => {
 const groupDuration = servicesInGroup.reduce((sum, s) => sum + (s.duration || 0), 0);
 const groupServiceNames = servicesInGroup.map((s) => s.name).join(' + ');
 
 // 如果只有一个员工，时长微调 (durationOffset) 全算给他；如果有多个员工，微调比较复杂，这里简单处理，加在第一个员工头上，或者不加。
 const finalDuration = Object.keys(groupedByEmployee).length === 1 
 ? Math.max(1, groupDuration + durationOffset) 
 : groupDuration;

 // 【重塑中枢：取消串行推演，恢复并发时刻】
 // 计算当前这笔子订单的 startTime (HH:mm 格式)，所有组都使用基准时间
 const startH = Math.floor(baseStartTimeMin / 60);
 const startM = baseStartTimeMin % 60;
 const currentStartTimeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
 
 // 注意：这里不再将时间游标往后推 (不执行 currentStartTimeMin += finalDuration)

 let currentShopId = activeShopId || 'default';
 if (typeof window !== 'undefined') {
 currentShopId = new URLSearchParams(window.location.search).get('shopId') || currentShopId;
 }

 newBookings.push({
 id: editingBooking && Object.keys(groupedByEmployee).length === 1 ? editingBooking.id : `BKG-${Date.now()}-${empId}-${groupIndex}`, // 重拆分时，加入 index 防止 React Key 重复
 masterOrderId: editingBooking ? editingBooking.masterOrderId : masterOrderId,
 resourceId: empId === 'unassigned' ? undefined : empId, // 临时设为 undefined，后面由前置派发逻辑处理
 customerId: finalCustomerId, // 【核心修复】：注入使用 matchedProfile.gx_id 纠正后的智能编号
 customerName: finalCustomerName,
 customerPhone: customerPhoneStr,
 serviceName: customServiceText ? `${groupServiceNames} (${customServiceText})` : groupServiceNames,
 customServiceText: customServiceText, // 存入自定义文本以便下次编辑回显
 date: baseDate, // 【核心修复】：注入丢失的 date 字段，打破渲染隐形诅咒
 startTime: currentStartTimeStr, // 【核心修复】：恢复所有预约块的同一起始时间
 duration: finalDuration,
 status: finalStatus,
 is_staff_requested: empId !== 'unassigned', // 如果分配了员工，就是强指定的；如果是 unassigned，就是非指定的
 services: servicesInGroup, // 原始服务数据，备用
 originalUnassigned: empId === 'unassigned', // 标记它原本是未指定的
 shopId: currentShopId, // 强绑定租户
 // 【财务防篡改快照】
 staff_snapshot_name: staffs.find(s => s.id === empId)?.name || empId // 封印当时的员工名字
 });
 });

 // --- 全局动态重排逻辑 (Global Dynamic Spatial Reflow) ---
 // 读取所有数据，进行“绝对路权锚定”与“无指定预约重新寻位”
 try {
 // 这里的逻辑改成从 Supabase 异步读取
 let currentShopId = activeShopId || 'default';
 if (typeof window !== 'undefined') {
 currentShopId = new URLSearchParams(window.location.search).get('shopId') || currentShopId;
 }
 
 // 1. 如果是编辑模式，我们需要物理抹除旧ID (如果原订单被拆分产生新ID)
 // 【状态隔离法则】：由于初始化时采用了单体本源隔离，弹窗只针对当前点击的子订单。
 // 绝不可越权删除相关的兄弟订单（relatedBookings），否则会导致同组的其他预约块意外消失！
 let idsToDelete: string[] = [];
 if (editingBooking && editingBooking.id) {
 idsToDelete.push(editingBooking.id);
 }
 
 const newBookingIds = new Set(newBookings.map(b => b.id));
 idsToDelete = idsToDelete.filter(id => !newBookingIds.has(id));

 if (idsToDelete.length > 0) {
 await BookingService.deleteBookings(idsToDelete);
 }

 // 2. 将当前操作产生的新订单加入全量列表并强制存入数据库，作为“锚定”基准
 const payload: BookingUpsertInput[] = newBookings.map(b => ({
 ...b,
 date: b.date || baseDate, // 确保有默认值
 startTime: b.startTime || "00:00"
 })) as BookingUpsertInput[];
 await BookingService.upsertBookings(payload);

 // 3. 将刚刚入库的新订单注入到覆盖字典里，告诉智能大脑：这些是需要重新排盘的“浮动订单”
 const manualOverrides: Record<string, { resourceId?: string | null; originalUnassigned?: boolean; _needsTimeReflow: boolean }> = {};
 newBookings.forEach(b => {
 // 【核心修复】：
 // 1. 如果它是新建的（原来没有资源），或者是从弹窗的编辑中发生了人员指派变动
 // 我们必须强行给它打上 _needsTimeReflow: true，强迫排盘大脑去进行时间顺延和碰撞检测
 const isResourceChanged = editingBooking && editingBooking.resourceId !== b.resourceId;
 const needsReflow = !!(b.originalUnassigned || isResourceChanged);

 if (b.id) {
 manualOverrides[b.id] = {
 resourceId: b.resourceId as string | null,
 originalUnassigned: !!b.originalUnassigned,
 _needsTimeReflow: needsReflow 
 };
 }
 });

 // 4. 【世界顶端架构：呼叫 BookingScheduler 智能大脑】
 // 废弃掉 Modal 里这段简陋的老旧重排逻辑，直接调用刚刚升级过的强大智能磁吸引擎
 await BookingScheduler.reflowDayBookings(baseDate, currentShopId, staffs, manualOverrides);
 
 // 核心修复：虽然有实时引擎，但是由于我们取消了全局重新拉取，
 // 前端当前组件的 state 并没有更新。我们需要派发事件通知日历组件重新读取数据
 refreshBookings();
 trackAction();
 
 // 关闭弹窗
 handleClose();
 } catch (error) {
 console.error("Failed to save bookings to Supabase:", error);
 }
 };

 // Close on escape key
 useEffect(() => {
 const handleEsc = (e: KeyboardEvent) => {
 if (e.key === 'Escape') handleClose();
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [handleClose]);

 // 计算总时长和结束时间
 const baseDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0);
 const totalDuration = baseDuration > 0 ? Math.max(1, baseDuration + durationOffset) : 0;
 
 const getEndTime = () => {
 if (!selectedTime || totalDuration === 0) return "--:--";
 const [hours, minutes] = selectedTime.split(':').map(Number);
 const date = new Date();
 date.setHours(hours, minutes, 0, 0);
 date.setMinutes(date.getMinutes() + totalDuration);
 return date.toTimeString().substring(0, 5);
 };

 const formatDisplayId = (rawId: string): React.ReactNode => {
 if (!rawId) return "CO 1";
 
 const match = rawId.match(/^([a-zA-Z]+)\s*(.+)$/i);
 if (match) {
 const pre = match[1].toUpperCase();
 const rest = match[2];
 
 if (['CO', 'NO'].includes(pre)) {
 // 散客和爽约，保留前缀，去除前导零 (如 CO 001 -> CO 1, CO 9 -> CO 9)
 const num = parseInt(rest, 10);
 return isNaN(num) ? rawId : `${pre} ${num}`;
 } else {
 // 正式会员 (GV/AD/AN/UM 等)，直接斩掉前缀字母，保留原有的数字格式 (如 0015, 3001)
 return rest; 
 }
 }
 
 return rawId;
 };

 // --- Checkout Data Transformer ---
 // 【状态隔离法则：专为结账计算的计算属性】
 // 我们不再污染 selectedServices。
 // 如果当前是连单（isSuperBooking = true），我们仅在这里（渲染结账单和计算总价时），
 // 把 relatedBookings 里所有的 services 提取出来，形成一个“大账单”。
 const checkoutAllServices = useMemo(() => {
 if (!isCheckoutMode) return selectedServices;
 
 if (editingBooking?.isSuperBooking && editingBooking.relatedBookings && editingBooking.relatedBookings.length > 0) {
 const allServices: ServiceItem[] = [];
 
 // 1. 当前订单的服务
 selectedServices.forEach(s => {
 allServices.push({
 ...s,
 assignedEmployeeId: s.assignedEmployeeId || editingBooking.resourceId || 'unassigned'
 });
 });

 // 2. 兄弟订单的服务
 editingBooking.relatedBookings.forEach(rb => {
 if (rb.id === editingBooking.id) return;
 
 if (rb.services && Array.isArray(rb.services)) {
 rb.services.forEach(rs => {
 const serviceItem = rs as unknown as ServiceItem;
 allServices.push({
 ...serviceItem,
 assignedEmployeeId: serviceItem.assignedEmployeeId || rb.resourceId || 'unassigned'
 });
 });
 }
 });
 
 return allServices;
 }
 
 // 非连单时，原样返回
 return selectedServices.map(s => ({
 ...s,
 assignedEmployeeId: s.assignedEmployeeId || editingBooking?.resourceId || 'unassigned'
 }));
 }, [isCheckoutMode, selectedServices, editingBooking]);

 // 将全量服务按员工进行分组，用于结账舱渲染
 const groupedCheckoutServices = checkoutAllServices.reduce<Record<string, ServiceItem[]>>((acc, service) => {
 const empId = service.assignedEmployeeId || 'unassigned';
 if (!acc[empId]) {
 acc[empId] = [];
 }
 acc[empId].push(service);
 return acc;
 }, {});

 if (!isOpen) return null;

 return (
 <>
 {isOpen && (
 <div 
 className={cn(
 "fixed inset-0 z-[100] font-sans animate-in fade-in ",
 isLight ? "text-black" : "text-white"
 )}
 style={{
 // 【幽灵点击终极防弹衣】：在弹窗刚挂载的 350ms 内，使其处于绝对物理真空状态 (pointer-events-none)
 // 等待浏览器底层 300ms 的延迟 Click 事件发射完毕并打空后，再恢复 pointer-events-auto
 animation: "ghost-click-shield 350ms forwards"
 }}
 >
 <style dangerouslySetInnerHTML={{__html: `
 @keyframes ghost-click-shield {
 0% { pointer-events: none; }
 99% { pointer-events: none; }
 100% { pointer-events: auto; }
 }
 `}} />
 {/* 背景暗场遮罩 (固定在底层，不随滚动条滚动) */}
 {/* 【硬派商业系统法则】：彻底移除 onClick={handleClose} 属性，防止幽灵点击闪退及防止店长误触导致填单数据丢失 */}
 <div 
 className={cn("fixed inset-0 pointer-events-auto ", "bg-transparent")}
 />

 {/* 滚动容器：允许在移动端键盘弹起时进行瀑布流滑动 */}
 <div className="fixed inset-0 overflow-y-auto pointer-events-none flex flex-col items-center justify-start md:justify-center py-4 md:py-8 custom-scrollbar">
 {isCheckoutMode ? (
 /* ===================== Neon Core 结账舱 ===================== */
 <div 
 key="checkout-pane"
 className={cn(
 "relative z-10 w-full max-w-[800px] h-auto flex flex-col justify-between p-6 rounded-2xl touch-pan-y pointer-events-auto",
 isLight ? " bg-white/50" : " bg-black/50"
 )}
 >
 {/* 顶角关闭 / 返回按钮 */}
 {!isAlreadyCompleted && (
 <button 
 onClick={() => setCheckoutOverride(false)} 
 className={cn("absolute top-4 left-4 ", isLight ? "text-black " : "text-white ")}
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 )}
 <button 
 onClick={handleClose} 
 className={cn("absolute top-4 right-4 ", isLight ? "text-black " : "text-white ")}
 >
 <X className="w-5 h-5" />
 </button>

 {/* Top Anchor: VIP 身份图腾 */}
 <div className="mt-2 mb-4 flex flex-col items-center text-center space-y-1">
 <span className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-[#39FF14]")}>Target Entity</span>
 <h1 className={cn(
 "text-4xl md:text-5xl tracking-[0.2em] uppercase",
 customerId.startsWith('CO') 
 ? (isLight ? "text-black" : "text-white") 
 : "bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 bg-clip-text text-transparent "
 )}>
 [{formatDisplayId(customerId)}]
 </h1>
 </div>

 {/* Middle Matrix: 极简三维消费流 (取消定高和滚动，直接平铺) */}
 <div className="w-full flex flex-col gap-4 px-8 md:px-24 mb-6">
 {Object.entries(groupedCheckoutServices).map(([empId, services]) => {
 // 这里解决渲染匹配问题：如果在沙盒模式下 assignedEmployeeId 是 null 或者 'unassigned'，它可能找不到 staff
 // 但是在跨块连单传入时，booking 本身可能带有 resourceId。
 // 我们在上面 transformer 中已经用 service.assignedEmployeeId 进行分组了。
 const staff = staffs.find(st => st.id === empId);
 // 如果找不到员工（比如是旧数据或者跨块连单导致 empId 对不上），我们尝试用 empId 作为名字兜底显示，或者显示 UN
 const staffName = staff ? staff.name : (empId !== 'unassigned' && empId !== 'null' ? empId : 'UN');
 
 return (
 <div key={empId} className="flex flex-col gap-4">
 {services.map((service, idx: number) => {
 return (
 <div key={service.id || idx} className="flex items-center w-full gap-6">
 {/* 员工签名栏：仅在该员工的第一个项目显示，后续项目留白以维持网格对齐 */}
 <div className="w-24 shrink-0 text-left">
 {idx === 0 ? (
 <span className={cn("text-lg tracking-widest uppercase", isLight ? "text-black " : "text-white ")}>
 {staffName as React.ReactNode}
 </span>
 ) : (
 <span className="text-lg tracking-widest text-transparent uppercase select-none">
 {staffName as React.ReactNode}
 </span>
 )}
 </div>
 
 {/* 高对比度项目名称 */}
 <span className={cn(" text-lg tracking-wider shrink-0", isLight ? "text-black " : "text-white ")}>
 {service.name as React.ReactNode}
 </span>
 
 {/* 动态赛博引线 (Leader) */}
 <div className={cn("flex-1 h-px border-b border-dashed mx-2", isLight ? "border-black/20" : "border-white/20")} />
 
 {/* 价格与备用胶囊阵列 */}
 <div className="flex items-center gap-2 shrink-0">
 <span className={cn(" text-lg tracking-wider", isLight ? "text-black" : "text-white")}>
 ¥ {getCheckoutPrice(service.id, service.prices)}
 </span>
 
 {/* 只有在未结账时才显示修改价格的胶囊 */}
 {!isAlreadyCompleted && (
 <div className="flex items-center gap-1.5 ml-2">
 {/* 渲染所有数据库里的预设价格胶囊 */}
 {Array.isArray(service.prices) && service.prices.map((p, pIdx) => {
 const currentActive = getCheckoutPrice(service.id, service.prices) === p;
 return (
 <button
 key={pIdx}
 onClick={() => setCheckoutPrices(prev => ({ ...prev, [service.id]: p }))}
 className={cn(
 "text-[11px] px-2 py-0.5 rounded-full ",
 currentActive 
 ? "bg-[#39FF14]/20 text-[#39FF14]" 
 : (isLight ? "bg-black/5 text-black " : "bg-white/5 text-white ")
 )}
 >
 {p}
 </button>
 );
 })}

 {/* 自定义价格输入胶囊 */}
 {editingCustomPriceId === service.id ? (
 <input 
 type="number"
 autoComplete="off"
 autoFocus
 value={customPriceInput}
 onChange={e => setCustomPriceInput(e.target.value)}
 onBlur={() => {
 const val = parseInt(customPriceInput, 10);
 if (!isNaN(val)) {
 setCheckoutPrices(prev => ({ ...prev, [service.id]: val }));
 }
 setEditingCustomPriceId(null);
 }}
 onKeyDown={e => {
 if (e.key === 'Enter') {
 e.preventDefault();
 e.currentTarget.blur();
 } else if (e.key === 'Escape') {
 setEditingCustomPriceId(null);
 }
 }}
 className="w-12 text-[11px] bg-black/60 border border-[#39FF14]/50 rounded-full px-2 py-0.5 text-[#39FF14] outline-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
 />
 ) : (
 <button
 onClick={() => {
 setCustomPriceInput("");
 setEditingCustomPriceId(service.id);
 }}
 className={cn("w-6 h-5 flex items-center justify-center rounded-full border border-dashed ", isLight ? "border-black/20 text-black" : "border-white/20 text-white")}
 title="自定义价格"
 >
 <span className="text-xs leading-none -mt-0.5">+</span>
 </button>
 )}
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
 })}
 {/* 如果有自定义备注，作为附加流显示 */}
 {customServiceText && (
 <div className="flex items-center w-full gap-6 mt-2">
 <div className="w-24 shrink-0 text-left">
 <span className={cn("text-sm tracking-widest uppercase", isLight ? "text-black" : "text-white")}>
 [EXT]
 </span>
 </div>
 <span className={cn(" text-lg tracking-widest shrink-0", isLight ? "text-black" : "text-white")}>
 {customServiceText as string}
 </span>
 <div className={cn("flex-1 h-px border-b border-dashed mx-2", isLight ? "border-black/10" : "border-white/10")} />
 <span className={cn(" text-lg tracking-wider shrink-0", isLight ? "text-black" : "text-white")}>
 --
 </span>
 </div>
 )}
 </div>

 {/* Bottom Core: 总金额的绝对中心与光轨结算 */}
 <div className="mb-2 flex flex-col items-center relative w-full px-8">
 <div className="flex flex-wrap justify-center items-center gap-3 mb-4">
 {['微信', '支付宝', '现金', '银行卡', '会员卡扣款'].map(method => {
 const isSelected = selectedPaymentMethod === method;
 const isVipMethod = method === '会员卡扣款';
 const canUseVip = customerId.startsWith('CO') === false;

 return (
 <button 
 key={method} 
 onClick={() => {
 if (isAlreadyCompleted) return;
 if (isVipMethod && !canUseVip) return;
 setSelectedPaymentMethod(isSelected ? null : method);
 }}
 className={cn(
 "text-[11px] tracking-widest px-4 py-1.5 rounded whitespace-nowrap",
 isAlreadyCompleted
 ? (isLight ? "bg-transparent text-black cursor-not-allowed " : "bg-transparent text-white cursor-not-allowed ")
 : isSelected 
 ? "bg-[#39FF14]/20 text-[#39FF14]" 
 : isVipMethod && canUseVip
 ? "bg-white/5 text-yellow-400 "
 : isVipMethod && !canUseVip
 ? (isLight ? "bg-transparent text-black cursor-not-allowed" : "bg-transparent text-white cursor-not-allowed")
 : (isLight ? "bg-transparent text-black " : "bg-transparent text-white ")
 )}
 >
 [{method}]
 </button>
 );
 })}
 </div>
 
 <div className="text-[11px] text-[#39FF14] tracking-[0.3em] uppercase mb-1">Total Amount</div>
 <div className={cn(
 "text-5xl tabular-nums tracking-tighter mb-4",
 isAlreadyCompleted
 ? "text-[#39FF14] drop-" // 已结账：静谧稳定绿
 : checkoutSlideProgress === 100 
 ? (isLight ? "text-black scale-110" : "text-white scale-110") 
 : "text-[#39FF14] drop-"
 )}>
 ¥ {checkoutAllServices.reduce((sum, s) => sum + getCheckoutPrice(s.id, s.prices), 0)}.00
 </div>

 {/* 赛博光轨滑动锁 (Cyber-Slider) */}
 <div className="w-full max-w-[400px] h-12 relative rounded-full overflow-hidden border bg-black/40"
 style={{
 borderColor: isCheckoutReady || isAlreadyCompleted ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)',
 }}
 >
 {/* 背景进度填充 */}
 <div 
 className="absolute top-0 left-0 h-full bg-[#39FF14]/20 "
 style={{ width: `${checkoutSlideProgress}%` }}
 />

 {/* 引导文字 */}
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
 <span className={cn(
 "text-[11px] tracking-widest uppercase ",
 isAlreadyCompleted
 ? "text-[#39FF14] tracking-[0.4em] drop-"
 : isCheckoutReady 
 ? "text-[#39FF14]" // 移除呼吸灯特效 
 : (isLight ? "text-black" : "text-white"),
 !isAlreadyCompleted && checkoutSlideProgress > 20 && "opacity-0"
 )}>
 {isAlreadyCompleted ? "/// PAYMENT VERIFIED ///" : isCheckoutReady ? ">>> SLIDE TO PAY >>>" : "[ 请先选择支付方式 ]"}
 </span>
 </div>

 {/* 物理滑块 */}
 {!isAlreadyCompleted && (
 <div 
 className={cn(
 "absolute top-1 bottom-1 w-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center z-10 ",
 isCheckoutReady 
 ? "bg-[#39FF14]" 
 : "bg-white/10"
 )}
 style={{
 left: `calc(4px + ${checkoutSlideProgress}% * 0.85)`, // 减去滑块自身宽度比例防止溢出
 }}
 onPointerDown={(e) => {
 if (!isCheckoutReady) return;
 const sliderEl = e.currentTarget.parentElement;
 if (!sliderEl) return;
 
 const startX = e.clientX;
 const sliderWidth = sliderEl.getBoundingClientRect().width - 56; // 56 is thumb width + padding
 
 const handlePointerMove = (moveEvent: PointerEvent) => {
 const delta = moveEvent.clientX - startX;
 const newProgress = Math.max(0, Math.min(100, (delta / sliderWidth) * 100));
 setCheckoutSlideProgress(newProgress);
 
 // 触发结算
 if (newProgress >= 98) {
 setCheckoutSlideProgress(100);
 document.removeEventListener('pointermove', handlePointerMove);
 document.removeEventListener('pointerup', handlePointerUp);
 
 // 震动反馈 (如果支持)
 if (navigator.vibrate) navigator.vibrate(50);
 
 // 执行真实数据库结算更新
 const executeCheckout = async () => {
 if (!editingBooking) return;
 try {
 // 【结账状态更新陷阱防御】：
 // editingBooking 只是当前这个子订单。如果在编辑连单，我们需要把它关联的所有订单（同一个 masterOrderId）都结账！
 // 这里如果有 relatedBookings 存在，则一起更新；否则只更新自己。
 const bookingsToCheckout = editingBooking.isSuperBooking && editingBooking.relatedBookings 
 ? editingBooking.relatedBookings 
 : [editingBooking];
 
 const updatedBookings = bookingsToCheckout.map(b => {
 // 【价格覆盖法则】：将前端临时 checkoutPrices 的价格物理写入数据库
 const updatedServices = Array.isArray(b.services) 
 ? b.services.map((svc: any) => {
 if (checkoutPrices[svc.id] !== undefined) {
 return { ...svc, prices: [checkoutPrices[svc.id]] };
 }
 return svc;
 })
 : b.services;

 return {
 ...b,
 services: updatedServices,
 status: 'COMPLETED', // 核心：状态必须大写 COMPLETED 以触发底层矩阵透明化
 paymentMethod: selectedPaymentMethod || '现金', // 物理打通：写入支付印记
 // 注意：我们不能随意修改 b.date 和 b.startTime，因为那是其他子订单的时间。
 // 所以只更新 status。
 date: b.date || selectedDate.replace(/\//g, '-'), // 必须提供默认值以满足类型
 startTime: b.startTime || "00:00", // 必须提供默认值以满足类型
 resourceId: b.resourceId === null ? undefined : b.resourceId, // 修复 TS 类型：null 转换为 undefined
 };
 });
 
 await BookingService.upsertBookings(updatedBookings);
 
 // 触发全局重刷，因为有时候实时订阅会有毫秒级延迟
 refreshBookings();
 trackAction();
 // 极速模式：结账完成后瞬间关闭窗口，追求极致效率
 handleClose(); 
 } catch (error) {
 console.error("Failed to checkout:", error);
 alert("结算更新失败，请重试");
 setCheckoutSlideProgress(0); // 失败时回弹
 }
 };
 
 setTimeout(executeCheckout, 300); // 稍微延迟展示 100% 动画
 }
 };
 
 const handlePointerUp = () => {
 setCheckoutSlideProgress((prev) => {
 if (prev < 98) return 0; // 回弹
 return prev;
 });
 document.removeEventListener('pointermove', handlePointerMove);
 document.removeEventListener('pointerup', handlePointerUp);
 };
 
 document.addEventListener('pointermove', handlePointerMove);
 document.addEventListener('pointerup', handlePointerUp);
 }}
 >
 <div className="flex gap-0.5">
 <div className={cn("w-0.5 h-4 rounded-full", isCheckoutReady ? "bg-black/40" : "bg-white/20")} />
 <div className={cn("w-0.5 h-4 rounded-full", isCheckoutReady ? "bg-black/40" : "bg-white/20")} />
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 ) : (
 /* ===================== 常规双窗预约表单 ===================== */
 <div 
 key="form-pane"
 className={cn(
 "relative w-full max-w-[800px] flex flex-col items-center px-4 md:px-0 pointer-events-auto",
 isAIPending ? "z-0 pointer-events-none" : "z-10"
 )}
 >
 {/* --- 真空悬浮审批台 (仅当 AI PENDING 时存在) --- */}
 {isAIPending && (
 <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
 <div className="flex gap-8 md:gap-16">
 <button 
 onClick={async () => {
 if (!editingBooking) return;
 try {
 // 纯净网络预约：直接从数据库中物理抹除 (Hard Delete)
 await BookingService.purgeBookings([editingBooking.id as string]);
 refreshBookings();
 trackAction();
 onClose();
 } catch (e) {
 console.error("Reject failed:", e);
 }
 }}
 className={cn("tracking-widest text-3xl md:text-4xl uppercase", isLight ? "text-black" : "text-white")}
 >
 {t('txt_7173f8')}</button>
 <button 
 onClick={() => setIsAIPending(false)}
 className="text-[#39FF14] tracking-widest text-3xl md:text-4xl drop- uppercase"
 >
 {t('txt_e61f2c')}</button>
 </div>
 </div>
 )}

 {/* 核心双窗容器 (Glassmorphism + Zero Border) */}
 <main className={cn(
 "w-full h-auto min-h-[500px] md:h-[450px] flex flex-col md:flex-row relative group rounded-2xl pointer-events-auto overflow-hidden",
 isLight ? "bg-white/50" : "bg-black/50",
 isAIPending ? " grayscale-[0.2]" : ""
 )}>
 <button 
 onClick={handleClose} 
 className={cn("absolute top-4 right-4 z-50", isLight ? "text-black " : "text-white ")}
 >
 <X className="w-5 h-5" />
 </button>
 {/* ===================== 左侧/顶部：控制台面板 ===================== */}
 <section 
 className="w-full md:w-[50%] h-auto md:h-full p-5 md:p-6 pb-24 md:pb-24 flex flex-col gap-4 relative z-10 shrink-0"
 onTouchStart={handleTouchStart}
 onTouchEnd={handleTouchEnd}
 >
 
 {/* 表单录入区 */}
 <div className="flex flex-col gap-4 mt-1">
 <div className="space-y-1.5">
 <label className={cn("text-[11px] tracking-widest uppercase", isLight ? "text-black" : "text-white")}>{t('txt_ef3505')}</label>
 <div 
 className={cn(
 "border rounded-lg p-2 min-h-[48px] flex items-center cursor-text overflow-hidden",
 isLight ? "bg-white/40" : "bg-black/40",
 activePaneMode === 'service' ? `${isLight ? "border-[#8B7355]" : "border-[#FDF5E6]"}` : `${isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"} `
 )}
 onClick={() => {
 // 终极修复：由于内部的胶囊 (button) 已经有了 e.stopPropagation()，
 // 能走到这一层的点击，必然是点在了空白处、透明输入框、或者提示文字上。
 // 因此不需要任何 if 判断，无条件切回服务面板。
 setActivePaneMode('service');
 document.getElementById('custom-service-input')?.focus();
 }}
 >
 <div id="custom-service-input-container" className="flex-1 flex flex-wrap items-center gap-2 w-full h-full">
 {selectedServices.length === 0 && customServiceText === "" && (
 <span className={cn("text-[11px] absolute pointer-events-none ml-1", isLight ? "text-black" : "text-white")}>{t('txt_1809c0')}</span>
 )}
 {selectedServices.map((s, index) => {
 const staff = staffs.find(st => st.id === s.assignedEmployeeId);
 const textColor = staff ? staff.color : (isLight ? '#000000' : '#ffffff'); // 未指定时字体根据主题
 const isRetargeting = retargetingServiceId === s.id;
 
 return (
 <button
 key={`svc_${s.id}_${index}`}
 onClick={(e) => {
 e.stopPropagation(); // 阻止冒泡
 handleRetargetService(s.id);
 setActivePaneMode('service'); // 确保唤起右侧服务面板
 }}
 className={cn(
 "flex items-center gap-1.5 px-3 py-1.5 rounded-md border shrink-0 group relative overflow-hidden bg-transparent",
 isRetargeting 
 ? (isLight ? "bg-black text-white border-black " : "bg-white text-black border-white ")
 : (isLight ? "" : "")
 )}
 title={t('txt_d0dea7')}
 style={!isRetargeting ? {
 border: `1px solid ${textColor as string}`
 } : {}}
 >
 {/* 左侧颜色指示条 */}
 <div 
 className="absolute left-0 top-0 bottom-0 w-1 "
 style={{ backgroundColor: textColor as string }}
 />
 <span 
 className="text-[12px] tracking-wide ml-1"
 style={!isRetargeting ? { 
 color: textColor as string
 } : {}}
 >
 {s.name as React.ReactNode}
 </span>
 
 {/* 删除按钮 */}
 <div 
 className={cn("ml-1 p-0.5 rounded-full ", isLight ? "text-black" : "text-white ")}
 onClick={(e) => {
 e.stopPropagation();
 handleToggleService(s); // 再次点击等于取消选中
 }}
 >
 <X className="w-3 h-3" />
 </div>
 </button>
 );
 })}
 {/* 透明的自由文本输入框，紧跟在胶囊流后面 */}
 <input
 id="custom-service-input"
 type="text"
 autoComplete="off"
 value={customServiceText as string}
 onChange={(e) => setCustomServiceText(e.target.value)}
 className={cn("bg-transparent border-none outline-none text-[12px] flex-1 min-w-[60px] p-0 m-0 leading-tight placeholder:text-transparent shrink-0 ml-1", isLight ? "text-black" : "text-white")}
 placeholder={selectedServices.length > 0 ? "" : " "}
 />
 </div>
 </div>
 </div>
 <div className="space-y-1.5">
 <label className={cn("text-[11px] tracking-widest uppercase", isLight ? "text-black" : "text-white")}>{t('txt_32fd76')}</label>
 <div 
 className={cn(
 "border rounded-lg p-2 min-h-[48px] flex items-center gap-2 cursor-text relative group",
 isLight ? "bg-white/40" : "bg-black/40",
 activePaneMode === 'member' ? `${isLight ? "border-[#8B7355]" : "border-[#FDF5E6]"}` : `${isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"} `
 )}
 onClick={() => {
 setActivePaneMode('member');
 setIsMemberInputFocused(true); // 点击整个区域时触发输入模式
 }}
 >
 <User className={cn("w-3 h-3 shrink-0", activePaneMode === 'member' ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}`)} />
 
 {/* 终极极简交互：如果处于非输入状态，且有 phoneTracks[0] 则说明有记录，如果为空则显示 placeholder */}
 {!isMemberInputFocused && phoneTracks[0] ? (
 <div className="flex-1 truncate flex items-center justify-start pl-2">
 <span className={cn(
 "text-[11px] tracking-widest leading-none -translate-y-[1px]",
 matchedProfile || matchedHistoryCustomer || (customerId && !customerId.startsWith('CO')) ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : (isLight ? "text-black" : "text-white")
 )}>
 {matchedProfile?.name || phoneTracks[0]}
 </span>
 </div>
 ) : (
 /* 输入模式或无输入记录时显示输入框 */
 <div className="flex-1 w-full h-full flex flex-col justify-center pl-2 relative">
 <input 
 type="text" 
 autoComplete="off"
 placeholder={t('txt_9be070')} 
 className={cn("bg-transparent border-none outline-none text-[11px] w-full truncate leading-none text-left", isLight ? "placeholder:text-black text-black" : "placeholder:text-white text-white")}
 value={phoneTracks[0] || ""}
 onChange={(e) => {
 const newTracks = [...phoneTracks];
 newTracks[0] = e.target.value;
 updatePhoneTracks(newTracks);
 if (activePaneMode !== 'member') setActivePaneMode('member');
 }}
 onBlur={() => {
 // 延迟坍缩，避免点击下拉菜单时直接关闭
 setTimeout(() => setIsMemberInputFocused(false), 200);
 }}
 autoFocus={isMemberInputFocused} // 被唤醒时自动聚焦
 />
 
 {/* 极简下拉推荐菜单 (Fuzzy Search Dropdown) */}
 <AnimatePresence>
 {isMemberInputFocused && phoneTracks[0] && phoneTracks[0].length >= 3 && (fuzzyResults.length > 0 || isFuzzySearching) && (
 <motion.div 
 
 
 
 
 className={cn("absolute top-[120%] left-0 w-[120%] border rounded-xl z-[100] overflow-hidden flex flex-col", isLight ? `bg-white/90 ${isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"}` : `bg-black/90 ${isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"}`)}
 >
 {/* 顶部光线 */}
 <div className={`h-[1px] w-full bg-gradient-to-r from-transparent ${isLight ? "via-[#8B7355]" : "via-[#FDF5E6]"} to-transparent `} />
 
 {isFuzzySearching ? (
 <div className="p-4 flex items-center justify-center gap-2 ">
 <span className={`w-1 h-1 ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} rounded-full animate-ping`} />
 <span className={`w-1 h-1 ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} rounded-full animate-ping `} />
 <span className={`w-1 h-1 ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} rounded-full animate-ping `} />
 </div>
 ) : (
 <div className="max-h-[200px] overflow-y-auto custom-scrollbar flex flex-col py-1">
 {fuzzyResults.map((result, idx) => (
 <div 
 key={idx}
 className={`px-3 py-2.5 cursor-pointer flex items-center justify-between group `}
 onClick={() => {
 const newTracks = [...phoneTracks];
 newTracks[0] = result.phone;
 // 【核心修复】：点击下拉列表后，调用更新电话，并禁止自动探针再次发起搜索，以免冲刷掉我们手动设置的值
 updatePhoneTracks(newTracks, true);
 
 // 立即填充历史老客信息
 setMatchedHistoryCustomer({
 name: result.name,
 phone: result.phone,
 gx_id: result.gx_id
 });
 
 // 触发 C 端精确匹配联动
 BookingService.getProfileByPhone(result.phone).then(({data}) => {
 setMatchedProfile(data);
 });

 // 【核心修复】：如果匹配到了老客，必须清空下面的“新客选定分类(GV/AD等)”状态，防止计算 ID 冲突
 setNewCustomerType(null);
 setIsMemberInputFocused(false);
 }}
 >
 <div className="flex flex-col gap-0.5">
 <span className={cn(`text-[11px] `, isLight ? "text-black" : "text-white")}>
 {/* 高亮匹配的数字 */}
 {result.phone.split(new RegExp(`(${phoneTracks[0]})`, 'gi')).map((part: string, i: number) => 
 part.toLowerCase() === phoneTracks[0].toLowerCase() 
 ? <span key={i} className={`${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} ${isLight ? "bg-[#8B7355]/20" : "bg-[#FDF5E6]/20"} px-0.5 rounded`}>{part}</span>
 : <span key={i}>{part}</span>
 )}
 </span>
 {result.name && (
 <span className={cn("text-[11px] truncate max-w-[120px]", isLight ? "text-black " : "text-white ")}>
 {result.name}
 </span>
 )}
 </div>
 {result.gx_id && !result.gx_id.startsWith('CO') && (
 <div className="shrink-0 px-1.5 py-0.5 rounded border text-[11px] tracking-widest uppercase">
 {result.gx_id.replace(/^[a-zA-Z]+\s*/, '')}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* 预约时空仪表盘 (Unified Time/Date Dashboard) - 悬浮极简版 */}
 <div className="mt-4 space-y-2">
 <label className={cn("text-[11px] tracking-[0.2em] uppercase ", isLight ? "text-black" : "text-white")}>{t('txt_5b32fe')}</label>
 <div className="rounded-xl flex flex-col overflow-hidden bg-transparent">
 
 {/* 上半部分：日期与时间 (并排) */}
 <div className="flex">
 {/* 预约日期触发器 */}
 <button
 onClick={() => setActivePaneMode('date')}
 className={cn(
 "flex-1 flex flex-col items-start justify-center p-4 relative group",
 isLight ? "" : ""
 )}
 >
 <div className="flex items-center gap-2 mb-2">
 <CalendarIcon className={cn("w-3 h-3 ", isLight ? "text-black " : "text-white ")} />
 <span className={cn("text-[11px] tracking-[0.2em] uppercase ", isLight ? "text-black " : "text-white ")}>{t('txt_4ff1e7')}</span>
 </div>
 <span className={cn(
 "text-lg tracking-wider ",
 isLight ? "text-black" : "text-white"
 )}>
 {selectedDate.replace(/\//g, '.')}
 </span>
 </button>

 {/* 开始时间触发器 */}
 <button
 onClick={() => setActivePaneMode('time')}
 className={cn(
 "flex-1 flex flex-col items-start justify-center p-4 relative group",
 isLight ? "" : ""
 )}
 >
 <div className="flex items-center gap-2 mb-2">
 <Clock className={cn("w-3 h-3 ", isLight ? "text-black " : "text-white ")} />
 <span className={cn("text-[11px] tracking-[0.2em] uppercase ", isLight ? "text-black " : "text-white ")}>{t('txt_19fcb9')}</span>
 </div>
 <span className={cn(
 "text-lg tracking-wider ",
 isLight ? "text-black" : "text-white"
 )}>
 {selectedTime}
 </span>
 </button>
 </div>

 {/* 下半部分：时长与结束时间推算 (并排) */}
 <div className="flex">
 {/* 服务时长触发器 */}
 <button
 onClick={() => setActivePaneMode('duration')}
 className={cn(
 "flex-1 flex items-center justify-between p-4 relative group",
 isLight ? "" : ""
 )}
 >
 <span className={cn("text-[11px] tracking-[0.2em] uppercase ", isLight ? "text-black " : "text-white ")}>{t('txt_5bdfd7')}</span>
 <span className={cn(
 "text-sm ",
 durationOffset !== 0 ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} drop-` : (isLight ? "text-black" : "text-white")
 )}>
 {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
 </span>
 </button>

 {/* 结束时间 (只读展示) */}
 <div className={cn(
 "flex-1 flex items-center justify-between p-4 ",
 totalDuration === 0 ? "" : ""
 )}>
 <span className={cn("text-[11px] tracking-[0.2em] uppercase", isLight ? "text-black" : "text-white")}>{t('txt_946010')}</span>
 <span className={cn("text-sm ", isLight ? "text-black" : "text-white")}>
 {getEndTime()}
 </span>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ===================== 右侧/底部：动态监视器区 ===================== */}
 <section 
 className="flex-1 h-auto min-h-[400px] md:min-h-0 md:h-full p-4 md:p-6 pb-24 relative z-10 overflow-hidden"
 onTouchStart={handleTouchStart}
 onTouchEnd={handleTouchEnd}
 >
 {activePaneMode === 'service' && (
 // 服务项目选择矩阵与人员分配
 <div className="h-full flex flex-col overflow-hidden relative">
 {/* 分类标签导航 */}
 <div className="flex gap-[20px] pb-3 mb-4 overflow-x-auto no-scrollbar shrink-0 sticky top-0 z-10 pointer-events-none">
 {categories.map(cat => (
 <button
 key={cat.id}
 onClick={() => setActiveCategory(cat.id)}
 className={cn(
 "text-[15px] whitespace-nowrap uppercase tracking-widest pointer-events-auto",
 isLight ? "text-black " : "text-white "
 )}
 >
 {(cat.name || '').replace(/^[^\w\u4e00-\u9fa5]+/, '').trim()}
 </button>
 ))}
 {categories.length === 0 && (
 <span className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>{t('txt_0552d7')}</span>
 )}
 </div>

 {/* Pro Studio 工作台布局：左侧画笔槽 + 右侧画布 */}
 <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
 {/* 左侧垂直画笔槽 (极致压缩版竖列胶囊) */}
 <div className="w-[80px] shrink-0 flex flex-col gap-1.5 overflow-y-auto no-scrollbar pr-2 pb-24">
 {/* 无指定 (断电态) */}
 <button
 onClick={() => handleSetBrush(null)}
 className={cn(
 "flex items-center justify-start gap-2 p-2 rounded-lg shrink-0 h-[36px] bg-transparent",
 currentBrushEmployeeId !== null && (isLight ? "" : "")
 )}
 style={{
 border: currentBrushEmployeeId === null ? `1px solid ${isLight ? '#8B7355' : '#FDF5E6'}` : '1px solid transparent'
 }}
 >
 <div className={cn(
 "w-2 h-2 rounded-full shrink-0 ",
 currentBrushEmployeeId === null ? `${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"}` : (isLight ? "border border-black/20" : "border border-white/20")
 )} />
 <span className={cn(
 "text-[11px] tracking-wider uppercase text-left truncate",
 currentBrushEmployeeId === null ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : (isLight ? "text-black" : "text-white")
 )}>
 TBD
 </span>
 </button>

 {/* 员工画笔列表 */}
 {staffs.map(staff => {
 const isAssigned = currentBrushEmployeeId === staff.id;
 return (
 <button
 key={staff.id}
 onClick={() => handleSetBrush(staff.id)}
 className={cn(
 "flex items-center justify-start gap-2 p-2 rounded-lg shrink-0 h-[36px] bg-transparent",
 !isAssigned && (isLight ? "" : "")
 )}
 style={{
 border: isAssigned ? `1px solid ${staff.color}` : '1px solid transparent'
 }}
 >
 <div 
 className={cn(
 "w-2 h-2 rounded-full shrink-0 ",
 isAssigned ? "" : ""
 )}
 style={{ 
 backgroundColor: staff.color
 }}
 />
 <span className={cn(
 "text-[11px] tracking-wider uppercase text-left truncate",
 isAssigned ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black" : "text-white")
 )}>
 {staff.name}
 </span>
 </button>
 );
 })}
 </div>

 {/* 右侧服务项目矩阵画布 */}
 <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
 <div className="grid grid-cols-2 gap-3 pr-2 content-start">
 {services
 .filter(s => s.categoryId === activeCategory)
 .map(service => {
 const isSelected = selectedServices.some(s => s.id === service.id);
 const selectedData = selectedServices.find(s => s.id === service.id);
 const assignedStaff = selectedData ? staffs.find(st => st.id === selectedData.assignedEmployeeId) : null;
 
 // 灵魂注入材质：根据分配的员工颜色决定发光颜色
 const glowColor = assignedStaff ? assignedStaff.color : (isLight ? '#8B7355' : '#FDF5E6'); // 未指定时默认黑金/白金发光
 const glowStyle = isSelected ? {
 border: `1px solid ${glowColor}`
 } : {
 border: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`
 };

 return (
 <button
 key={service.id}
 onClick={() => handleToggleService(service)}
 className={cn(
 "p-3 rounded-xl text-left flex flex-col justify-center h-[64px] group relative overflow-hidden bg-transparent",
 !isSelected && (isLight ? "" : "")
 )}
 style={glowStyle}
 >
 {/* 赛博扫描线特效 (已移除，追求极致性能) */}
 
 <span className={cn(
 "text-xs line-clamp-2 leading-tight pr-3 z-10",
 !isSelected && (isLight ? "text-black " : "text-white ")
 )}
 style={isSelected ? { color: glowColor } : {}}>
 {service.name}
 </span>
 </button>
 );
 })}
 {services.filter(s => s.categoryId === activeCategory).length === 0 && categories.length > 0 && (
 <div className={cn("col-span-full text-center text-[11px] mt-10", isLight ? "text-black" : "text-white")}>
 NO SERVICES IN THIS CATEGORY
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {activePaneMode === 'member' && (
 <div 
 className="h-full flex flex-col p-2 overflow-hidden relative"
 >
 {/* 1. 顶部：核心身份与消费概览 (双轨ID跨域融合架构) */}
 <div className="flex items-start justify-between pb-4 mb-4 shrink-0 px-2">
 <div className="flex items-center gap-4 w-[75%]">
 {/* 左侧：全息圆形头像 (平台社交身份锚点) */}
 <div className="relative shrink-0">
 <div className={cn(
 "w-14 h-14 rounded-full flex items-center justify-center relative border-2",
 matchedProfile 
 ? "bg-gradient-to-br " // 已匹配 C 端用户
 : matchedHistoryCustomer
 ? `bg-gradient-to-br ${isLight ? "from-[#8B7355]/20" : "from-[#FDF5E6]/20"} to-gx-blue/20 ${isLight ? "border-[#8B7355]/60" : "border-[#FDF5E6]/60"}` // 已匹配 B 端老客
 : (phoneTracks[0] || newCustomerType || (customerId && !customerId.startsWith('CO')))
 ? "bg-gradient-to-br "
 : (isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10") // 游离态散客
 )}>
 <span className={cn(
 "text-xl tracking-widest",
 customerId.startsWith('CO')
 ? (isLight ? "text-black" : "text-white")
 : `bg-gradient-to-br ${isLight ? "from-[#8B7355]" : "from-[#FDF5E6]"} bg-clip-text text-transparent `
 )}>
 {(() => {
 if (customerId) {
 const prefix = customerId.substring(0, 2).toUpperCase();
 if (/^[A-Z]{2}$/.test(prefix)) return prefix;
 }
 if (newCustomerType) {
 return newCustomerType.toUpperCase();
 }
 return 'CO';
 })()}
 </span>
 
 {/* 匹配成功的光晕特效 */}
 {(matchedProfile || matchedHistoryCustomer || phoneTracks[0] || newCustomerType || (customerId && !customerId.startsWith('CO'))) && (
 <div 
 className="absolute inset-[-4px] rounded-full border border-dashed pointer-events-none animate-[spin_15s_linear_infinite]"
 />
 )}
 </div>
 </div>

 {/* 中部：信息流与双轨 ID 矩阵 */}
 <div className="flex flex-col gap-1 w-full">
 {/* 上层：门店内部档案编号 (业务基石，绝不覆盖) */}
 <div className="flex items-baseline gap-2">
 <div className={cn(
 " text-lg tracking-[0.1em] shrink-0 leading-none",
 customerId.startsWith('CO') 
 ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` // 散客冷峻单色
 : `bg-gradient-to-r ${isLight ? "from-[#8B7355]" : "from-[#FDF5E6]"} bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] drop-` // VIP 七彩流光
 )}>
 {formatDisplayId(customerId)}
 </div>
 </div>

 {/* 中层：历史信标与徽章及名字输入 */}
 <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
 {(matchedProfile || matchedHistoryCustomer || phoneTracks[0] || newCustomerType || (customerId && !customerId.startsWith('CO'))) && (
 <>
 {matchedProfile && (
 <span className="text-[11px] uppercase tracking-widest px-1.5 py-0.5 rounded border ">
 已联动 C端
 </span>
 )}
 {!matchedProfile && matchedHistoryCustomer && (
 <span className={`text-[11px] uppercase tracking-widest px-1.5 py-0.5 rounded ${isLight ? "bg-[#8B7355]/10" : "bg-[#FDF5E6]/10"} border ${isLight ? "border-[#8B7355]/30" : "border-[#FDF5E6]/30"} ${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}`}>
 已留存档案
 </span>
 )}
 
 <span className={cn(
 "text-[11px] italic tracking-widest",
 isLight ? "text-black" : "text-white",
 ""
 )}>
 LV.{Math.floor((realTotalSpent || 0) / 1000)}
 </span>
 </>
 )}
 
 {/* 名字输入框 (始终显示，供散客录入) */}
 <input 
 type="text"
 autoComplete="off"
 placeholder="客户名字..."
 className={cn(
 "bg-transparent border-b outline-none text-xs w-24 ml-1 px-1",
 isLight ? "border-black/20 text-black placeholder:text-black focus:border-black/50" : "border-white/20 text-white placeholder:text-white focus:border-white/50"
 )}
 value={customerRealName}
 onChange={(e) => setCustomerRealName(e.target.value)}
 />
 </div>
 
 {/* 下层：电话号码多轨流 */}
 <div className="flex flex-col gap-0.5 mt-1">
 {phoneTracks.map((phone, index) => (
 <div key={index} className="flex items-center gap-2 group/phone">
 {editingPhoneIndex === index ? (
 <input 
 type="text" 
 autoComplete="off"
 placeholder={t('txt_f3a023')} 
 className={cn(`bg-transparent border-b ${isLight ? "border-[#8B7355]/50" : "border-[#FDF5E6]/50"} outline-none text-sm w-32`, isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 value={phone}
 onChange={(e) => {
 const newTracks = [...phoneTracks];
 newTracks[index] = e.target.value;
 updatePhoneTracks(newTracks);
 }}
 onBlur={() => setEditingPhoneIndex(null)}
 autoFocus
 />
 ) : (
 <span 
 className={cn(
 "text-sm cursor-pointer ",
 isLight ? "" : "",
 customerId.startsWith('CO') 
 ? (isLight ? "text-black" : "text-white")
 : `bg-gradient-to-r ${isLight ? "from-[#8B7355]/80" : "from-[#FDF5E6]/80"} bg-clip-text text-transparent `
 )}
 onClick={() => setEditingPhoneIndex(index)}
 >
 {phone || "无电话记录"}
 </span>
 )}
 
 {/* 动态增减按钮 */}
 <div className="flex items-center gap-1">
 {index === phoneTracks.length - 1 && (
 <button 
 onClick={() => updatePhoneTracks([...phoneTracks, ''])}
 className={cn("w-4 h-4 rounded-full border flex items-center justify-center text-xs", isLight ? "border-black/20 text-black " : "border-white/20 text-white ")}
 >
 +
 </button>
 )}
 {phoneTracks.length > 1 && (
 <button 
 onClick={() => {
 const newTracks = phoneTracks.filter((_, i) => i !== index);
 updatePhoneTracks(newTracks);
 }}
 className={cn("w-4 h-4 rounded-full border flex items-center justify-center text-xs", isLight ? "border-black/20 text-black " : "border-white/20 text-white ")}
 >
 -
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 
 {/* 右侧：总金额 */}
 <div className="flex flex-col items-end shrink-0 pt-1">
 <span className={cn("text-xl tracking-wider mt-4", isLight ? "text-black" : "text-white")}>
 {phoneTracks[0] || newCustomerType || matchedHistoryCustomer || matchedProfile || (customerId && !customerId.startsWith('CO')) 
 ? (isFetchingHistory ? "..." : `¥ ${realTotalSpent.toLocaleString()}`)
 : "¥ 0"}
 </span>
 </div>
 </div>

 {/* 2. 中间：过往消费记录卡片 (可滚动区) / 散客极简显示 */}
 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4 px-2 pb-2">
 {phoneTracks[0] || newCustomerType || matchedHistoryCustomer || matchedProfile || (customerId && !customerId.startsWith('CO')) ? (
 <div className="flex flex-col gap-2 pt-2">
 
 {isFetchingHistory ? (
 <div className={cn("text-center text-xs py-8 ", isLight ? "text-black" : "text-white")}>Scanning Neural Network...</div>
 ) : realHistoryStream.length === 0 ? (
 <div className={cn("text-center text-xs py-8", isLight ? "text-black" : "text-white")}>NO HISTORICAL RECORDS FOUND</div>
 ) : (
 realHistoryStream.map((record) => {
 const dateObj = new Date(record.date);
 const formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getDate().toString().padStart(2, '0')}`;
 const isNoShow = record.status?.toUpperCase() === 'NO_SHOW';
 const isCompleted = ['COMPLETED', 'CHECKED_OUT'].includes(record.status?.toUpperCase());
 const services = record.data?.services || [];
 const serviceName = services.map((s: any) => s.name).join(' + ') || record.data?.serviceName || "未知项目";
 const price = services.reduce((sum: number, s: any) => sum + (s.prices?.[0] || 0), 0);
 
 // 获取员工信息 (Staff Info)
 const staffId = record.resourceId;
 const staff = staffs.find(s => s.id === staffId);
 const staffName = staff?.name || (staffId !== 'unassigned' && staffId !== 'null' ? staffId : 'UN');
 const staffColor = staff?.color || (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)');
 
 // 判断时空状态法则
 const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
 const isToday = record.date === todayStr;
 const isFuture = record.date > todayStr;
 // const isPast = record.date < todayStr;
 
 // 计算时空差值
 const todayTime = new Date(todayStr.replace(/-/g, '/')).getTime();
 const recordTime = new Date(record.date.replace(/-/g, '/')).getTime();
 const diffTime = recordTime - todayTime;
 const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
 
 // 渲染 T 纪元标识
 let epochLabel = "";
 let epochSubLabel = "";
 if (isToday) {
 epochLabel = "TODAY";
 } else if (isFuture) {
 epochLabel = `T+${diffDays}`;
 epochSubLabel = formattedDate;
 } else {
 epochLabel = `T-${diffDays}`;
 epochSubLabel = formattedDate;
 }
 
 // 判断是否是当前正在查看的这笔连单中的一员
 const relatedIds = editingBooking?.isSuperBooking && editingBooking?.relatedBookings 
 ? editingBooking.relatedBookings.map(b => b.id) 
 : [];
 const isCurrentViewing = record.id === editingBooking?.id || relatedIds.includes(record.id);

 return (
 <div key={record.id} className="relative group cursor-pointer flex">
 {/* 左侧能量轴 (Time Axis) */}
 <div className="w-6 shrink-0 flex flex-col items-center relative mr-2">
 <div className={cn("absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent to-transparent", isLight ? "via-black/10" : "via-white/10")}></div>
 <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-center">
 {isToday ? (
 <div className={cn("w-2 h-2 rounded-full border-2 z-10", isLight ? "bg-black border-white" : "bg-white border-black")} />
 ) : isFuture ? (
 <div className={cn(`w-2.5 h-2.5 rounded-full border ${isLight ? "border-[#8B7355]/50" : "border-[#FDF5E6]/50"} z-10 flex items-center justify-center`, isLight ? "bg-white" : "bg-black")}>
 <div className={`w-0.5 h-0.5 ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} rounded-full`} />
 </div>
 ) : (
 <div className={cn("w-2 h-2 rounded-full border-2 z-10", isLight ? "border-white bg-black/20" : "border-black bg-white/20")} />
 )}
 </div>
 </div>
 
 <div className={cn(
 "flex-1 flex items-center justify-between p-4 relative overflow-hidden rounded-xl",
 isFuture ? (isLight ? `border border-dashed border-black/20 ` : `border border-dashed border-white/20 `) : (isLight ? "border border-black/5 " : "border border-white/5 "),
 isNoShow && (isLight ? "border-black/5 border-solid" : "border-white/5 border-solid"),
 isCurrentViewing && (isLight ? "border-[#8B7355]/50 border-solid" : "border-[#FDF5E6]/50 border-solid"),
 isToday && !isCurrentViewing && "border-transparent" // 为TODAY准备跑马灯
 )}>
 
 {/* 当天订单特效：跑马灯边框 */}
 {isToday && (
 <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
 <div className="absolute -inset-[100%] animate-[spin_4s_linear_infinite]"
 style={{
 background: isLight 
 ? `conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 50%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.4) 100%)`
 : `conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 50%, rgba(255,255,255,0.1) 80%, rgba(255,255,255,0.4) 100%)`
 }}
 />
 <div className={cn("absolute inset-[1px] rounded-[11px]", isLight ? "bg-[#f5f5f5]" : "bg-[#1a1a1a]")} />
 </div>
 )}
 
 {/* 当前查看中的呼吸微标签 */}
 {isCurrentViewing && (
 <div className={cn(
 "absolute top-1.5 right-3 text-[11px] tracking-widest z-10",
 isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"
 )}>
 查看中
 </div>
 )}

 <div className="flex items-center gap-4 w-[70%] z-10 overflow-hidden">
 <div className="flex flex-col items-center justify-center w-12 shrink-0">
 <span className={cn(
 "text-sm text-center tracking-tighter", 
 isNoShow ? (isLight ? "text-black" : "text-white") : (isToday ? (isLight ? "text-black " : "text-white ") : isFuture ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : (isLight ? "text-black" : "text-white"))
 )}>
 {epochLabel}
 </span>
 {epochSubLabel && !isNoShow && (
 <span className={cn("text-[11px] mt-0.5", isFuture ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}` : (isLight ? "text-black" : "text-white"))}>
 {epochSubLabel}
 </span>
 )}
 </div>
 
 <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
 <span className={cn("w-3 h-[1px] shrink-0 rounded-full hidden sm:block", isLight ? "bg-black/20" : "bg-white/20")}></span>
 {/* 渲染多服务多员工胶囊 */}
 <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar pr-4">
 {services.length > 0 ? (
 services.map((svc: any, idx: number) => {
 const assignedId = svc.assignedEmployeeId || record.resourceId;
 const svcStaff = staffs.find(s => s.id === assignedId);
 const svcStaffName = svcStaff?.name || (assignedId !== 'unassigned' && assignedId !== 'null' ? assignedId : 'UN');
 const svcCx = svcStaff?.color || (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)');
 
 return (
 <div 
 key={idx} 
 className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border shrink-0 "
 style={{ 
 backgroundColor: isNoShow ? (isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)') : `${svcCx}15`,
 borderColor: isNoShow ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)') : `${svcCx}30`,
 }}
 >
 <span className=" tracking-widest uppercase" style={{ color: isNoShow ? (isLight ? '#000000' : '#FFFFFF') : svcCx }}>{svcStaffName}</span>
 {!isNoShow && <span className="w-[1px] h-2.5 " style={{ backgroundColor: svcCx }}></span>}
 <span className={cn("truncate max-w-[100px]", isNoShow ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black" : "text-white"))}>{svc.name || '未知项目'}</span>
 </div>
 );
 })
 ) : (
 <div 
 className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border shrink-0"
 style={{ 
 backgroundColor: isNoShow ? (isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)') : `${staffColor}15`,
 borderColor: isNoShow ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)') : `${staffColor}30`,
 }}
 >
 <span className=" tracking-widest uppercase" style={{ color: isNoShow ? (isLight ? '#000000' : '#FFFFFF') : staffColor }}>{staffName}</span>
 {!isNoShow && <span className="w-[1px] h-2.5 " style={{ backgroundColor: staffColor }}></span>}
 <span className={cn("truncate max-w-[100px]", isNoShow ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black" : "text-white"))}>{serviceName}</span>
 </div>
 )}
 </div>
 </div>
 </div>
 
 <div className="flex items-center gap-4 z-10">
 {/* 金额：未结账时不显示金额（无论过去、今天还是未来） */}
 <span className={cn("text-xs ", isNoShow ? (isLight ? "text-black" : "text-white") : (isLight ? "text-black" : "text-white"))}>
 {isNoShow ? "--" : (!isCompleted ? "--" : `¥ ${price}`)}
 </span>
 
 {isNoShow ? (
 <span className={cn("text-[11px] px-2 py-1 rounded border whitespace-nowrap uppercase tracking-widest", isLight ? "bg-black/5 text-black border-black/30" : "bg-white/5 text-white border-white/30")}>
 {t('txt_e49d53')}
 </span>
 ) : (
 <span className="text-[11px] opacity-0 px-2 py-1">占位符</span>
 )}
 </div>
 </div>
 </div>
 );
 })
 )}
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center relative">
 <span className={cn("text-5xl uppercase tracking-widest", isLight ? "text-black " : "text-white ")}>
 {formatDisplayId(customerId)}
 </span>
 </div>
 )}
 </div>

 {/* 3. 底部：新客分类按钮 & 单行备注 */}
 <div className="shrink-0 space-y-4 px-2 pb-24">
 {/* 分类选项 (仅在新客且未匹配到会员时显示) */}
 {!matchedProfile && !matchedHistoryCustomer && (!editingBooking?.customerId || editingBooking.customerId.startsWith('CO')) && (
 <div className="flex justify-between items-center px-4">
 {['GV', 'AD', 'AN', 'UM'].map(type => (
 <button 
 key={type}
 onClick={() => setNewCustomerType(type)}
 className={cn(
 " text-sm uppercase tracking-widest flex items-center justify-center outline-none",
 newCustomerType === type 
 ? `${isLight ? "text-black" : "text-white"}`
 : ` ${isLight ? "text-black" : "text-white"}`
 )}
 >
 {type}
 </button>
 ))}
 </div>
 )}

 {/* 单行备注 */}
 <div className="relative">
 <textarea 
 placeholder={t('txt_bf9b52')}
 className={cn("w-full bg-transparent border-none outline-none text-xs resize-none h-8 leading-8 px-1 custom-scrollbar overflow-x-hidden whitespace-nowrap", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 rows={1}
 style={{ whiteSpace: 'nowrap' }} // 强制单行横向滚动
 />
 <div className={cn(`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${isLight ? "from-[#8B7355]/50" : "from-[#FDF5E6]/50"} to-transparent`, isLight ? "via-black/10" : "via-white/10")} />
 </div>
 </div>
 </div>
 )}

 {activePaneMode === 'duration' && (
 <div className="h-full flex flex-col items-center justify-center p-8 pb-24 select-none touch-none relative">
 {/* 全息视界区 (HUD Display) */}
 <div className="flex flex-col items-center mb-6">
 <span 
 key={totalDuration}
 className={cn("text-[64px] tracking-widest bg-clip-text text-transparent leading-none whitespace-nowrap", isLight ? "bg-gradient-to-br from-black via-black/90 to-black/40 " : "bg-gradient-to-br from-white via-white/90 to-white/40 ")}
 >
 {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
 </span>
 
 <div className={cn("mt-4 flex items-center gap-4 text-[11px] tracking-widest", isLight ? "text-black" : "text-white")}>
 <span>BASE {baseDuration} MIN</span>
 {durationOffset !== 0 && (
 <>
 <span className={cn("w-1 h-1 rounded-full", isLight ? "bg-black/20" : "bg-white/20")} />
 <span className={durationOffset > 0 ? (isLight ? "text-black" : "text-white") : `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"}`}>
 OFFSET {durationOffset > 0 ? '+' : ''}{durationOffset} MIN
 </span>
 </>
 )}
 </div>
 </div>

 {/* 矢量无极微操区 (Vector Micro-manipulation) - 移动到了中间 */}
 <div 
 className="w-full h-16 flex flex-col items-center justify-center cursor-ew-resize group z-20 mb-6"
 onPointerDown={(e) => {
 e.preventDefault();
 e.currentTarget.setPointerCapture(e.pointerId);
 setCenterDragStart(e.clientX);
 }}
 onPointerMove={(e) => {
 if (centerDragStart !== null) {
 const dx = e.clientX - centerDragStart;
 // 增加触发阈值，每移动 20px，增加或减少 5 分钟
 if (Math.abs(dx) >= 20) {
 const step = Math.floor(dx / 20) * 5;
 setDurationOffset(prev => prev + step);
 setCenterDragStart(e.clientX); // Reset origin to allow continuous smooth sliding
 }
 }
 }}
 onPointerUp={(e) => {
 if (centerDragStart !== null) {
 e.currentTarget.releasePointerCapture(e.pointerId);
 setCenterDragStart(null);
 }
 }}
 >
 <div className={`flex items-center gap-4 ${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} `}>
 <svg className="w-4 h-4 " fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
 <span className="text-[11px] tracking-[0.3em] uppercase">Drag to Adjust</span>
 <svg className="w-4 h-4 " fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
 </div>
 <div className={`w-48 h-px bg-gradient-to-r from-transparent ${isLight ? "via-[#8B7355]/30" : "via-[#FDF5E6]/30"} to-transparent mt-3 `} />
 </div>

 {/* 脉冲微调阵列 (Quick Offset Tags) */}
 <div className="w-full max-w-[400px] space-y-6 relative z-10">
 {/* 缩减区 (提前) */}
 <div className="flex justify-center gap-3">
 {[-45, -30, -15].map(offset => (
 <button
 key={offset}
 onClick={() => setDurationOffset(offset)}
 className={cn(
 "w-16 py-2 rounded-lg text-xs ",
 durationOffset === offset 
 ? `${isLight ? "bg-[#8B7355]/10" : "bg-[#FDF5E6]/10"} ${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} drop-` 
 : (isLight ? "bg-black/5 text-black " : "bg-white/5 text-white ")
 )}
 >
 {offset}
 </button>
 ))}
 </div>

 {/* 增加区 (延时) */}
 <div className="flex justify-center gap-3">
 {[15, 30, 45, 60].map(offset => (
 <button
 key={offset}
 onClick={() => setDurationOffset(offset)}
 className={cn(
 "w-16 py-2 rounded-lg text-xs ",
 durationOffset === offset 
 ? `${isLight ? "bg-[#8B7355]/10" : "bg-[#FDF5E6]/10"} ${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} drop-` 
 : (isLight ? "bg-black/5 text-black " : "bg-white/5 text-white ")
 )}
 >
 +{offset}
 </button>
 ))}
 </div>
 </div>
 </div>
 )}

 {activePaneMode === 'date' && (
 <div className="h-full flex flex-col pt-2 pb-24 overflow-y-auto custom-scrollbar pr-2">
 {/* Header: Month and Year with glowing text */}
 <div className="flex items-center justify-between mb-6 px-4 shrink-0">
 <button 
 onClick={() => {
 const newDate = new Date(calendarViewDate);
 newDate.setMonth(newDate.getMonth() - 1);
 setCalendarViewDate(newDate);
 }}
 className={cn(` px-2 py-1`, isLight ? "text-black" : "text-white")}
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
 </button>
 <span className={cn("text-lg tracking-[0.2em] uppercase bg-clip-text text-transparent", isLight ? "bg-gradient-to-r from-black via-black/90 to-black/50" : "bg-gradient-to-r from-white via-white/90 to-white/50")}>
 {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
 </span>
 <button 
 onClick={() => {
 const newDate = new Date(calendarViewDate);
 newDate.setMonth(newDate.getMonth() + 1);
 setCalendarViewDate(newDate);
 }}
 className={cn(` px-2 py-1`, isLight ? "text-black" : "text-white")}
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
 </button>
 </div>

 {/* Matrix: Gridless approach */}
 <div className="flex-1 px-2 shrink-0">
 {/* Weekdays */}
 <div className="grid grid-cols-7 mb-4">
 {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
 <div key={day} className={cn("text-center text-[11px] tracking-widest ", isLight ? "text-black" : "text-white")}>
 {day}
 </div>
 ))}
 </div>

 {/* Days */}
 <div className="grid grid-cols-7 gap-y-4 gap-x-2">
 {(() => {
 const year = calendarViewDate.getFullYear();
 const month = calendarViewDate.getMonth();
 const firstDayOfMonth = new Date(year, month, 1).getDay();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const today = new Date();
 const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

 const days = [];
 // 填充上个月的空白
 for (let i = 0; i < firstDayOfMonth; i++) {
 days.push(<div key={`empty-${i}`} className="h-10" />);
 }

 // 渲染当月天数
 for (let i = 1; i <= daysInMonth; i++) {
 const formattedMonth = (month + 1).toString().padStart(2, '0');
 const formattedDay = i.toString().padStart(2, '0');
 const dateString = `${year}/${formattedMonth}/${formattedDay}`;
 const isSelected = selectedDate === dateString;
 const isToday = isCurrentMonth && today.getDate() === i;

 days.push(
 <button
 key={`day-${i}`}
 onClick={() => setSelectedDate(dateString)}
 className={cn(
 "relative h-10 flex flex-col items-center justify-center text-sm rounded-lg group",
 isSelected 
 ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} border ${isLight ? "border-[#8B7355]/50" : "border-[#FDF5E6]/50"} ${isLight ? "bg-[#8B7355]/5" : "bg-[#FDF5E6]/5"}` 
 : (isLight ? "text-black border border-transparent" : "text-white border border-transparent")
 )}
 >
 {formattedDay}
 {/* Today pulse indicator */}
 {isToday && !isSelected && (
 <div className={`absolute bottom-1 w-[3px] h-[3px] rounded-full ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} `} />
 )}
 </button>
 );
 }
 return days;
 })()}
 </div>
 </div>
 </div>
 )}

 {activePaneMode === 'time' && (
 <div 
 className="h-full flex flex-col items-center justify-start relative select-none pt-0 touch-none cursor-default"
 >
 {/* 顶部中心 HUD (HH:mm) */}
 <div className={cn("absolute -top-2 left-1/2 -translate-x-1/2 flex shrink-0 items-center gap-2 z-30 text-[50px] tracking-widest leading-none", isLight ? "" : "")}>
 <button 
 onClick={() => setTimeSelectionMode('hour')}
 className={cn(
 " px-2 rounded-lg",
 timeSelectionMode === 'hour' ? (isLight ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} bg-black/5` : `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} bg-white/5`) : (isLight ? "text-black " : "text-white ")
 )}
 >
 {selectedTime.split(':')[0]}
 </button>
 <span className={cn("mb-3", isLight ? "text-black" : "text-white")}>:</span>
 <button 
 onClick={() => setTimeSelectionMode('minute')}
 className={cn(
 " px-2 rounded-lg",
 timeSelectionMode === 'minute' ? (isLight ? `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} bg-black/5` : `${isLight ? "text-[#8B7355]" : "text-[#FDF5E6]"} bg-white/5`) : (isLight ? "text-black " : "text-white ")
 )}
 >
 {selectedTime.split(':')[1]}
 </button>
 </div>

 <div className={cn(
 "relative w-[340px] h-[340px] flex items-center justify-center group touch-none cursor-default mt-8 ",
 "scale-100 opacity-100"
 )}>
 {/* 中心光点 */}
 <div className={`absolute inset-0 m-auto w-3 h-3 rounded-full ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} z-30 pointer-events-none`} />

 {/* 双圈 / 单圈 渲染 */}
 {timeSelectionMode === 'hour' ? (
 <>
 {/* 外圈 1-12 */}
 <div className="absolute inset-0 z-20 pointer-events-none">
 {Array.from({ length: 12 }).map((_, i) => {
 const hr = i === 0 ? 12 : i;
 const angle = i * 30 - 90;
 const rad = 130;
 const x = Math.cos(angle * Math.PI / 180) * rad;
 const y = Math.sin(angle * Math.PI / 180) * rad;
 
 const currentSelectedHour = parseInt(selectedTime.split(':')[0], 10);
 const isSelected = currentSelectedHour === hr || (hr === 12 && currentSelectedHour === 12);

 return (
 <div
 key={`out-${hr}`}
 className={cn(
 "absolute rounded-full flex items-center justify-center text-base cursor-pointer pointer-events-auto",
 isSelected 
 ? `text-black ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} w-12 h-12` 
 : (isLight ? `text-black w-10 h-10` : `text-white w-10 h-10`)
 )}
 style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
 onClick={() => {
 updateSelectedTime(`${hr.toString().padStart(2, '0')}:${selectedTime.split(':')[1]}`);
 setTimeSelectionMode('minute');
 }}
 >
 {hr}
 </div>
 );
 })}
 </div>
 
 {/* 内圈 13-00 */}
 <div className="absolute inset-0 z-20 pointer-events-none">
 {Array.from({ length: 12 }).map((_, i) => {
 const hr = i === 0 ? 0 : i + 12;
 const angle = i * 30 - 90;
 const rad = 85;
 const x = Math.cos(angle * Math.PI / 180) * rad;
 const y = Math.sin(angle * Math.PI / 180) * rad;
 
 const currentSelectedHour = parseInt(selectedTime.split(':')[0], 10);
 const isSelected = currentSelectedHour === hr;

 return (
 <div
 key={`in-${hr}`}
 className={cn(
 "absolute rounded-full flex items-center justify-center text-xs cursor-pointer pointer-events-auto",
 isSelected 
 ? `text-black ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} w-8 h-8` 
 : (isLight ? `text-black w-6 h-6` : `text-white w-6 h-6`)
 )}
 style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
 onClick={() => {
 updateSelectedTime(`${hr.toString().padStart(2, '0')}:${selectedTime.split(':')[1]}`);
 setTimeSelectionMode('minute');
 }}
 >
 {hr === 0 ? '00' : hr}
 </div>
 );
 })}
 </div>

 {/* 绘制选中连线 (Hour) */}
 {(() => {
 const hr = parseInt(selectedTime.split(':')[0], 10);
 const rad = (hr >= 1 && hr <= 12) ? 130 : 85;
 let angle = 0;
 if (hr >= 1 && hr <= 12) {
 angle = (hr === 12 ? 0 : hr) * 30 - 90;
 } else {
 angle = (hr === 0 ? 0 : hr - 12) * 30 - 90;
 }
 const x = Math.cos(angle * Math.PI / 180) * rad;
 const y = Math.sin(angle * Math.PI / 180) * rad;
 const distance = Math.sqrt(x*x + y*y);
 const rotation = angle;

 return (
 <div 
 className={`absolute top-1/2 left-1/2 h-[2px] ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} origin-left z-10 pointer-events-none`}
 style={{ 
 width: `${distance}px`, 
 transform: `translate(0, -50%) rotate(${rotation}deg)`
 }}
 />
 );
 })()}
 </>
 ) : (
 <>
 {/* 分钟单圈 0-55 */}
 <div className="absolute inset-0 z-20 pointer-events-none">
 {Array.from({ length: 12 }).map((_, i) => {
 const min = i * 5;
 const angle = i * 30 - 90;
 const rad = 130;
 const x = Math.cos(angle * Math.PI / 180) * rad;
 const y = Math.sin(angle * Math.PI / 180) * rad;
 
 const currentSelectedMinute = parseInt(selectedTime.split(':')[1], 10);
 const isSelected = currentSelectedMinute === min;

 return (
 <div
 key={`min-${min}`}
 className={cn(
 "absolute rounded-full flex items-center justify-center text-base cursor-pointer pointer-events-auto",
 isSelected 
 ? `text-black ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} w-12 h-12` 
 : (isLight ? `text-black w-10 h-10` : `text-white w-10 h-10`)
 )}
 style={{ left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
 onClick={() => {
 updateSelectedTime(`${selectedTime.split(':')[0]}:${min.toString().padStart(2, '0')}`);
 }}
 >
 {min.toString().padStart(2, '0')}
 </div>
 );
 })}
 </div>

 {/* 绘制选中连线 (Minute) */}
 {(() => {
 const min = parseInt(selectedTime.split(':')[1], 10);
 const angle = (min / 60) * 360 - 90;
 const rad = 130;
 const x = Math.cos(angle * Math.PI / 180) * rad;
 const y = Math.sin(angle * Math.PI / 180) * rad;
 const distance = Math.sqrt(x*x + y*y);
 const rotation = angle;

 return (
 <div 
 className={`absolute top-1/2 left-1/2 h-[2px] ${isLight ? "bg-[#8B7355]" : "bg-[#FDF5E6]"} origin-left z-10 pointer-events-none`}
 style={{ 
 width: `${distance}px`, 
 transform: `translate(0, -50%) rotate(${rotation}deg)`
 }}
 />
 );
 })()}
 </>
 )}
 </div>
 </div>
 )}
 
 {/* ===================== 新增：内嵌底部操作舱 ===================== */}
 </section>
 
 {/* 内嵌底部操作舱 - 悬浮极简版 */}
 <div className={cn(
 "absolute bottom-0 left-0 right-0 w-full p-6 flex flex-wrap justify-center items-center gap-4 z-50 pointer-events-auto ",
 isAIPending ? "opacity-0 pointer-events-none" : "opacity-100"
 )}>
 {isReadOnly ? (
 <div className={cn("w-full md:w-64 py-3 text-center rounded-xl text-[11px] uppercase tracking-widest", isLight ? "bg-black/5 text-black" : "bg-white/5 text-white")}>
 只读模式 / READ ONLY
 </div>
 ) : (
 <>
 {editingBooking && (
 <button 
 onClick={handleMarkAsNoShow}
 className={cn(
 "flex-1 md:flex-none md:w-32 min-w-[100px] py-3.5 bg-transparent text-[12px] uppercase tracking-[0.3em] outline-none",
 isLight ? " " : " "
 )}
 >
 爽 约
 </button>
 )}
 <button 
 onClick={handleConfirmBooking}
 disabled={selectedServices.length === 0}
 className={cn(
 "flex-1 md:flex-none md:w-56 min-w-[120px] py-3.5 text-[12px] tracking-[0.3em] uppercase outline-none bg-transparent",
 selectedServices.length > 0 
 ? (isLight 
 ? " " 
 : " ")
 : (isLight 
 ? "text-black cursor-not-allowed" 
 : "text-white cursor-not-allowed")
 )}
 >
 {editingBooking ? "更 新 预 约" : "确 认 预 约"}
 </button>
 </>
 )}
 </div>
 </main>

 {/* Global styles for custom scrollbar */}
 <style dangerouslySetInnerHTML={{__html: `
 .custom-scrollbar::-webkit-scrollbar {
 width: 4px;
 height: 0px; /* Hide horizontal scrollbar */
 }
 .custom-scrollbar::-webkit-scrollbar-track {
 background: ${isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)'};
 border-radius: 4px;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb {
 background: ${isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
 border-radius: 4px;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
 background: rgba(6, 182, 212, 0.5);
 }
 `}} />
 </div>
 )}
 </div>
 </div>
 )}
 </>
 );
}
