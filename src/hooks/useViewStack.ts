import { create } from 'zustand';
import { useHardwareBack } from './useHardwareBack';

export type TabId = 'home' | 'discovery' | 'calendar' | 'chat' | 'me';

interface ViewStackState {
  activeTab: TabId;
  tabProps: Record<string, any>; // 允许为特定 Tab 传递参数，例如 calendar 的 industry
  setActiveTab: (tab: TabId, props?: Record<string, any>) => void;
  
  // 用于管理二级全局弹层（如 ChatRoom, ShopDetail 等）
  overlays: Array<{ id: string; props?: any }>;
  pushOverlay: (overlayId: string, props?: any) => void;
  _popOverlayState: () => void;
  popOverlay: () => void;
  clearOverlays: () => void;
}

export const useViewStack = create<ViewStackState>((set) => ({
  activeTab: 'home',
  tabProps: {},
  setActiveTab: (tab, props) => set((state) => {
    // 同步更新浏览器 URL（将底层的 replaceState 升级为 pushState，实现 Web 端的虚拟历史栈）
    if (typeof window !== 'undefined') {
      const url = tab === 'home' ? '/' : `/${tab}`;
      if (state.activeTab !== tab) {
        window.history.pushState({ tab, props }, '', url);
      } else {
        window.history.replaceState({ tab, props }, '', url);
      }
    }
    return { activeTab: tab, tabProps: { ...state.tabProps, [tab]: props || {} } };
  }),
  
  overlays: [],
  pushOverlay: (overlayId, props) => set((state) => {
    if (typeof window !== 'undefined') {
      // 压入真实的 history 栈，使得手机物理返回键能够被拦截
      window.history.pushState({ overlayId }, '', window.location.href);
    }
    return { overlays: [...state.overlays, { id: overlayId, props }] };
  }),
  // 仅供内部状态机回退使用
  _popOverlayState: () => set((state) => {
    return { overlays: state.overlays.slice(0, -1) };
  }),
  // UI 调用的关闭弹层方法：统一触发物理后退，让 popstate 监听器接管状态回退，保证历史栈一致
  popOverlay: () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  },
  clearOverlays: () => set({ overlays: [] }),
}));

// 初始化监听器：处理浏览器的物理返回键
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    // 0. 拦截幽灵栈自毁动作
    if ((window as any)._isPhantomPopping) {
      // 这里只需要消费掉这个标记并阻止它继续往下传递
      // 由于我们是在 popstate 触发时执行的，说明浏览器的回退动作“已经发生并结算完成”了
      // 此时将标记重置回 false 是绝对安全且原子的
      (window as any)._isPhantomPopping = false;
      return;
    }

    // 1. 最高优先级：局部弹窗的物理拦截栈 (与 App 端 Capacitor 逻辑保持绝对一致)
    const hwState = useHardwareBack.getState();
    if (hwState.pop()) {
      // 成功消费了一个弹窗，拦截后续动作，由于浏览器已经执行了后退，弹窗自己被关闭，
      // 我们不仅成功抵消了这次后退，还刚好把刚刚写入的 pushState 给吃掉了
      return;
    }

    const state = useViewStack.getState();
    // 如果当前有弹层，物理返回键应当关闭顶层弹层，而不是真正后退页面
    if (state.overlays.length > 0) {
      // Zustand 状态回退
      state._popOverlayState();
    } else if (e.state && e.state.tab) {
      // 如果是 Tab 切换的历史记录
      // 避免在此处调用 setActiveTab 从而再次触发 pushState，直接调用 setState 修改内部状态
      useViewStack.setState({ activeTab: e.state.tab });
    }
  });
}
