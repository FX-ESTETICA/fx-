import { create } from 'zustand';

interface ChatStore {
  // 当前处于活跃状态的聊天对象（表示正在聊天室内）
  activeChat: {
    id: string;
    name: string;
    isGroup: boolean;
    isCityChannel?: boolean;
  } | null;
  setActiveChat: (chat: ChatStore['activeChat']) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChat: null,
  setActiveChat: (chat) => set({ activeChat: chat }),
}));
