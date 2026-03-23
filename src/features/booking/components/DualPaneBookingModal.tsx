"use client";

import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, X } from 'lucide-react';
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from 'framer-motion';

interface DualPaneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date; // 接收当前日历的日期
  initialTime?: string; // 接收战术准星传递的精确时间
  initialResourceId?: string; // 接收战术准星传递的员工ID
  editingBooking?: any; // 传入要编辑的预约数据
}

export function DualPaneBookingModal({ isOpen, onClose, initialDate, initialTime, initialResourceId, editingBooking }: DualPaneBookingModalProps) {
  // --- 状态机：右侧面板模式 ---
  type RightPaneMode = 'service' | 'member' | 'date' | 'time' | 'duration';
  const [activePaneMode, setActivePaneMode] = useState<RightPaneMode>('service');

  // --- 服务项目状态 (支持多选与印章涂色) ---
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  // 服务内容的自定义附加文本
  const [customServiceText, setCustomServiceText] = useState("");
  // 当前全局的“印章/笔刷”员工ID，null 代表未指定(默认印章)
  const [currentBrushEmployeeId, setCurrentBrushEmployeeId] = useState<string | null>(null); 
  // 当前处于“待重定向”状态的已选服务ID
  const [retargetingServiceId, setRetargetingServiceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // --- 人员配置数据 ---
  const [staffs, setStaffs] = useState<any[]>([]);

  // --- 会员信息状态 ---
  // 原 memberInfo 废弃，改为多轨电话数组
  const [phoneTracks, setPhoneTracks] = useState<string[]>(['']);
  // 当前正在编辑的电话索引，null 代表静默态
  const [editingPhoneIndex, setEditingPhoneIndex] = useState<number | null>(null);

  // 核心：客户ID (例如 CO 0000001, GV 0001)
  const [customerId, setCustomerId] = useState<string>("");
  // 核心：新建会员时的分类 (GV/AD/AN/UM)，null代表散客
  const [newCustomerType, setNewCustomerType] = useState<string | null>(null);
  
  // 新增：控制左侧会员信息栏是否处于“主动输入状态”
  const [isMemberInputFocused, setIsMemberInputFocused] = useState(false);

  // --- 日期与时间状态 ---
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // --- 服务时长微调状态 ---
  const [durationOffset, setDurationOffset] = useState<number>(0);

  // --- 双轨 HUD 时间选择器状态 ---
  const [isAM, setIsAM] = useState(true);
  const [draggingHour, setDraggingHour] = useState<number | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [centerDragStart, setCenterDragStart] = useState<number | null>(null);

  // 同步 AM/PM 状态
  useEffect(() => {
    const hour = parseInt(selectedTime.split(':')[0], 10);
    setIsAM(hour < 12);
  }, [selectedTime]);

  // 生成并分配下一个客户编号
  const generateCustomerNumber = (type: string | null) => {
    try {
      // 1. 获取回收站
      const recycledRaw = localStorage.getItem('gx_recycled_customer_ids');
      const recycledIds: string[] = recycledRaw ? JSON.parse(recycledRaw) : [];
      
      // 2. 如果是散客 (type === null) 且回收站有 CO 编号，优先回收使用
      if (type === null) {
        const recycledCO = recycledIds.find(id => id.startsWith('CO'));
        if (recycledCO) {
          // 仅返回号码，暂时不从回收站删除，直到真正 confirm 预约时才正式消耗
          return recycledCO;
        }
      }
      
      // 3. 正常递增逻辑
      const countersRaw = localStorage.getItem('gx_customer_counters');
      const counters = countersRaw ? JSON.parse(countersRaw) : {
        CO: 1,
        GV: 1,
        AD: 3001,
        AN: 6001,
        UM: 9001
      };

      const prefix = type || 'CO';
      const currentNum = counters[prefix] || 1;
      
      // 格式化：CO 为 7 位数字，其他为 4 位数字
      const formattedNum = prefix === 'CO' 
        ? currentNum.toString().padStart(7, '0')
        : currentNum.toString().padStart(4, '0');
        
      return `${prefix} ${formattedNum}`;
    } catch (e) {
      console.error("Failed to generate customer number:", e);
      return type ? `${type} 0001` : "CO 0000001";
    }
  };

  // 监听输入和分类变化，动态生成客户 ID
  useEffect(() => {
    if (editingBooking) {
      setCustomerId(editingBooking.customerId || "");
      return;
    }

    // 沙盒模式演示：如果是特定的老客电话
    if (phoneTracks[0] === "6667767" || phoneTracks[0] === "3758376") {
      setCustomerId("GV 0015");
      setNewCustomerType(null);
    } else {
      // 如果不是老客，根据当前选择的分类生成新号码
      setCustomerId(generateCustomerNumber(newCustomerType));
    }
  }, [phoneTracks, newCustomerType, editingBooking]);

  // 从 localStorage 加载配置数据及初始化时间
  useEffect(() => {
    if (isOpen) {
      try {
        const savedStaffs = localStorage.getItem('gx_sandbox_staffs');
        if (savedStaffs) {
          setStaffs(JSON.parse(savedStaffs).filter((s: any) => s.status !== 'resigned'));
        }

        const savedCategories = localStorage.getItem('gx_sandbox_categories');
        if (savedCategories) {
          const parsedCategories = JSON.parse(savedCategories);
          setCategories(parsedCategories);
          if (parsedCategories.length > 0 && !activeCategory) {
            setActiveCategory(parsedCategories[0].id);
          }
        }
        
        const savedServices = localStorage.getItem('gx_sandbox_services');
        if (savedServices) {
          setServices(JSON.parse(savedServices));
        }

        // 初始化表单数据
        if (editingBooking) {
          // 编辑模式：回显数据
          setPhoneTracks(editingBooking.customerName && editingBooking.customerName !== "散客 Walk-in" ? editingBooking.customerName.split(',') : [""]);
          setSelectedTime(editingBooking.startTime);
          if (editingBooking.date) {
            setSelectedDate(editingBooking.date.replace(/-/g, '/'));
          }
          
          if (editingBooking.services && editingBooking.services.length > 0) {
            // 修复：确保回显的服务项目带有正确的 assignedEmployeeId
            const restoredServices = editingBooking.services.map((s: any) => ({
              ...s,
              assignedEmployeeId: editingBooking.originalUnassigned ? null : editingBooking.resourceId
            }));
            setSelectedServices(restoredServices);
            
            // 还原自定义文本
            setCustomServiceText(editingBooking.customServiceText || "");
            
            // 还原时长微调
            const baseD = editingBooking.services.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);
            setDurationOffset(editingBooking.duration - baseD);
          }
          
          // 智能分发：点开旧预约时，右侧默认展开雷达面板以查看客人底细
          setActivePaneMode('member');
        } else {
          // 新建模式：初始化日期和时间
          const targetDate = initialDate || new Date();
          const year = targetDate.getFullYear();
          const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
          const day = targetDate.getDate().toString().padStart(2, '0');
          setSelectedDate(`${year}/${month}/${day}`);

          if (initialTime) {
            setSelectedTime(initialTime);
          } else {
            const now = new Date();
            const nextHour = (now.getHours() + 1) % 24;
            setSelectedTime(`${nextHour.toString().padStart(2, '0')}:00`);
          }

          if (initialResourceId) {
            setCurrentBrushEmployeeId(initialResourceId);
          }
        }

      } catch (e) {
        console.error('Failed to parse sandbox data in BookingModal:', e);
      }
    } else {
      // 弹窗关闭时重置状态
      setSelectedServices([]);
      setCustomServiceText("");
      setCurrentBrushEmployeeId(null);
      setRetargetingServiceId(null);
      setActivePaneMode('service');
      setPhoneTracks(['']); // 修复：重置为初始的多轨电话状态
      setDurationOffset(0);
    }
  }, [isOpen]);

  // 处理服务多选与印章涂色
  const handleToggleService = (service: any) => {
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

  // --- 核心业务逻辑：确认并拆分预约 (Data Transformer) ---
  const handleConfirmBooking = () => {
    if (selectedServices.length === 0) {
      alert("请至少选择一个服务项目");
      return;
    }

    // 1. 按员工归组 (Group by Employee)
    const groupedByEmployee = selectedServices.reduce((acc: any, service: any) => {
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
    const newBookings: any[] = [];
    const customerName = phoneTracks.filter(t => t.trim() !== "").join(',') || "散客 Walk-in";
    const baseDate = selectedDate.replace(/\//g, '-'); // 确保格式为 YYYY-MM-DD 以便解析
    
    // 生成一个主订单ID，把拆分出来的子卡片关联起来
    const masterOrderId = `ORD-${Date.now()}`;

    // --- 消耗/更新客户编号 (Consume Customer ID) ---
    if (!editingBooking && customerId) {
      try {
        const recycledRaw = localStorage.getItem('gx_recycled_customer_ids');
        let recycledIds: string[] = recycledRaw ? JSON.parse(recycledRaw) : [];
        
        // 检查当前使用的号码是否来自回收站
        if (recycledIds.includes(customerId)) {
          // 从回收站移除
          recycledIds = recycledIds.filter(id => id !== customerId);
          localStorage.setItem('gx_recycled_customer_ids', JSON.stringify(recycledIds));
        } else {
          // 如果不是回收站的，说明是新分配的，需要递增计数器
          const prefix = customerId.split(' ')[0];
          const countersRaw = localStorage.getItem('gx_customer_counters');
          const counters = countersRaw ? JSON.parse(countersRaw) : { CO: 1, GV: 1, AD: 3001, AN: 6001, UM: 9001 };
          
          counters[prefix] = (counters[prefix] || 1) + 1;
          localStorage.setItem('gx_customer_counters', JSON.stringify(counters));
        }
      } catch (e) {
        console.error("Failed to consume customer ID:", e);
      }
    }

    Object.entries(groupedByEmployee).forEach(([empId, servicesInGroup]: [string, any]) => {
      // 聚合该员工负责的这部分服务的名称和总时长
      const groupDuration = servicesInGroup.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
      const groupServiceNames = servicesInGroup.map((s: any) => s.name).join(' + ');

      // 如果只有一个员工，时长微调 (durationOffset) 全算给他；如果有多个员工，微调比较复杂，这里简单处理，加在第一个员工头上，或者不加。
      // 为了演示，如果员工数>1，暂时忽略微调；如果是单员工，应用微调
      const finalDuration = Object.keys(groupedByEmployee).length === 1 
        ? Math.max(1, groupDuration + durationOffset) 
        : groupDuration;

      // 默认并行：所有拆分卡片的 startTime 都是表单选择的开始时间
      const [hours, minutes] = selectedTime.split(':');
      const startDateTime = new Date(`${baseDate}T${hours}:${minutes}:00`);

      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + finalDuration);

      newBookings.push({
        id: editingBooking && Object.keys(groupedByEmployee).length === 1 ? editingBooking.id : `BKG-${Date.now()}-${empId}`, // 如果是单员工编辑，保留原ID；如果是重拆分，生成新ID
        masterOrderId: editingBooking ? editingBooking.masterOrderId : masterOrderId,
        resourceId: empId === 'unassigned' ? null : empId, // 临时设为 null，后面由前置派发逻辑处理
        customerId: customerId, // 【核心】：注入智能编号
        customerName: customerName,
        serviceName: customServiceText ? `${groupServiceNames} (${customServiceText})` : groupServiceNames,
        customServiceText: customServiceText, // 存入自定义文本以便下次编辑回显
        date: baseDate, // 【核心修复】：注入丢失的 date 字段，打破渲染隐形诅咒
        startTime: `${hours}:${minutes}`, // 简单的时间字符串，用于渲染定位
        duration: finalDuration,
        status: 'confirmed',
        services: servicesInGroup, // 原始服务数据，备用
        originalUnassigned: empId === 'unassigned' // 标记它原本是未指定的
      });
    });

    // --- 全局动态重排逻辑 (Global Dynamic Spatial Reflow) ---
    // 读取所有数据，进行“绝对路权锚定”与“无指定预约重新寻位”
    try {
      const existingBookingsStr = localStorage.getItem('gx_sandbox_bookings');
      let allBookings = existingBookingsStr ? JSON.parse(existingBookingsStr) : [];
      
      // 1. 如果是编辑模式，先从现存列表中移除这笔被编辑的旧订单
      if (editingBooking) {
        allBookings = allBookings.filter((b: any) => b.id !== editingBooking.id);
      }

      // 2. 将当前操作产生的新订单加入全量列表
      allBookings = [...allBookings, ...newBookings];

      // 3. 过滤出今天的订单进行重排，非今天的订单保持不动
      const todayBookings = allBookings.filter((b: any) => b.date === baseDate);
      const otherDayBookings = allBookings.filter((b: any) => b.date !== baseDate);

      // 将时间字符串(HH:MM)转化为当天的绝对分钟数，用于碰撞检测
      const timeToMinutes = (timeStr: string) => {
        const [h, m] = (timeStr || "00:00").split(':').map(Number);
        return h * 60 + m;
      };

      // 4. 剥离并分类：指定预约（含NO）、无指定预约
      const assignedBookings: any[] = [];
      let unassignedBookings: any[] = [];

      todayBookings.forEach((b: any) => {
        // 如果它是无指定预约，且不是已经被锁定在爽约列的 NO
        if (b.originalUnassigned && b.resourceId !== 'NO') {
          // 【核心修复】：必须清空它之前的坑位记忆，让它变成纯粹的“无家可归”状态
          // 否则它会携带着旧的 resourceId 参与碰撞检测，导致死锁或自我挤压
          b.resourceId = null;
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
        unassignedBkg.resourceId = foundStaffId || (staffs.length > 0 ? staffs[0].id : null);
        
        // 落位后，加入 placedBookings 参与后续无指定预约的碰撞检测
        placedBookings.push(unassignedBkg);
      });

      // 7. 合并重排后的今日订单与非今日订单，存盘
      const finalUpdatedBookings = [...otherDayBookings, ...placedBookings];
      localStorage.setItem('gx_sandbox_bookings', JSON.stringify(finalUpdatedBookings));
      
      // 触发全局自定义事件，通知矩阵刷新
      window.dispatchEvent(new Event('gx-sandbox-bookings-updated'));
      
      // 关闭弹窗
      onClose();
    } catch (error) {
      console.error("Failed to save bookings to sandbox:", error);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans text-white">
          {/* 背景暗场遮罩，带有毛玻璃效果 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[800px] flex flex-col items-center px-4 md:px-0"
          >
            {/* 核心双窗容器 (Glassmorphism + Neon Border) - 移动端垂直堆叠 */}
            <main className="w-full h-[80vh] md:h-[450px] flex flex-col md:flex-row rounded-2xl overflow-hidden relative group border border-gx-cyan/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] bg-black/40">
              {/* 右上角关闭按钮 */}
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-full backdrop-blur-md transition-all md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>

              {/* ===================== 左侧/顶部：控制台面板 ===================== */}
              <section className="w-full md:w-[50%] h-[50%] md:h-full p-5 md:pb-16 flex flex-col gap-4 relative z-10 border-b md:border-b-0 border-white/10 shrink-0">
                
                {/* 表单录入区 */}
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">服务内容</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex items-center cursor-text transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] overflow-hidden",
                        activePaneMode === 'service' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => {
                        setActivePaneMode('service');
                        document.getElementById('custom-service-input')?.focus();
                      }}
                    >
                      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar whitespace-nowrap h-full">
                        {selectedServices.length === 0 && customServiceText === "" && (
                          <span className="text-[11px] text-white/20 absolute pointer-events-none">选择服务项目或输入...</span>
                        )}
                        {selectedServices.map((s, index) => {
                          const staff = staffs.find(st => st.id === s.assignedEmployeeId);
                          const textColor = staff ? staff.color : '#ffffff'; // 未指定时字体为亮白色
                          
                          return (
                            <div key={s.id} className="flex items-center shrink-0">
                              <span 
                                className="text-[11px] font-bold tracking-wide transition-colors"
                                style={{ 
                                  color: textColor,
                                  textShadow: staff ? `0 0 8px ${textColor}60` : '0 0 8px rgba(255,255,255,0.3)'
                                }}
                              >
                                {s.name}
                              </span>
                              {(index < selectedServices.length - 1 || customServiceText !== "") && (
                                <span className="text-white/20 px-1 text-[10px] font-bold">·</span>
                              )}
                            </div>
                          );
                        })}
                        {/* 透明的自由文本输入框，紧跟在胶囊流后面 */}
                        <input
                          id="custom-service-input"
                          type="text"
                          value={customServiceText}
                          onChange={(e) => setCustomServiceText(e.target.value)}
                          className="bg-transparent border-none outline-none text-[11px] text-white font-bold flex-1 min-w-[60px] p-0 m-0 leading-tight placeholder:text-transparent shrink-0"
                          placeholder={selectedServices.length > 0 ? "" : " "}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">会员信息</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex items-center gap-2 cursor-text transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] relative group",
                        activePaneMode === 'member' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => {
                        setActivePaneMode('member');
                        setIsMemberInputFocused(true); // 点击整个区域时触发输入模式
                      }}
                    >
                      <User className={cn("w-3 h-3 shrink-0", activePaneMode === 'member' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                      
                      {/* 终极极简交互：如果处于非输入状态，且有 customerId，则只展示纯净的徽章 */}
                      {!isMemberInputFocused && customerId ? (
                        <div className="flex-1 truncate flex items-center justify-center pr-5">
                          <span className={cn(
                            "text-[11px] font-bold font-mono tracking-widest leading-none -translate-y-[1px]",
                            customerId.startsWith('CO') ? "text-white/40" : "text-gx-cyan"
                          )}>
                            {customerId}
                          </span>
                        </div>
                      ) : (
                        /* 输入模式：完全接管该区域，不显示任何前缀，只显示纯粹的输入框 */
                        <div className="flex-1 w-full h-full flex items-center justify-center">
                          <input 
                            type="text" 
                            placeholder="输入主电话..." 
                            className="bg-transparent border-none outline-none text-[11px] w-full placeholder:text-white/20 text-white font-bold truncate leading-none -translate-y-[1px] text-center pr-5"
                            value={phoneTracks[0] || ""}
                            onChange={(e) => {
                              const newTracks = [...phoneTracks];
                              newTracks[0] = e.target.value;
                              setPhoneTracks(newTracks);
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

                {/* 时间与持续时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">预约日期</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] text-white",
                        activePaneMode === 'date' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => setActivePaneMode('date')}
                    >
                      <span>{selectedDate}</span>
                      <CalendarIcon className={cn("w-3 h-3", activePaneMode === 'date' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">开始时间</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] text-white",
                        activePaneMode === 'time' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => setActivePaneMode('time')}
                    >
                      <span>{selectedTime}</span>
                      <Clock className={cn("w-3 h-3", activePaneMode === 'time' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">服务时长</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)]",
                        activePaneMode === 'duration' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white" : "border-gx-cyan/30 hover:border-gx-cyan/70 text-white/60"
                      )}
                      onClick={() => setActivePaneMode('duration')}
                    >
                      <span className={durationOffset !== 0 ? "text-gx-cyan font-bold" : ""}>
                        {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                      </span>
                      <Clock className={cn("w-3 h-3", activePaneMode === 'duration' ? "text-gx-cyan" : "text-white/20")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold font-mono tracking-widest uppercase">结束时间</label>
                    <div 
                      className="bg-black/40 border border-gx-cyan/30 rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] text-white/60 cursor-not-allowed"
                    >
                      <span>{getEndTime()}</span>
                      <Clock className="w-3 h-3 text-white/20" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ===================== 右侧/底部：动态监视器区 ===================== */}
              <section className="flex-1 h-[50%] md:h-full p-4 md:p-6 relative z-10 overflow-hidden">
                {activePaneMode === 'service' && (
                  // 服务项目选择矩阵与人员分配
                  <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
                    {/* 分类标签导航 */}
                    <div className="flex gap-[20px] border-b border-white/10 pb-3 mb-4 overflow-x-auto no-scrollbar shrink-0 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "text-[15px] font-mono whitespace-nowrap transition-colors uppercase tracking-widest",
                            activeCategory === cat.id ? "text-gx-cyan font-bold" : "text-white/40 hover:text-white/80"
                          )}
                        >
                          {cat.name.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim()}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <span className="text-[10px] text-white/30 font-mono">NO CATEGORIES FOUND</span>
                      )}
                    </div>

                    {/* 服务项目矩阵 (移动端2列，大屏5列) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pr-2 content-start">
                      {services
                        .filter(s => s.categoryId === activeCategory)
                        .map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          const selectedData = selectedServices.find(s => s.id === service.id);
                          const assignedStaff = selectedData ? staffs.find(st => st.id === selectedData.assignedEmployeeId) : null;
                          const staffColor = assignedStaff ? assignedStaff.color : 'rgba(255,255,255,0.2)';

                          return (
                            <button
                              key={service.id}
                              onClick={() => handleToggleService(service)}
                              className={cn(
                                "p-3 rounded-xl border transition-all text-left flex flex-col justify-center h-[60px] group relative overflow-hidden",
                                isSelected 
                                  ? "bg-gx-cyan/10 border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" 
                                  : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                              )}
                            >
                              {/* 员工颜色标识点 */}
                              {isSelected && (
                                <div 
                                  className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full shadow-sm transition-colors border border-black/50"
                                  style={{ backgroundColor: staffColor }}
                                />
                              )}
                              <span className={cn(
                                "text-xs font-bold line-clamp-2 leading-tight transition-colors pr-3",
                                isSelected ? "text-gx-cyan" : "text-white group-hover:text-white/90"
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

                    {/* 当前印章/笔刷选择栏 (Brush/Stamp Selection) */}
                    <div className="border-t border-white/10 pt-3 mt-3 flex flex-col gap-3 shrink-0 mb-4">
                      <div className="flex items-center justify-between">
                        {/* 左侧动态胶囊 (兼具指示器与重置按钮功能) 与已选项目快捷映射 */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1 pr-4">
                          <button 
                            onClick={() => handleSetBrush(null)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
                              currentBrushEmployeeId === null
                                ? "bg-gx-cyan/10 border-gx-cyan/30 hover:bg-gx-cyan/20"
                                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
                            )}
                            title="点击重置为未指定"
                          >
                            {currentBrushEmployeeId ? (
                              <>
                                <div 
                                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                  style={{ backgroundColor: staffs.find(s => s.id === currentBrushEmployeeId)?.color }}
                                />
                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                  {staffs.find(s => s.id === currentBrushEmployeeId)?.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-2.5 h-2.5 rounded-full bg-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]" />
                                <span className="text-[11px] font-bold text-gx-cyan uppercase tracking-widest">
                                  未指定
                                </span>
                              </>
                            )}
                          </button>

                          {/* 快捷映射：当前员工名下的已选项目 */}
                          <div className="flex items-center gap-2">
                            <AnimatePresence>
                              {selectedServices
                                .filter(s => s.assignedEmployeeId === currentBrushEmployeeId)
                                .map(s => {
                                  const isRetargeting = retargetingServiceId === s.id;
                                  const staffColor = currentBrushEmployeeId 
                                    ? staffs.find(st => st.id === currentBrushEmployeeId)?.color 
                                    : "#ffffff"; // 未指定时为亮白色

                                  return (
                                    <motion.button
                                      key={s.id}
                                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                      animate={{ opacity: 1, scale: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, width: 0, padding: 0, margin: 0 }}
                                      onClick={() => handleRetargetService(s.id)}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border whitespace-nowrap",
                                        isRetargeting 
                                          ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" 
                                          : "bg-white/5 border-white/10 hover:bg-white/10"
                                      )}
                                      style={!isRetargeting ? { color: staffColor } : {}}
                                      title="点击进入重新分配模式"
                                    >
                                      {s.name}
                                    </motion.button>
                                  );
                                })}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-3 pb-2">
                        {staffs.map(staff => {
                          const isAssigned = currentBrushEmployeeId === staff.id;
                            
                          return (
                            <button
                              key={staff.id}
                              onClick={() => handleSetBrush(staff.id)}
                              className={cn(
                                "flex items-center gap-2 text-xs font-bold transition-colors whitespace-nowrap",
                                isAssigned ? "text-white" : "text-white/60 hover:text-white"
                              )}
                            >
                              <div 
                                className={cn("w-3 h-3 rounded-full transition-all", isAssigned ? "shadow-[0_0_10px_rgba(255,255,255,0.4)] scale-110" : "")}
                                style={{ backgroundColor: staff.color }}
                              />
                              <span className="uppercase">{staff.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activePaneMode === 'member' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="h-full flex flex-col p-2 overflow-hidden relative"
                  >
                    {/* 1. 顶部：核心身份与消费概览 (降维排版与七彩流光材质) */}
                    <div className="flex items-end justify-between border-b border-white/10 pb-4 mb-4 shrink-0 px-2">
                      <div className="flex flex-col gap-1 w-[60%]">
                        {/* 会员编号 (大字号) */}
                        <div className={cn(
                          "font-mono text-xl font-black tracking-[0.2em] shrink-0",
                          customerId.startsWith('CO') 
                            ? "text-gx-cyan" // 散客冷峻单色
                            : "bg-gradient-to-r from-gx-cyan via-purple-400 to-pink-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto] drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]" // VIP 七彩流光
                        )}>
                          {customerId}
                        </div>
                        
                        {/* 电话号码多轨流 (小字号换行) */}
                        <div className="flex flex-col gap-1 mt-1">
                          {phoneTracks.map((phone, index) => (
                            <div key={index} className="flex items-center gap-2 group/phone">
                              {editingPhoneIndex === index ? (
                                <input 
                                  type="text" 
                                  placeholder="输入电话..." 
                                  className="bg-transparent border-b border-gx-cyan/50 outline-none text-sm font-mono text-white placeholder:text-white/20 w-32"
                                  value={phone}
                                  onChange={(e) => {
                                    const newTracks = [...phoneTracks];
                                    newTracks[index] = e.target.value;
                                    setPhoneTracks(newTracks);
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
                                    onClick={() => setPhoneTracks([...phoneTracks, ''])}
                                    className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white hover:bg-white/10 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                )}
                                {phoneTracks.length > 1 && (
                                  <button 
                                    onClick={() => {
                                      const newTracks = phoneTracks.filter((_, i) => i !== index);
                                      setPhoneTracks(newTracks);
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
                      
                      {/* 右上角总金额 */}
                      <div className="flex flex-col items-end shrink-0">
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
                                <span className="text-sm font-bold text-white truncate">高级染发 + 护理</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-gx-cyan font-bold">¥ 880</span>
                                {/* 间隔天数提醒 */}
                                <span className="text-[10px] font-mono bg-gx-cyan/10 text-gx-cyan px-2 py-1 rounded border border-gx-cyan/20 whitespace-nowrap">
                                  距今 25 天
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 历史卡片 2 (爽约记录) */}
                          <div className="relative group cursor-pointer">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-red-500/30 rounded-xl p-4 transition-all opacity-70 hover:opacity-100">
                              <div className="flex items-center gap-6 w-[60%]">
                                <span className="text-sm font-mono text-white/40">01.15</span>
                                <span className="text-sm font-bold text-white/40 line-through">洗剪吹</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-white/20">--</span>
                                {/* 爽约印记 */}
                                <span className="text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-1 rounded border border-red-500/30 whitespace-nowrap uppercase tracking-widest">
                                  爽约
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 历史卡片 3 */}
                          <div className="relative group cursor-pointer">
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all">
                              <div className="flex items-center gap-6 w-[60%]">
                                <span className="text-sm font-mono text-white/60">12.01</span>
                                <span className="text-sm font-bold text-white">洗剪吹</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs font-mono text-white/80">¥ 120</span>
                                <span className="text-[10px] opacity-0 px-2 py-1">占位</span> {/* 保持对齐 */}
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
                            <span className="text-xs font-mono text-white/20 uppercase tracking-widest">No History / 新客建档</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 3. 底部：新客分类按钮 & 单行备注 */}
                    <div className="shrink-0 space-y-4 px-2">
                      {/* 分类选项 (仅在新客且未匹配到会员时显示) */}
                      {phoneTracks[0] !== "6667767" && phoneTracks[0] !== "3758376" && (
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
                          placeholder="添加客户偏好备注 (如：喜欢安静、对染发剂过敏)..."
                          className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 resize-none h-8 leading-8 px-1 custom-scrollbar overflow-x-hidden whitespace-nowrap"
                          rows={1}
                          style={{ whiteSpace: 'nowrap' }} // 强制单行横向滚动
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-gx-cyan/50 via-white/10 to-transparent" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activePaneMode === 'duration' && (
                  <div className="h-full flex flex-col items-center justify-center p-8 select-none touch-none relative">
                    {/* 全息视界区 (HUD Display) */}
                    <div className="flex flex-col items-center mb-6">
                      <motion.span 
                        key={totalDuration}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[64px] font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/40 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] font-mono leading-none whitespace-nowrap"
                      >
                        {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                      </motion.span>
                      
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
                      <button className="text-white/40 hover:text-gx-cyan transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="text-lg font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50">
                        MARCH 2026
                      </span>
                      <button className="text-white/40 hover:text-gx-cyan transition-colors">
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
                        {/* Actual days (1-31) */}
                        {[...Array(31)].map((_, i) => {
                          const day = i + 1;
                          const formattedDay = day.toString().padStart(2, '0');
                          const dateString = `2026/03/${formattedDay}`;
                          const isSelected = selectedDate === dateString;
                          const isToday = day === 7; // Mocking today
                          
                          return (
                            <button
                              key={day}
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
                              {/* Saturation dots (Optional Business Logic Visual Indicator) */}
                              {!isSelected && day % 5 === 0 && (
                                <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-white/20" />
                              )}
                              {!isSelected && day % 12 === 0 && (
                                <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-red-500/50 shadow-[0_0_4px_rgba(255,0,0,0.5)]" />
                              )}
                            </button>
                          );
                        })}
                        {/* Next month days filler */}
                        {[...Array(4)].map((_, i) => (
                          <div key={`next-${i}`} className="h-10 flex items-center justify-center font-mono text-sm text-white/20">
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                        ))}
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
                          setSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                        }
                        setDraggingHour(null);
                        setHoveredMinute(null);
                        setDragStartPos(null);
                      }}
                      onPointerLeave={() => {
                        if (draggingHour !== null) {
                          const min = hoveredMinute !== null ? hoveredMinute : 0;
                          setSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
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
                                  setSelectedTime(`${hr.toString().padStart(2, '0')}:00`);
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
                        <motion.span 
                          key={isAM ? 'AM' : 'PM'} // 利用 key 触发动画
                          initial={{ opacity: 0, x: isAM ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[48px] font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-mono leading-none"
                        >
                          {draggingHour !== null 
                            ? `${draggingHour.toString().padStart(2, '0')}:${hoveredMinute !== null ? hoveredMinute.toString().padStart(2, '0') : '00'}`
                            : selectedTime
                          }
                        </motion.span>
                        
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
                            <span className={cn("transition-all", isAM ? "text-gx-cyan" : "text-white/40")}>AM</span>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <span className={cn("transition-all", !isAM ? "text-gx-cyan" : "text-white/40")}>PM</span>
                            <div className={cn("w-2 h-2 rounded-full transition-all", !isAM ? "bg-gx-cyan shadow-[0_0_5px_rgba(0,255,255,0.8)] scale-125" : "bg-white/20")} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 操作提示 */}
                    <div className="absolute bottom-6 text-[10px] font-mono tracking-[0.3em] transition-all duration-300 flex flex-col items-center gap-1">
                      {draggingHour !== null ? (
                        <span className="text-gx-cyan animate-pulse">SWIPE TO SET MINUTES</span>
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
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-auto">
              <button 
                onClick={handleConfirmBooking}
                className="w-48 py-3 rounded-xl bg-gx-cyan text-black text-xs font-black tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
              >
                {editingBooking ? "更新预约 / UPDATE" : "确认预约 / CONFIRM"}
              </button>
              <button 
                onClick={onClose}
                className="w-40 py-3 rounded-xl bg-black/60 border border-gx-cyan/30 text-white hover:border-gx-cyan transition-all font-mono text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              >
                取消 / CANCEL
              </button>
            </div>

            {/* Global styles for custom scrollbar */}
            <style jsx global>{`
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
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
