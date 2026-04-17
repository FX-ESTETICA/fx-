import { create } from 'zustand';

type BackHandler = () => boolean;

interface HardwareBackState {
  handlers: { id: string; handler: BackHandler; priority: number }[];
  register: (id: string, handler: BackHandler, priority?: number) => void;
  unregister: (id: string) => void;
  pop: () => boolean;
}

// ------------------------------------------------------------------
// 幽灵历史栈管理器 (Phantom History Stack Manager)
// ------------------------------------------------------------------
const pendingOperations: Record<string, 'push' | 'pop'> = {};
let processTimeout: NodeJS.Timeout | null = null;

const processHistoryQueue = () => {
  if (typeof window === 'undefined') return;
  
  const currentState = window.history.state || {};
  let pushCount = 0;
  let popCount = 0;

  // 第一步：处理所有的 push (压入幽灵栈)
  for (const [id, op] of Object.entries(pendingOperations)) {
    if (op === 'push') {
      pushCount++;
      // 只有当前栈顶不是这个 modal 时，才推入
      if (currentState.phantom_modal !== id) {
        window.history.pushState({ ...currentState, phantom_modal: id }, '', window.location.href);
      }
    } else if (op === 'pop') {
      popCount++;
    }
  }

  // 第二步：处理所有的 pop (如果幽灵栈在顶部，需要替用户回退一步，保持纯净)
  // 我们必须重新获取 currentState，因为如果上面刚刚执行了 pushState，栈顶已经变了
  const latestState = window.history.state || {};
  
  if (popCount > 0 && latestState.phantom_modal) {
    // 检查栈顶的那个 modal 是否在本次需要被 pop 的名单中
    const poppingId = latestState.phantom_modal;
    if (pendingOperations[poppingId] === 'pop') {
       // 给系统打上免检标记，告诉 popstate 监听器：“这是我自动清扫垃圾触发的后退，不要去触发业务关闭逻辑！”
       (window as any)._isPhantomPopping = true;
       window.history.back();
       
       // 给一点时间让浏览器把异步后退做完，然后再撤销免检标记
       setTimeout(() => {
         (window as any)._isPhantomPopping = false;
       }, 100);
    }
  }

  for (const key in pendingOperations) {
    delete pendingOperations[key];
  }
};

export const useHardwareBack = create<HardwareBackState>((set, get) => ({
  handlers: [],
  
  // 注册拦截器（priority: 数值越大，越优先被执行）
  register: (id, handler, priority = 0) => set((state) => {
    const filtered = state.handlers.filter(h => h.id !== id);
    const newHandlers = [...filtered, { id, handler, priority }];
    // 排序逻辑：优先执行高优先级；同等优先级则根据后进先出（LIFO）
    newHandlers.sort((a, b) => b.priority - a.priority);

    if (typeof window !== 'undefined') {
      pendingOperations[id] = 'push';
      clearTimeout(processTimeout);
      processTimeout = setTimeout(processHistoryQueue, 50);
    }

    return { handlers: newHandlers };
  }),
  
  // 注销拦截器
  unregister: (id) => set((state) => {
    if (typeof window !== 'undefined') {
      pendingOperations[id] = 'pop';
      clearTimeout(processTimeout);
      processTimeout = setTimeout(processHistoryQueue, 50);
    }
    return { handlers: state.handlers.filter(h => h.id !== id) };
  }),
  
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
