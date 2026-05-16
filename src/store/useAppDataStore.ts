import { create } from 'zustand';

interface AppDataStore {
  // HomeClient (发现页) 缓存
  homePlacesData: Record<string, any>;
  setHomePlacesData: (key: string, data: any) => void;
  
  // ChatList (聊天页) 缓存
  recentChatsData: Record<string, any[]>;
  setRecentChatsData: (key: string, data: any[]) => void;
  
  // 可以在未来继续添加其他页面的常驻状态
}

export const useAppDataStore = create<AppDataStore>((set) => ({
  homePlacesData: {},
  setHomePlacesData: (key, data) => set((state) => ({
    homePlacesData: { ...state.homePlacesData, [key]: data }
  })),

  recentChatsData: {},
  setRecentChatsData: (key, data) => set((state) => ({
    recentChatsData: { ...state.recentChatsData, [key]: data }
  }))
}));
