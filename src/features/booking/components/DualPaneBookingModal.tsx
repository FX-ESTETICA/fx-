"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, User, X, ArrowLeft } from 'lucide-react';
import Image from "next/image";
import { cn } from "@/utils/cn";
import { BookingService } from "@/features/booking/api/booking";
import { useShop } from "@/features/shop/ShopContext";
import { useTranslations } from "next-intl";

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

type ReflowBooking = BookingEdit & {
  date: string;
  startTime: string;
  duration: number;
  resourceId?: string | null;
  originalUnassigned?: boolean;
  shopId?: string;
};

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
  const [isAM, setIsAM] = useState(() => {
    const hour = parseInt((editingBooking?.startTime || initialTime || "").split(':')[0], 10);
    return Number.isNaN(hour) ? true : hour < 12;
  });
  const [draggingHour, setDraggingHour] = useState<number | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [centerDragStart, setCenterDragStart] = useState<number | null>(null);
  const phoneMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const updateSelectedTime = (time: string) => {
    setSelectedTime(time);
    const hour = parseInt(time.split(':')[0], 10);
    if (!Number.isNaN(hour)) {
      setIsAM(hour < 12);
    }
  };

  const scheduleProfileMatch = (phone: string) => {
    if (phoneMatchTimerRef.current) {
      clearTimeout(phoneMatchTimerRef.current);
    }
    if (!phone || phone.length < 6) {
      setMatchedProfile(null);
      return;
    }
    phoneMatchTimerRef.current = setTimeout(async () => {
      const { data } = await BookingService.getProfileByPhone(phone);
      setMatchedProfile(data);
    }, 500);
  };

  const updatePhoneTracks = (nextTracks: string[]) => {
    setPhoneTracks(nextTracks);
    scheduleProfileMatch(nextTracks[0]?.trim() || "");
  };

  const customerId = useMemo(() => {
    if (editingBooking?.customerId) return editingBooking.customerId;
    const primaryPhone = phoneTracks[0]?.trim();
    if (primaryPhone && primaryPhone.length >= 6) {
      if (primaryPhone === "6667767" || primaryPhone === "3758376") {
        return "GV 0015";
      }
    }
    return allocatedId || `${newCustomerType || 'CO'} --`;
  }, [editingBooking?.customerId, phoneTracks, allocatedId, newCustomerType]);

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

    // 检查当前订单是否已经是已结账状态
    const isAlreadyCompleted = useMemo(() => {
      const statusStr = (editingBooking?.status as string | undefined)?.toUpperCase();
      return statusStr === 'COMPLETED' || statusStr === 'CHECKED_OUT';
    }, [editingBooking]);

  const isCheckoutReady = selectedPaymentMethod !== null || isAlreadyCompleted;

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
  //   // 这里可以加入更复杂的结账存盘逻辑，目前仅演示关闭
  //   alert('结账成功！');
  //   onClose();
  // };

  // --- 核心业务逻辑：标记爽约 (NO SHOW) ---
  const handleMarkAsNoShow = async () => {
    if (!editingBooking) return;
    
    // 去真实数据库请求一个新的 NO 编号（自带断层扫描与锁定）
    const newNoId = await BookingService.getAvailableCustomerId(activeShopId || 'default', 'NO');
    
    try {
      const updatedBookings = [{
        ...editingBooking,
        date: editingBooking.date || selectedDate.replace(/\//g, '-'),
        startTime: editingBooking.startTime || "00:00",
        duration: editingBooking.duration || 60,
        customerId: newNoId, // 临时替换为 NO 显示
        status: 'no_show',
        resourceId: 'NO', // 可以将其移动到“爽约”列，如果存在的话
      }];
      
      await BookingService.upsertBookings(updatedBookings);
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
    const customerName = phoneTracks.filter(t => t.trim() !== "").join(',') || "散客 Walk-in";
    const baseDate = selectedDate.replace(/\//g, '-'); // 确保格式为 YYYY-MM-DD 以便解析
    
    // 如果编辑的是连单，复用其 masterOrderId；否则生成新的
    const masterOrderId = editingBooking?.masterOrderId || `ORD-${Date.now()}`;

    // --- 消耗/更新客户编号 (Consume Customer ID) ---
    // 真正的计数器和 ID 生成交由 Supabase 后端序列处理，本地无需再手动管理
    // 断层扫描分配器已保证 `customerId` 完美填坑


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
        customerId: customerId, // 【核心】：注入智能编号
        customerName: customerName,
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
      const { data: bookingsData } = await BookingService.getBookings(currentShopId);
      let allBookings: ReflowBooking[] = (bookingsData as ReflowBooking[]) || [];
      
      // 1. 如果是编辑模式，先从现存列表中移除这笔被编辑的旧订单
      // 【绝对焦点编辑】：只移除当前这个独立订单，不再连坐移除其他 relatedBookings
      if (editingBooking) {
        allBookings = allBookings.filter((b) => b.id !== editingBooking.id);
      }

      // 2. 将当前操作产生的新订单加入全量列表
      allBookings = [...allBookings, ...newBookings.map(b => ({
        ...b,
        date: b.date || baseDate, // 确保 date 存在
        startTime: b.startTime || "00:00", // 确保 startTime 存在
        duration: b.duration || 60, // 确保 duration 存在
      })) as ReflowBooking[]];

      // 3. 过滤出今天的订单进行重排，非今天的订单保持不动
      const todayBookings = allBookings.filter((b) => b.date === baseDate);
      
      // 【关键修复】：为了让新生成的子单 (newBookings) 能被后面的逻辑正确识别并最终落入 finalUpdatedBookings，
      // 我们必须记录下它们在 allBookings 里的原始状态 (此时它们还没有被赋予 resourceId，即 resourceId 为 undefined)。
      // 后面的 originalStateMap 必须包含这些新订单！
      const originalStateMap = new Map(todayBookings.map(b => [b.id, {
        resourceId: b.resourceId,
        startTime: b.startTime
      }]));

      // 将时间字符串(HH:MM)转化为当天的绝对分钟数，用于碰撞检测
      const timeToMinutes = (timeStr: string) => {
        const [h, m] = (timeStr || "00:00").split(':').map(Number);
        return h * 60 + m;
      };

      // 4. 剥离并分类：指定预约（含NO）、无指定预约
      const assignedBookings: ReflowBooking[] = [];
      const unassignedBookings: ReflowBooking[] = [];

      todayBookings.forEach((b) => {
        // 如果它是无指定预约，且不是已经被锁定在爽约列的 NO
        if (b.originalUnassigned && b.resourceId !== 'NO') {
          // 【核心修复】：必须清空它之前的坑位记忆，让它变成纯粹的“无家可归”状态
          // 否则它会携带着旧的 resourceId 参与碰撞检测，导致死锁或自我挤压
          b.resourceId = undefined;
          unassignedBookings.push(b);
        } else {
          // 真正的指定预约（拥有绝对路权）
          assignedBookings.push(b);
        }
      });

      // 5. 对无指定预约进行时间排序（先到先得），保证寻位稳定性
      unassignedBookings.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      // 6. 核心重排：从左到右依次为无指定预约寻找第一个无冲突的列
      // 这里的已落位列表初始为所有“指定预约”
      const placedBookings = [...assignedBookings];

      unassignedBookings.forEach(unassignedBkg => {
        const newStartMin = timeToMinutes(unassignedBkg.startTime);
        const newEndMin = newStartMin + unassignedBkg.duration;
        let foundStaffId = null;

        // 严格从左到右扫描实体员工列
        for (const staff of staffs) {
          const hasConflict = placedBookings.some(placed => {
            if (placed.resourceId !== staff.id) return false;
            // 如果 shopId 不同，则不会产生物理碰撞 (虽然通常在一个日历视图下都是同 shopId)
            if (placed.shopId && unassignedBkg.shopId && placed.shopId !== unassignedBkg.shopId) return false;

            const pStartMin = timeToMinutes(placed.startTime);
            const pEndMin = pStartMin + placed.duration;
            // 绝对碰撞检测
            return Math.max(newStartMin, pStartMin) < Math.min(newEndMin, pEndMin);
          });

          if (!hasConflict) {
            foundStaffId = staff.id;
            break; // 找到即落位
          }
        }

        // 如果找到空位则落位，否则兜底放到第一个员工（允许视觉挤压）
        unassignedBkg.resourceId = foundStaffId || (staffs.length > 0 ? staffs[0].id : undefined);
        
        // 落位后，加入 placedBookings 参与后续无指定预约的碰撞检测
        placedBookings.push(unassignedBkg);
      });

      // 7. 【世界顶端架构：精准手术级保存】
      // 绝不全量陪绑！只从 placedBookings 中挑出真正发生物理改变的订单：
      // A. 本次新建或编辑的订单 (newBookingIds)
      // B. 因为避让而重新分配了座位的旧“无指定”订单 (所有 unassignedBookings 在这一轮都被重新计算了位置，只有前后位置不同才需要保存)
      const newBookingIds = new Set(newBookings.map(b => b.id));
      
      // 我们需要比对之前的状态，或者最安全的做法是：只保存新订单，以及 resourceId 被改变的旧订单。
      // 为了安全起见，所有在这一轮被我们“重排”的无指定订单 (unassignedBookings)，如果在云端的 resourceId 和计算出来的不同，才保存。
      // 最暴力的安全过滤：只提取 newBookingIds 和所有 unassignedBookings (因为它们刚刚被重新赋予了 foundStaffId)
      const oldUnassignedIds = new Set(
        unassignedBookings.map(b => b.id).filter(id => id && !newBookingIds.has(id))
      );

      // 【终极排爆过滤】：不要把今天所有的订单都保存进去！
      // 只有那些 真正发生了变化 的订单才允许放行
      // 我们在第 600 行已经创建了包含所有 (含新单和旧单) 的 originalStateMap

      const finalUpdatedBookings = placedBookings
        .filter(b => {
          if (!b.id) return false;
          
          // 获取订单重排前的初始状态
          const originalState = originalStateMap.get(b.id);
          
          // 如果找不到原始状态，或者是新创建的单子，绝对放行
          if (!originalState || newBookingIds.has(b.id)) return true;

          // 比对它最终的 resourceId 或 startTime 是否和进入重排算法前发生了改变
          const resourceChanged = b.resourceId !== originalState.resourceId;
          const timeChanged = b.startTime !== originalState.startTime;
          
          return resourceChanged || timeChanged;
        })
        .map((booking) => ({
          ...booking,
          resourceId: booking.resourceId ?? null // 【关键修复】：Supabase 需要 null 而不是 undefined 才能清空外键/字段
        }));
      
      // 如果原订单被拆分产生新ID，需要从数据库物理抹除旧ID
      if (editingBooking && editingBooking.id && !newBookingIds.has(editingBooking.id)) {
         await BookingService.deleteBookings([editingBooking.id as string]);
      }

      // 异步保存到 Supabase (只更新那几条，彻底消灭全量更新导致的 WebSocket 风暴)
      const payload: BookingUpsertInput[] = finalUpdatedBookings.map(b => ({
        ...b,
        date: b.date || baseDate, // 确保有默认值，因为 BookingUpsertInput 要求 date 必须是 string
        startTime: b.startTime || "00:00"
      })) as BookingUpsertInput[];
      await BookingService.upsertBookings(payload);
      
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
          className="fixed inset-0 z-[100] flex items-center justify-center font-sans text-white touch-none pointer-events-none"
        >
          {/* 背景暗场遮罩 (仅在结账模式下保留强力遮罩防止误触，常规开单模式下保留微弱暗场防止视觉穿透) */}
          {/* 【硬派商业系统法则】：彻底移除 onClick={handleClose} 属性，防止幽灵点击闪退及防止店长误触导致填单数据丢失 */}
          <div 
            className={cn("absolute inset-0 pointer-events-auto transition-colors duration-200", isCheckoutMode ? "bg-black/95 backdrop-blur-3xl" : "bg-black/20 backdrop-blur-sm")}
          />

          {isCheckoutMode ? (
            /* ===================== Neon Core 结账舱 ===================== */
            <div 
              key="checkout-pane"
              className="relative z-10 w-full max-w-[800px] h-auto flex flex-col justify-between p-6 border border-[#39FF14]/30 rounded-2xl shadow-[0_0_50px_rgba(57,255,20,0.15)] bg-black/60 touch-pan-y pointer-events-auto"
            >
              {/* 顶角关闭 / 返回按钮 */}
              {!isAlreadyCompleted && (
                <button 
                  onClick={() => setCheckoutOverride(false)} 
                  className="absolute top-4 left-4 text-white/40 hover:text-[#39FF14] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={handleClose} 
                className="absolute top-4 right-4 text-white/40 hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Top Anchor: VIP 身份图腾 */}
              <div className="mt-2 mb-4 flex flex-col items-center text-center space-y-1">
                <span className="text-[#39FF14]/50 text-[10px] font-mono uppercase tracking-widest">Target Entity</span>
                <h1 className={cn(
                  "text-4xl md:text-5xl font-black font-mono tracking-[0.2em] uppercase",
                  customerId.startsWith('CO') 
                    ? "text-white/60" 
                    : "bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]"
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
                        // 修复价格累加 bug：由于我们之前改成了按组遍历，这里的 idx 是组内索引！
                        // 而在旧版本（或者计算总价时），idx 是全局索引。
                        // 为了让沙盒模拟价格和总价对得上，我们需要在 `selectedServices` 中找到它的全局真实索引，或者干脆统一价格逻辑。
                        const mockPrice = (Array.isArray(service.prices) && service.prices.length > 0 ? service.prices[0] : 0) as number;
                        
                        return (
                          <div key={service.id || idx} className="flex items-center w-full gap-6">
                            {/* 员工签名栏：仅在该员工的第一个项目显示，后续项目留白以维持网格对齐 */}
                            <div className="w-24 shrink-0 text-left">
                              {idx === 0 ? (
                                <span className="text-lg font-bold tracking-widest text-white/80 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] uppercase">
                                  {staffName as React.ReactNode}
                                </span>
                              ) : (
                                <span className="text-lg font-bold tracking-widest text-transparent uppercase select-none">
                                  {staffName as React.ReactNode}
                                </span>
                              )}
                            </div>
                            
                            {/* 高对比度项目名称 */}
                            <span className="text-white font-bold text-lg tracking-wider shrink-0 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                              {service.name as React.ReactNode}
                            </span>
                            
                            {/* 动态赛博引线 (Leader) */}
                            <div className="flex-1 h-px border-b border-dashed border-white/20 opacity-60 mx-2" />
                            
                            {/* 价格 */}
                            <span className="text-white font-bold text-lg tracking-wider shrink-0">
                              ¥ {mockPrice}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {/* 如果有自定义备注，作为附加流显示 */}
                {customServiceText && (
                  <div className="flex items-center w-full gap-6 opacity-50 mt-2">
                    <div className="w-24 shrink-0 text-left">
                      <span className="text-sm font-mono tracking-widest text-white/40 uppercase">
                        [EXT]
                      </span>
                    </div>
                    <span className="text-white/80 font-bold text-lg tracking-widest shrink-0">
                      {customServiceText as string}
                    </span>
                    <div className="flex-1 h-px border-b border-dashed border-white/10 mx-2" />
                    <span className="text-white/50 font-bold text-lg tracking-wider shrink-0">
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
                          "text-[10px] font-mono tracking-widest px-4 py-1.5 rounded transition-all whitespace-nowrap",
                          isAlreadyCompleted
                            ? "bg-transparent text-white/10 border border-white/5 cursor-not-allowed opacity-50"
                            : isSelected 
                              ? "bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.3)] scale-105" 
                              : isVipMethod && canUseVip
                                ? "bg-white/5 text-yellow-400/80 border border-yellow-400/30 hover:border-yellow-400/60"
                                : isVipMethod && !canUseVip
                                  ? "bg-transparent text-white/10 border border-white/5 cursor-not-allowed"
                                  : "bg-transparent text-white/40 border border-white/10 hover:border-white/30 hover:text-white/80"
                        )}
                      >
                        [{method}]
                      </button>
                    );
                  })}
                </div>
                
                <div className="text-[10px] text-[#39FF14]/50 tracking-[0.3em] uppercase mb-1">Total Amount</div>
                <div className={cn(
                  "text-5xl font-black tabular-nums transition-all duration-500 tracking-tighter mb-4",
                  isAlreadyCompleted
                    ? "text-[#39FF14] drop-shadow-[0_0_10px_rgba(57,255,20,0.3)]" // 已结账：静谧稳定绿
                    : checkoutSlideProgress === 100 
                      ? "text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)] scale-110" 
                      : "text-[#39FF14] drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]"
                )}>
                  ¥ {checkoutAllServices.reduce((sum, s) => {
                    const unit = Array.isArray(s.prices) && s.prices.length > 0 ? s.prices[0] : 0;
                    return sum + unit;
                  }, 0)}.00
                </div>

                {/* 赛博光轨滑动锁 (Cyber-Slider) */}
                <div className="w-full max-w-[400px] h-12 relative rounded-full overflow-hidden border bg-black/40"
                  style={{
                    borderColor: isCheckoutReady || isAlreadyCompleted ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  {/* 背景进度填充 */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#39FF14]/20 transition-none"
                    style={{ width: `${checkoutSlideProgress}%` }}
                  />

                  {/* 引导文字 */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className={cn(
                      "text-[10px] font-mono tracking-widest uppercase transition-all duration-300",
                      isAlreadyCompleted
                        ? "text-[#39FF14] font-bold tracking-[0.4em] drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]"
                        : isCheckoutReady 
                          ? "text-[#39FF14]/80" // 移除呼吸灯特效 
                          : "text-white/20",
                      !isAlreadyCompleted && checkoutSlideProgress > 20 && "opacity-0"
                    )}>
                      {isAlreadyCompleted ? "/// PAYMENT VERIFIED ///" : isCheckoutReady ? ">>> SLIDE TO PAY >>>" : "[ 请先选择支付方式 ]"}
                    </span>
                  </div>

                  {/* 物理滑块 */}
                  {!isAlreadyCompleted && (
                    <div 
                      className={cn(
                        "absolute top-1 bottom-1 w-12 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center z-10 transition-colors",
                        isCheckoutReady 
                          ? "bg-[#39FF14] shadow-[0_0_15px_rgba(57,255,20,0.8)]" 
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
  
                                const updatedBookings = bookingsToCheckout.map(b => ({
                                ...b,
                                status: 'COMPLETED', // 核心：状态必须大写 COMPLETED 以触发底层矩阵透明化
                                paymentMethod: selectedPaymentMethod || '现金', // 物理打通：写入支付印记
                                // 注意：我们不能随意修改 b.date 和 b.startTime，因为那是其他子订单的时间。
                                // 所以只更新 status。
                                date: b.date || selectedDate.replace(/\//g, '-'), // 必须提供默认值以满足类型
                                  startTime: b.startTime || "00:00", // 必须提供默认值以满足类型
                                  resourceId: b.resourceId === null ? undefined : b.resourceId, // 修复 TS 类型：null 转换为 undefined
                                }));
                                
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
                      className="text-red-500 hover:text-red-400 font-black tracking-widest text-3xl md:text-4xl drop-shadow-[0_0_20px_rgba(239,68,68,1)] transition-all hover:scale-110 hover:-translate-y-2 uppercase"
                    >
                      {t('txt_7173f8')}</button>
                    <button 
                      onClick={() => setIsAIPending(false)}
                      className="text-[#39FF14] hover:text-green-400 font-black tracking-widest text-3xl md:text-4xl drop-shadow-[0_0_20px_rgba(57,255,20,1)] transition-all hover:scale-110 hover:-translate-y-2 uppercase"
                    >
                      {t('txt_e61f2c')}</button>
                  </div>
                </div>
              )}

              {/* 核心双窗容器 (Glassmorphism + Neon Border) - 增加微弱暗色托底防止文字与背景重叠光度吞噬 */}
              <main className={cn(
                "w-full h-[80vh] md:h-[450px] flex flex-col md:flex-row rounded-2xl overflow-hidden relative group border shadow-[0_0_30px_rgba(0,240,255,0.2)] bg-black/40 pointer-events-auto backdrop-blur-xl transition-all duration-300",
                isAIPending ? "border-white/20 opacity-60 grayscale-[0.2]" : "border-gx-cyan/50"
              )}>
                {/* 右上角关闭按钮 */}
                <button 
                  onClick={handleClose} 
                  className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-full backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* ===================== 左侧/顶部：控制台面板 ===================== */}
                <section 
                  className="w-full md:w-[50%] h-[50%] md:h-full p-5 md:pb-16 flex flex-col gap-4 relative z-10 border-b md:border-b-0 border-white/10 shrink-0"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                
                {/* 表单录入区 */}
                <div className="flex flex-col gap-4 mt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">{t('txt_ef3505')}</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 min-h-[48px] flex items-center cursor-text transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] overflow-hidden",
                        activePaneMode === 'service' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
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
                          <span className="text-[11px] text-white/20 absolute pointer-events-none ml-1">{t('txt_1809c0')}</span>
                        )}
                        {selectedServices.map((s, index) => {
                          const staff = staffs.find(st => st.id === s.assignedEmployeeId);
                          const textColor = staff ? staff.color : '#ffffff'; // 未指定时字体为亮白色
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
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all shrink-0 group relative overflow-hidden",
                                isRetargeting 
                                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" 
                                  : "bg-white/5 border-white/10 hover:bg-white/10"
                              )}
                              title={t('txt_d0dea7')}
                            >
                               {/* 左侧颜色指示条 */}
                               <div 
                                  className="absolute left-0 top-0 bottom-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity"
                                  style={{ backgroundColor: textColor as string }}
                               />
                              <span 
                                className="text-[12px] font-bold tracking-wide transition-colors ml-1"
                                style={!isRetargeting ? { 
                                  color: textColor as string,
                                  textShadow: staff ? `0 0 8px ${textColor as string}40` : 'none'
                                } : {}}
                              >
                                {s.name as React.ReactNode}
                              </span>
                              
                              {/* 删除按钮 */}
                              <div 
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500/20 rounded-full text-white/40 hover:text-red-400"
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
                          value={customServiceText as string}
                          onChange={(e) => setCustomServiceText(e.target.value)}
                          className="bg-transparent border-none outline-none text-[12px] text-white font-bold flex-1 min-w-[60px] p-0 m-0 leading-tight placeholder:text-transparent shrink-0 ml-1"
                          placeholder={selectedServices.length > 0 ? "" : " "}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">{t('txt_32fd76')}</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 min-h-[48px] flex items-center gap-2 cursor-text transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] relative group",
                        activePaneMode === 'member' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => {
                        setActivePaneMode('member');
                        setIsMemberInputFocused(true); // 点击整个区域时触发输入模式
                      }}
                    >
                      <User className={cn("w-3 h-3 shrink-0", activePaneMode === 'member' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                      
                      {/* 终极极简交互：如果处于非输入状态，且有 phoneTracks[0] 则说明有记录，如果为空则显示 placeholder */}
                      {!isMemberInputFocused && phoneTracks[0] ? (
                        <div className="flex-1 truncate flex items-center justify-start pl-2">
                          <span className={cn(
                            "text-[11px] font-bold font-mono tracking-widest leading-none -translate-y-[1px]",
                            phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376" || matchedProfile ? "text-gx-cyan" : "text-white/80"
                          )}>
                            {matchedProfile?.name || phoneTracks[0]}
                          </span>
                        </div>
                      ) : (
                        /* 输入模式或无输入记录时显示输入框 */
                        <div className="flex-1 w-full h-full flex items-center justify-start pl-2">
                          <input 
                            type="text" 
                            placeholder={t('txt_9be070')} 
                            className="bg-transparent border-none outline-none text-[11px] w-full placeholder:text-white/20 text-white font-bold truncate leading-none -translate-y-[1px] text-left"
                            value={phoneTracks[0] || ""}
                            onChange={(e) => {
                              const newTracks = [...phoneTracks];
                              newTracks[0] = e.target.value;
                              updatePhoneTracks(newTracks);
                              if (activePaneMode !== 'member') setActivePaneMode('member');
                            }}
                            onBlur={() => setIsMemberInputFocused(false)} // 失去焦点瞬间坍缩
                            autoFocus={isMemberInputFocused} // 被唤醒时自动聚焦
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 预约时空仪表盘 (Unified Time/Date Dashboard) */}
                <div className="mt-2 space-y-1.5">
                  <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">{t('txt_5b32fe')}</label>
                  <div className="bg-black/40 border border-white/10 rounded-xl p-1.5 flex flex-col gap-1 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    {/* 上半部分：日期与时间 (并排) */}
                    <div className="flex gap-1">
                      {/* 预约日期触发器 */}
                      <button
                        onClick={() => setActivePaneMode('date')}
                        className={cn(
                          "flex-1 flex flex-col items-start justify-center p-3 rounded-lg transition-all border group",
                          activePaneMode === 'date' 
                            ? "bg-gx-cyan/10 border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CalendarIcon className={cn("w-3.5 h-3.5", activePaneMode === 'date' ? "text-gx-cyan" : "text-white/40 group-hover:text-white/60")} />
                          <span className="text-[9px] text-white/40 font-mono tracking-widest uppercase">{t('txt_4ff1e7')}</span>
                        </div>
                        <span className={cn(
                          "text-sm font-bold font-mono tracking-wider",
                          activePaneMode === 'date' ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/80"
                        )}>
                          {selectedDate.replace(/\//g, '.')}
                        </span>
                      </button>

                      {/* 开始时间触发器 */}
                      <button
                        onClick={() => setActivePaneMode('time')}
                        className={cn(
                          "flex-1 flex flex-col items-start justify-center p-3 rounded-lg transition-all border group",
                          activePaneMode === 'time' 
                            ? "bg-gx-cyan/10 border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className={cn("w-3.5 h-3.5", activePaneMode === 'time' ? "text-gx-cyan" : "text-white/40 group-hover:text-white/60")} />
                          <span className="text-[9px] text-white/40 font-mono tracking-widest uppercase">{t('txt_19fcb9')}</span>
                        </div>
                        <span className={cn(
                          "text-sm font-bold font-mono tracking-wider",
                          activePaneMode === 'time' ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/80"
                        )}>
                          {selectedTime}
                        </span>
                      </button>
                    </div>

                    {/* 下半部分：时长与结束时间推算 (并排) */}
                    <div className="flex gap-1">
                      {/* 服务时长触发器 */}
                      <button
                        onClick={() => setActivePaneMode('duration')}
                        className={cn(
                          "flex-1 flex items-center justify-between p-3 rounded-lg transition-all border group",
                          activePaneMode === 'duration' 
                            ? "bg-gx-cyan/10 border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                            : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                      >
                        <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">{t('txt_5bdfd7')}</span>
                        <span className={cn(
                          "text-xs font-bold font-mono",
                          durationOffset !== 0 ? "text-gx-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" : "text-white/80"
                        )}>
                          {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                        </span>
                      </button>

                      {/* 结束时间 (只读展示) */}
                      <div className="flex-1 flex items-center justify-between p-3 rounded-lg bg-black/40 border border-transparent">
                        <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase">{t('txt_946010')}</span>
                        <span className="text-xs font-bold font-mono text-white/40">
                          {getEndTime()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ===================== 右侧/底部：动态监视器区 ===================== */}
              <section 
                className="flex-1 h-[50%] md:h-full p-4 md:p-6 relative z-10 overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {activePaneMode === 'service' && (
                  // 服务项目选择矩阵与人员分配
                  <div className="h-full flex flex-col overflow-hidden relative">
                    {/* 分类标签导航 */}
                    <div className="flex gap-[20px] border-b border-white/10 pb-3 mb-4 overflow-x-auto no-scrollbar shrink-0 sticky top-0 z-10 pointer-events-none">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "text-[15px] font-mono whitespace-nowrap transition-colors uppercase tracking-widest pointer-events-auto",
                            activeCategory === cat.id ? "text-gx-cyan font-bold" : "text-white/40 hover:text-white/80"
                          )}
                        >
                          {(cat.name || '').replace(/^[^\w\u4e00-\u9fa5]+/, '').trim()}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <span className="text-[10px] text-white/30 font-mono">{t('txt_0552d7')}</span>
                      )}
                    </div>

                    {/* Pro Studio 工作台布局：左侧画笔槽 + 右侧画布 */}
                    <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
                      {/* 左侧垂直画笔槽 (极致压缩版竖列胶囊) */}
                      <div className="w-[80px] shrink-0 flex flex-col gap-1.5 overflow-y-auto no-scrollbar border-r border-white/5 pr-2 pb-10">
                        {/* 无指定 (断电态) */}
                        <button
                          onClick={() => handleSetBrush(null)}
                          className={cn(
                            "flex items-center justify-start gap-2 p-2 rounded-lg transition-all border shrink-0 h-[36px]",
                            currentBrushEmployeeId === null
                              ? "bg-gx-cyan/10 border-gx-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                              : "bg-white/5 border-transparent hover:bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0 transition-all",
                            currentBrushEmployeeId === null ? "bg-gx-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]" : "border border-white/20"
                          )} />
                          <span className={cn(
                            "text-[11px] font-mono font-bold tracking-wider uppercase text-left truncate",
                            currentBrushEmployeeId === null ? "text-gx-cyan" : "text-white/40"
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
                                "flex items-center justify-start gap-2 p-2 rounded-lg transition-all border shrink-0 h-[36px]",
                                isAssigned
                                  ? "bg-white/10 shadow-lg"
                                  : "bg-transparent border-transparent hover:bg-white/5"
                              )}
                              style={isAssigned ? { borderColor: staff.color, boxShadow: `0 0 10px ${staff.color}30` } : {}}
                            >
                              <div 
                                className={cn(
                                  "w-2 h-2 rounded-full shrink-0 transition-all",
                                  isAssigned ? "scale-125" : ""
                                )}
                                style={{ 
                                  backgroundColor: staff.color,
                                  boxShadow: isAssigned ? `0 0 8px ${staff.color}` : 'none'
                                }}
                              />
                              <span className={cn(
                                "text-[11px] font-mono font-bold tracking-wider uppercase text-left truncate",
                                isAssigned ? "text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" : "text-white/50"
                              )}>
                                {staff.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* 右侧服务项目矩阵画布 */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        <div className="grid grid-cols-2 gap-3 pr-2 content-start">
                          {services
                            .filter(s => s.categoryId === activeCategory)
                            .map(service => {
                              const isSelected = selectedServices.some(s => s.id === service.id);
                              const selectedData = selectedServices.find(s => s.id === service.id);
                              const assignedStaff = selectedData ? staffs.find(st => st.id === selectedData.assignedEmployeeId) : null;
                              
                              // 灵魂注入材质：根据分配的员工颜色决定发光颜色
                              const glowColor = assignedStaff ? assignedStaff.color : 'rgba(0,240,255,0.8)'; // 未指定时默认青色发光
                              const glowStyle = isSelected ? {
                                borderColor: glowColor,
                                boxShadow: `0 0 20px ${glowColor}30`,
                                backgroundColor: `${glowColor}10`
                              } : {};

                              return (
                                <button
                                  key={service.id}
                                  onClick={() => handleToggleService(service)}
                                  className={cn(
                                    "p-3 rounded-xl border transition-none text-left flex flex-col justify-center h-[64px] group relative overflow-hidden",
                                    !isSelected && "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                                  )}
                                  style={glowStyle}
                                >
                                  {/* 赛博扫描线特效 (已移除，追求极致性能) */}
                                  
                                  <span className={cn(
                                    "text-xs font-bold line-clamp-2 leading-tight transition-none pr-3 z-10",
                                    isSelected ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/60 group-hover:text-white"
                                  )}>
                                    {service.name}
                                  </span>
                                </button>
                              );
                            })}
                          {services.filter(s => s.categoryId === activeCategory).length === 0 && categories.length > 0 && (
                            <div className="col-span-full text-center text-[10px] text-white/20 font-mono mt-10">
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
                    <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4 shrink-0 px-2">
                      <div className="flex items-center gap-4 w-[75%]">
                        {/* 左侧：全息圆形头像 (平台社交身份锚点) */}
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl transition-transform duration-500 relative border-2",
                            matchedProfile 
                              ? "bg-gradient-to-br from-gx-pink/20 to-gx-purple/20 border-gx-pink/60 shadow-[0_0_20px_rgba(255,0,234,0.3)]" // 已匹配 C 端用户
                              : (phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376")
                                ? "bg-gradient-to-br from-gx-pink/20 to-gx-purple/20 border-gx-pink/60 shadow-[0_0_20px_rgba(255,0,234,0.3)]"
                                : "bg-white/5 border-white/10" // 游离态散客
                          )}>
                            {matchedProfile?.avatar_url ? (
                              <Image
                                src={matchedProfile.avatar_url}
                                alt="avatar"
                                width={56}
                                height={56}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376") ? (
                              <Image
                                src="https://api.dicebear.com/7.x/avataaars/svg?seed=gx-vip"
                                alt="avatar"
                                width={56}
                                height={56}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white/20" />
                            )}
                            
                            {/* 匹配成功的光晕特效 */}
                            {(matchedProfile || phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376") && (
                              <div 
                                className="absolute inset-[-4px] rounded-full border border-dashed border-gx-pink/40 pointer-events-none animate-[spin_15s_linear_infinite]"
                              />
                            )}
                          </div>
                        </div>

                        {/* 中部：信息流与双轨 ID 矩阵 */}
                        <div className="flex flex-col gap-1 w-full">
                          {/* 上层：门店内部档案编号 (业务基石，绝不覆盖) */}
                          <div className="flex items-baseline gap-2">
                            <div className={cn(
                              "font-mono text-lg font-black tracking-[0.1em] shrink-0 leading-none",
                              customerId.startsWith('CO') 
                                ? "text-gx-cyan" // 散客冷峻单色
                                : "bg-gradient-to-r from-gx-cyan via-purple-400 to-pink-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]" // VIP 七彩流光
                            )}>
                              {formatDisplayId(customerId)}
                            </div>
                            {/* 客人名字/昵称 */}
                            <span className="text-sm font-bold text-white/80 truncate">
                              {matchedProfile?.name ? matchedProfile.name : (phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376") ? "赛博浪客 (备注: 王总)" : ""}
                            </span>
                          </div>

                          {/* 中层：平台社交信标与徽章 */}
                          {(matchedProfile || phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376") && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-gx-pink/10 border border-gx-pink/30 text-gx-pink">
                                {matchedProfile ? "已匹配 C 端" : "LV.4 先驱"}
                              </span>
                              <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">
                                ID: {matchedProfile?.gx_id || "GX-1024"}
                              </span>
                            </div>
                          )}
                          
                          {/* 下层：电话号码多轨流 */}
                          <div className="flex flex-col gap-0.5 mt-1">
                          {phoneTracks.map((phone, index) => (
                              <div key={index} className="flex items-center gap-2 group/phone">
                                {editingPhoneIndex === index ? (
                                  <input 
                                    type="text" 
                                    placeholder={t('txt_f3a023')} 
                                    className="bg-transparent border-b border-gx-cyan/50 outline-none text-sm font-mono text-white placeholder:text-white/20 w-32"
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
                                      "text-sm font-mono cursor-pointer hover:text-white transition-colors",
                                      customerId.startsWith('CO') 
                                        ? "text-white/60" 
                                        : "bg-gradient-to-r from-gx-cyan/80 to-purple-400/80 bg-clip-text text-transparent font-bold"
                                    )}
                                    onClick={() => setEditingPhoneIndex(index)}
                                  >
                                    {phone || "无电话记录"}
                                  </span>
                                )}
                                
                                {/* 动态增减按钮 */}
                                <div className="opacity-0 group-hover/phone:opacity-100 transition-opacity flex items-center gap-1">
                                  {index === phoneTracks.length - 1 && (
                                    <button 
                                      onClick={() => updatePhoneTracks([...phoneTracks, ''])}
                                      className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white hover:bg-white/10 transition-all text-xs"
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
                                      className="w-4 h-4 rounded-full border border-red-500/20 flex items-center justify-center text-red-500/60 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all text-xs"
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
                        <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest mb-1">Total Spent</span>
                        <span className="text-xl font-black text-white tracking-wider font-mono">
                          {phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376" ? "¥ 12,800" : "¥ 0"}
                        </span>
                      </div>
                    </div>

                    {/* 2. 中间：过往消费记录卡片 (可滚动区) / 散客游离态联系方式 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4 px-2">
                      {phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376" ? (
                        <>
                          <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] block mb-3">History Data Stream</span>
                          
                          {/* 历史卡片 1 (最新，带间隔天数) */}
                          <div className="relative group cursor-pointer">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-gx-cyan rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-gx-cyan/30 rounded-xl p-4 transition-all">
                              <div className="flex items-center gap-6 w-[60%]">
                                <span className="text-sm font-mono text-white/60 group-hover:text-white transition-colors">02.28</span>
                                <span className="text-sm font-bold text-white truncate">{t('txt_3c767c')}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-gx-cyan font-bold">¥ 880</span>
                                {/* 间隔天数提醒 */}
                                <span className="text-[10px] font-mono bg-gx-cyan/10 text-gx-cyan px-2 py-1 rounded border border-gx-cyan/20 whitespace-nowrap">
                                  {t('txt_0a7538')}</span>
                              </div>
                            </div>
                          </div>

                          {/* 历史卡片 2 (爽约记录) */}
                          <div className="relative group cursor-pointer">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-red-500/30 rounded-xl p-4 transition-all opacity-70 hover:opacity-100">
                              <div className="flex items-center gap-6 w-[60%]">
                                <span className="text-sm font-mono text-white/40">01.15</span>
                                <span className="text-sm font-bold text-white/40 line-through">{t('txt_93efd5')}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-white/20">--</span>
                                {/* 爽约印记 */}
                                <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-1 rounded border border-red-500/30 whitespace-nowrap uppercase tracking-widest">
                                  {t('txt_e49d53')}</span>
                              </div>
                            </div>
                          </div>

                          {/* 历史卡片 3 */}
                          <div className="relative group cursor-pointer">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all">
                              <div className="flex items-center gap-6 w-[60%]">
                                <span className="text-sm font-mono text-white/60">12.01</span>
                                <span className="text-sm font-bold text-white">{t('txt_93efd5')}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-white/80">¥ 120</span>
                                <span className="text-[10px] opacity-0 px-2 py-1">{t('txt_d4f32e')}</span> {/* 保持对齐 */}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center relative">
                          {/* 散客游离态 (输入了内容但未分配分类) */}
                          {phoneTracks[0] && !newCustomerType ? (
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-2">Temporary Contact</span>
                              <div className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.02] text-white/80 font-mono text-lg tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                                {phoneTracks[0]}
                              </div>
                              <span className="text-[9px] font-mono text-white/20 mt-2 max-w-[200px] text-center leading-relaxed">
                                Unregistered walk-in guest. Select a category below to archive as member.
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-white/20 uppercase tracking-widest">{t('txt_6700c4')}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. 底部：新客分类按钮 & 单行备注 */}
                    <div className="shrink-0 space-y-4 px-2">
                      {/* 分类选项 (仅在新客且未匹配到会员时显示) */}
                      {!matchedProfile && phoneTracks[0] !== "6667767" && phoneTracks[0] !== "3758376" && (
                        <div className="flex gap-3">
                          {['GV', 'AD', 'AN', 'UM'].map(type => (
                            <button 
                              key={type}
                              onClick={() => setNewCustomerType(type)}
                              className={cn(
                                "flex-1 py-2 rounded-lg border transition-all text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center",
                                newCustomerType === type 
                                  ? "bg-gx-cyan/20 border-gx-cyan text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]" 
                                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-gx-cyan/50 text-gx-cyan hover:text-white"
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
                          className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 resize-none h-8 leading-8 px-1 custom-scrollbar overflow-x-hidden whitespace-nowrap"
                          rows={1}
                          style={{ whiteSpace: 'nowrap' }} // 强制单行横向滚动
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-gx-cyan/50 via-white/10 to-transparent" />
                      </div>
                    </div>
                  </div>
                )}

                {activePaneMode === 'duration' && (
                  <div className="h-full flex flex-col items-center justify-center p-8 select-none touch-none relative">
                    {/* 全息视界区 (HUD Display) */}
                    <div className="flex flex-col items-center mb-6">
                      <span 
                        key={totalDuration}
                        className="text-[64px] font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/40 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] font-mono leading-none whitespace-nowrap"
                      >
                        {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                      </span>
                      
                      <div className="mt-4 flex items-center gap-4 text-[11px] font-mono tracking-widest text-white/60">
                        <span>BASE {baseDuration} MIN</span>
                        {durationOffset !== 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className={durationOffset > 0 ? "text-red-400" : "text-gx-cyan"}>
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
                      <div className="flex items-center gap-4 text-gx-cyan/40 group-hover:text-gx-cyan transition-colors">
                        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase">Drag to Adjust</span>
                        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="w-48 h-px bg-gradient-to-r from-transparent via-gx-cyan/30 to-transparent mt-3 group-hover:via-gx-cyan transition-all" />
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
                              "w-16 py-2 rounded-lg font-mono text-xs transition-all",
                              durationOffset === offset 
                                ? "bg-gx-cyan/10 text-gx-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
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
                              "w-16 py-2 rounded-lg font-mono text-xs transition-all",
                              durationOffset === offset 
                                ? "bg-gx-cyan/10 text-gx-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
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
                  <div className="h-full flex flex-col pt-2 pb-10 overflow-y-auto custom-scrollbar pr-2">
                    {/* Header: Month and Year with glowing text */}
                    <div className="flex items-center justify-between mb-6 px-4 shrink-0">
                      <button 
                        onClick={() => {
                          const newDate = new Date(calendarViewDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCalendarViewDate(newDate);
                        }}
                        className="text-white/40 hover:text-gx-cyan transition-colors px-2 py-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="text-lg font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50">
                        {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button 
                        onClick={() => {
                          const newDate = new Date(calendarViewDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCalendarViewDate(newDate);
                        }}
                        className="text-white/40 hover:text-gx-cyan transition-colors px-2 py-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>

                    {/* Matrix: Gridless approach */}
                    <div className="flex-1 px-2 shrink-0">
                      {/* Weekdays */}
                      <div className="grid grid-cols-7 mb-4">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                          <div key={day} className="text-center text-[10px] text-white/40 tracking-widest font-mono">
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
                                  "relative h-10 flex flex-col items-center justify-center font-mono text-sm transition-all rounded-lg group",
                                  isSelected 
                                    ? "text-gx-cyan border border-gx-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)] bg-gx-cyan/5" 
                                    : "text-white/90 hover:bg-white/5 border border-transparent"
                                )}
                              >
                                {formattedDay}
                                {/* Today pulse indicator */}
                                {isToday && !isSelected && (
                                  <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-gx-cyan animate-pulse shadow-[0_0_4px_rgba(0,255,255,0.8)]" />
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
                    className="h-full flex flex-col items-center justify-center relative select-none pt-4 pb-12 touch-none cursor-ew-resize"
                    onPointerDown={(e) => {
                      // 只有当没有点击小时时，才启动全局 AM/PM 滑动
                      if (draggingHour === null) {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setCenterDragStart(e.clientX);
                      }
                    }}
                    onPointerMove={(e) => {
                      // 处理全局横滑切换 AM/PM
                      if (centerDragStart !== null && draggingHour === null) {
                        const dx = e.clientX - centerDragStart;
                        const threshold = 40; // 稍微调大一点阈值，防止太灵敏
                        if (dx > threshold && isAM) {
                          setIsAM(false);
                          setCenterDragStart(e.clientX);
                        } else if (dx < -threshold && !isAM) {
                          setIsAM(true);
                          setCenterDragStart(e.clientX);
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
                    <div 
                      className="relative w-[360px] h-[360px] flex items-center justify-center group touch-none cursor-default"
                      onPointerMove={(e) => {
                        // 处理分钟的矢量拖拽 (D-Pad 逻辑)
                        if (draggingHour !== null && dragStartPos !== null) {
                          const dx = e.clientX - dragStartPos.x;
                          const dy = e.clientY - dragStartPos.y;
                          
                          // 设定一个触发阈值（死区），防止误触
                          const threshold = 15;
                          
                          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                            if (Math.abs(dx) > Math.abs(dy)) {
                              // 水平方向移动更多
                              setHoveredMinute(dx > 0 ? 15 : 45);
                            } else {
                              // 垂直方向移动更多
                              setHoveredMinute(dy > 0 ? 30 : 0);
                            }
                          } else {
                            // 在死区内，默认 00
                            setHoveredMinute(0);
                          }
                        }
                      }}
                      onPointerUp={() => {
                        if (draggingHour !== null) {
                          const min = hoveredMinute !== null ? hoveredMinute : 0;
                          updateSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                        }
                        setDraggingHour(null);
                        setHoveredMinute(null);
                        setDragStartPos(null);
                      }}
                      onPointerLeave={() => {
                        if (draggingHour !== null) {
                          const min = hoveredMinute !== null ? hoveredMinute : 0;
                          updateSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                        }
                        setDraggingHour(null);
                        setHoveredMinute(null);
                        setDragStartPos(null);
                      }}
                    >
                      {/* 外圈 (仅仅作为视觉水印，不参与交互) */}
                      <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none">
                        {[0, 15, 30, 45].map(min => {
                          const angle = (min / 60) * 360 - 90;
                          const rad = 180; // 从 150 放大到 180
                          const x = Math.cos(angle * Math.PI / 180) * rad;
                          const y = Math.sin(angle * Math.PI / 180) * rad;
                          const isHovered = hoveredMinute === min;
                          const isDragging = draggingHour !== null;

                          return (
                            <div
                              key={min}
                              className={cn(
                                "absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-300",
                                isDragging ? "opacity-100" : "opacity-20",
                                isHovered 
                                  ? "text-gx-cyan scale-110 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" 
                                  : "text-white/20"
                              )}
                              style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                            >
                              {min.toString().padStart(2, '0')}
                            </div>
                          );
                        })}
                      </div>

                      {/* 移除连线 SVG */}

                      {/* 内圈 C 型轨道背景 */}
                      <svg className="absolute inset-[40px] w-[280px] h-[280px] pointer-events-none z-0">
                        <path 
                          d="M 41 239 A 140 140 0 1 1 239 239" 
                          fill="none" 
                          stroke="rgba(255,255,255,0.05)" 
                          strokeWidth="2" 
                          strokeDasharray="4 4"
                        />
                      </svg>

                      {/* 内圈 (小时星轨 - The Hour Ring) */}
                      <div className="absolute inset-[40px] z-20">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const hr = isAM ? i : i + 12;
                          // C shape from 135 deg to 405 deg
                          const angle = 135 + i * (270 / 11);
                          const rad = 140; // 从 100 放大到 140
                          const x = Math.cos(angle * Math.PI / 180) * rad;
                          const y = Math.sin(angle * Math.PI / 180) * rad;
                          
                          const isSelectedHour = selectedTime.startsWith(hr.toString().padStart(2, '0'));
                          const isDraggingThis = draggingHour === hr;
                          
                          return (
                            <div
                              key={hr}
                              className={cn(
                                "absolute w-12 h-12 -ml-[24px] -mt-[24px] rounded-full flex items-center justify-center font-mono text-lg transition-all cursor-pointer font-bold",
                                isDraggingThis 
                                  ? "text-gx-cyan scale-125 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" 
                                  : isSelectedHour 
                                    ? "text-gx-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]" 
                                    : "text-white/90 hover:text-white hover:scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
                              )}
                              style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // 防止触发中心区域的滑动
                                // 必须捕获指针，否则在触摸屏上滑动过快可能会丢失目标
                                e.currentTarget.setPointerCapture(e.pointerId);
                                setDraggingHour(hr);
                                setHoveredMinute(0); // 默认 00
                                setDragStartPos({ x: e.clientX, y: e.clientY });
                              }}
                              onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                              }}
                              // 支持纯点击选择整点
                              onClick={() => {
                                if (draggingHour === null) {
                                  updateSelectedTime(`${hr.toString().padStart(2, '0')}:00`);
                                }
                              }}
                            >
                              {hr.toString().padStart(2, '0')}
                            </div>
                          );
                        })}
                      </div>

                      {/* 中心枢纽 (The Core) - 仅作展示 */}
                      <div 
                        className="absolute inset-[100px] rounded-full flex flex-col items-center justify-center z-10 pointer-events-none"
                      >
                        <span 
                          key={isAM ? 'AM' : 'PM'} // 利用 key 触发动画
                          className="text-[48px] font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-mono leading-none"
                        >
                          {draggingHour !== null 
                            ? `${draggingHour.toString().padStart(2, '0')}:${hoveredMinute !== null ? hoveredMinute.toString().padStart(2, '0') : '00'}`
                            : selectedTime
                          }
                        </span>
                        
                        {/* AM/PM 状态指示器 (纯展示，点击事件也可以保留作为后备) */}
                        <div className="mt-5 pointer-events-auto">
                          <button 
                            className="px-5 py-2 rounded-full bg-black/40 border border-gx-cyan/30 text-xs text-gx-cyan font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.1)] flex items-center gap-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAM(!isAM);
                            }}
                          >
                            <div className={cn("w-2 h-2 rounded-full transition-all", isAM ? "bg-gx-cyan shadow-[0_0_5px_rgba(0,255,255,0.8)] scale-125" : "bg-white/20")} />
                            <span className={cn("transition-all", isAM ? "text-gx-cyan" : "text-white/40")}>{t('txt_f8fbea')}</span>
                            <div className="w-0.5 h-3 bg-white/10" />
                            <span className={cn("transition-all", !isAM ? "text-gx-cyan" : "text-white/40")}>{t('txt_e2eb28')}</span>
                            <div className={cn("w-2 h-2 rounded-full transition-all", !isAM ? "bg-gx-cyan shadow-[0_0_5px_rgba(0,255,255,0.8)] scale-125" : "bg-white/20")} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 操作提示 */}
                    <div className="absolute bottom-6 text-[10px] font-mono tracking-[0.3em] transition-all duration-300 flex flex-col items-center gap-1">
                      {draggingHour !== null ? (
                        <span className="text-gx-cyan animate-pulse">{t('txt_81c636')}</span>
                      ) : (
                        <>
                          <span className="text-white/30">HOLD HOUR & SWIPE FOR MINUTES</span>
                          <span className="text-white/20 text-[8px]">SWIPE CENTER FOR AM/PM</span>
                        </>
                      )}
                    </div>
                  </div>
                  )}
                </section>
              </main>

            {/* 底部悬浮按钮栏 (内部居中跨越双窗) */}
            <div className={cn(
              "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-auto transition-opacity",
              isAIPending ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              {isReadOnly ? (
                <div className="w-64 py-3 text-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-[10px] uppercase tracking-widest">
                  只读模式 / READ ONLY
                </div>
              ) : (
                <>
                  {editingBooking && (
                    <button 
                      onClick={handleMarkAsNoShow}
                      className="w-32 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 hover:border-red-500 transition-all font-mono text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                      {t('txt_81c4b2')}</button>
                  )}
                  <button 
                    onClick={handleConfirmBooking}
                    disabled={selectedServices.length === 0}
                    className={cn(
                      "w-48 py-3 rounded-xl text-xs font-black tracking-widest transition-all",
                      selectedServices.length > 0 
                        ? "bg-gx-cyan text-black shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:bg-white" 
                        : "bg-black/60 border border-white/10 text-white/30 cursor-not-allowed"
                    )}
                  >
                    {editingBooking ? "更新预约" : "确认预约"}
                  </button>
                </>
              )}
              <button 
                onClick={handleClose}
                className="w-40 py-3 rounded-xl bg-black/60 border border-gx-cyan/30 text-white hover:border-gx-cyan transition-all font-mono text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              >
                {t('txt_8fc52a')}</button>
            </div>

            {/* Global styles for custom scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
                height: 0px; /* Hide horizontal scrollbar */
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(6, 182, 212, 0.5);
              }
            `}} />
          </div>
          )}
        </div>
      )}
    </>
  );
}
