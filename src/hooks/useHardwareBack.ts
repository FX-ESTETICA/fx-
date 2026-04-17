import { create } from 'zustand';

type BackHandler = () => boolean;

interface HardwareBackState {
  handlers: { id: string; handler: BackHandler; priority: number }[];
  register: (id: string, handler: BackHandler, priority?: number) => void;
  unregister: (id: string) => void;
  pop: () => boolean;
}

export const useHardwareBack = create<HardwareBackState>((set, get) => ({
  handlers: [],
  
  // 注册拦截器（priority: 数值越大，越优先被执行）
  register: (id, handler, priority = 0) => set((state) => {
    const filtered = state.handlers.filter(h => h.id !== id);
    const newHandlers = [...filtered, { id, handler, priority }];
    // 排序逻辑：优先执行高优先级；同等优先级则根据后进先出（LIFO）
    newHandlers.sort((a, b) => b.priority - a.priority);
    return { handlers: newHandlers };
  }),
  
  // 注销拦截器
  unregister: (id) => set((state) => ({
    handlers: state.handlers.filter(h => h.id !== id)
  })),
  
  // 触发一次物理返回（尝试消耗栈中的拦截器）
  pop: () => {
    const { handlers } = get();
    // 由于我们在 register 时已经按 priority 降序排列，同 priority 的由于是从左到右 push 的，
    // 后加入的排在数组后面。为了实现 LIFO（后打开的先关闭），我们应该先把原数组翻转再进行优先级排序。
    const sortedHandlers = [...handlers].reverse().sort((a, b) => b.priority - a.priority);
    
    for (const h of sortedHandlers) {
      if (h.handler()) {
        return true; // 返回 true 表示拦截器消耗了此次事件
      }
    }
    return false; // 没有任何拦截器消费事件
  }
}));
