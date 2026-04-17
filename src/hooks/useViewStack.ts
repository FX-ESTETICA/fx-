import { create } from 'zustand';

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
    // 同步更新浏览器 URL（静默替换，不触发 Next.js 路由）
    if (typeof window !== 'undefined') {
      const url = tab === 'home' ? '/' : `/${tab}`;
      window.history.replaceState({ tab, props }, '', url);
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
    const state = useViewStack.getState();
    // 如果当前有弹层，物理返回键应当关闭顶层弹层，而不是真正后退页面
    if (state.overlays.length > 0) {
      // Zustand 状态回退
      state._popOverlayState();
    } else if (e.state && e.state.tab) {
      // 如果是 Tab 切换的历史记录
      useViewStack.setState({ activeTab: e.state.tab });
    }
  });
}
