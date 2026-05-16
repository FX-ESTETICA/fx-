import { create } from 'zustand';

interface SyncStore {
  syncTick: number;
  resurrectTick: number;
  triggerSync: (reason?: string) => void;
  triggerResurrect: (reason?: string) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  syncTick: 0,
  resurrectTick: 0,
  triggerSync: (reason = 'unknown') => {
    console.log(`[SyncStore] 🔄 物理状态机触发同步 (Tick + 1), Reason: ${reason}`);
    set((state) => ({
      syncTick: state.syncTick + 1,
    }));
  },
  triggerResurrect: (reason = 'unknown') => {
    console.log(`[SyncStore] ☢️ 物理状态机触发 WebSocket 重建 (ResurrectTick + 1), Reason: ${reason}`);
    set((state) => ({
      resurrectTick: state.resurrectTick + 1,
    }));
  }
}));
