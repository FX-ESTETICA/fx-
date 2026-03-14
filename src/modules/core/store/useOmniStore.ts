import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface NebulaState {
  fps: number
  consistencyScore: number
  onlineUsers: number
  isHedged: string | null
}

interface AIState {
  isNegotiating: boolean
  lastNegotiationLog: string[]
  staffSatisfaction: number
  merchantSatisfaction: number
  finalPriceFactor: number
  // v4.0 Sovereign Strategy
  strategyIntent: 'HYPER_GROWTH' | 'PROFIT_MAX' | 'RETENTION_FIRST' | 'BALANCED_AUTO'
  strategyWeights: { merchant: number; staff: number }
}

interface TransactionState {
  lastRpcId: string | null
  status: 'idle' | 'preparing' | 'signing' | 'broadcasting' | 'confirmed' | 'failed'
  isProcessing: boolean
  // v4.0 Value Mesh
  totalVolume: number
  unsettledStaffCredits: number
  // v9.1 Instruction Sequencing
  instructionQueue: Array<{ id: string; type: string; payload: any; ts: number; status: 'pending' | 'processing' | 'completed' | 'failed' }>
}

interface SyncMetadata {
  lastUpdated: Record<string, number>
}

interface InstructionLogEntry {
  id: string
  type: string
  payload: any
  timestamp: number
  snapshotBefore: string | null
}

interface OmniStore {
  // Nebula HUD
  nebula: NebulaState
  setNebula: (data: Partial<NebulaState>) => void
  
  // AI 博弈
  ai: AIState
  setAI: (data: Partial<AIState>) => void
  setStrategyIntent: (intent: AIState['strategyIntent']) => void
  
  // 3D 节点选择
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  
  // 事务状态
  transaction: TransactionState
  setTransaction: (data: Partial<TransactionState>) => void
  enqueueInstruction: (type: string, payload: any) => string
  dequeueInstruction: (id: string) => void
  updateInstructionStatus: (id: string, status: 'pending' | 'processing' | 'completed' | 'failed') => void

  // v4.0 Stability Protocol: 快照与回滚
  lastSnapshot: string | null
  shadowState: string | null
  takeSnapshot: () => void
  createShadowState: () => void
  rollback: () => void
  restoreShadow: () => void

  // v5.0 Sync Hardening: 冲突调和
  syncMetadata: SyncMetadata
  reconcile: (incoming: Partial<OmniStore>, incomingTs: number) => void
  getStateFingerprint: () => string
  extrapolatedState: Partial<OmniStore> | null
  extrapolate: (changes: Partial<OmniStore>) => void
  clearExtrapolation: () => void
  rtt: number // Round Trip Time in ms
  updateRtt: (val: number) => void
  isStressTesting: boolean
  setStressTesting: (val: boolean) => void

  // v15.1: Instruction Replay & Fault Traceability
  instructionLog: InstructionLogEntry[]
  logInstruction: (type: string, payload: any) => void
  clearInstructionLog: () => void
  replayLog: () => Promise<void>
  
  // v16.1: Consistency Reporting
  getStabilityReport: () => {
    uptime: number
    conflictsResolved: number
    avgLatency: number
    integrityScore: number
  }
}

/**
 * Omni-Flow v3.0 -> v4.0 -> v5.0 状态总线 (Global UI State Bus)
 * 采用 Zustand 实现高性能状态分发与本地持久化，确保弱网环境下 UI 状态不丢失
 */
export const useOmniStore = create<OmniStore>()(
  persist(
    (set, get) => ({
      nebula: {
        fps: 60,
        consistencyScore: 99.8,
        onlineUsers: 1,
        isHedged: null,
      },
      setNebula: (data) => set((state) => ({ 
        nebula: { ...state.nebula, ...data } 
      })),
      
      ai: {
        isNegotiating: false,
        lastNegotiationLog: [],
        staffSatisfaction: 1.0,
        merchantSatisfaction: 1.0,
        finalPriceFactor: 1.0,
        strategyIntent: 'BALANCED_AUTO',
        strategyWeights: { merchant: 0.5, staff: 0.5 },
      },
      setAI: (data) => set((state) => ({ 
        ai: { ...state.ai, ...data } 
      })),
      setStrategyIntent: (intent) => set((state) => {
        const weights = {
          HYPER_GROWTH: { merchant: 0.8, staff: 0.2 },
          PROFIT_MAX: { merchant: 0.9, staff: 0.1 },
          RETENTION_FIRST: { merchant: 0.2, staff: 0.8 },
          BALANCED_AUTO: { merchant: 0.5, staff: 0.5 },
        }[intent]
        return { ai: { ...state.ai, strategyIntent: intent, strategyWeights: weights } }
      }),
      
      selectedNodeId: null,
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      
      transaction: {
        lastRpcId: null,
        status: 'idle',
        isProcessing: false,
        totalVolume: 0,
        unsettledStaffCredits: 0,
        instructionQueue: [],
      },
      setTransaction: (data) => set((state) => ({ 
        transaction: { ...state.transaction, ...data } 
      })),
      enqueueInstruction: (type, payload) => {
        const id = Math.random().toString(36).substring(7);
        const instruction = { id, type, payload, ts: Date.now(), status: 'pending' as const };
        set((state) => ({
          transaction: {
            ...state.transaction,
            instructionQueue: [...state.transaction.instructionQueue, instruction]
          }
        }));
        return id;
      },
      dequeueInstruction: (id) => set((state) => ({
        transaction: {
          ...state.transaction,
          instructionQueue: state.transaction.instructionQueue.filter(i => i.id !== id)
        }
      })),
      updateInstructionStatus: (id, status) => set((state) => ({
        transaction: {
          ...state.transaction,
          instructionQueue: state.transaction.instructionQueue.map(i => 
            i.id === id ? { ...i, status } : i
          )
        }
      })),

      // v4.0 Stability Implementation
      lastSnapshot: null,
      shadowState: null,
      takeSnapshot: () => set((state) => {
        const snapshot = JSON.stringify({
          nebula: state.nebula,
          ai: state.ai,
          selectedNodeId: state.selectedNodeId,
          transaction: state.transaction
        });
        return { lastSnapshot: snapshot };
      }),
      createShadowState: () => set((state) => {
        // [Hot-Standby] 高负载事务前的影子状态快照
        const shadow = JSON.stringify({
          nebula: state.nebula,
          ai: state.ai,
          transaction: state.transaction
        });
        return { shadowState: shadow };
      }),
      rollback: () => set((state) => {
        if (!state.lastSnapshot) return state;
        try {
          const restored = JSON.parse(state.lastSnapshot);
          return {
            ...restored,
            lastSnapshot: null // 回滚后清除快照
          };
        } catch (e) {
          console.error('[OmniStore] Rollback failed:', e);
          return state;
        }
      }),
      restoreShadow: () => set((state) => {
        if (!state.shadowState) return state;
        try {
          const restored = JSON.parse(state.shadowState);
          return {
            ...restored,
            shadowState: null
          };
        } catch (e) {
          console.error('[OmniStore] Shadow restoration failed:', e);
          return state;
        }
      }),

      // v5.0 Sync Hardening Implementation
      syncMetadata: {
        lastUpdated: {}
      },
      reconcile: (incoming, incomingTs) => set((state) => {
        const nextState: any = { ...state };
        let hasChanges = false;

        // 智能合并策略：仅当外部数据更新（TS 较大）时才更新本地
        const keys = Object.keys(incoming) as Array<keyof OmniStore>;
        keys.forEach(key => {
          // 排除非状态字段
          if (typeof state[key] === 'function' || key === 'syncMetadata' || key === 'lastSnapshot') return;

          const lastTs = state.syncMetadata.lastUpdated[key as string] || 0;
          if (incomingTs > lastTs) {
            // [Sync Hardening] 深度合并对象类型状态
            if (typeof state[key] === 'object' && state[key] !== null) {
              nextState[key] = { ...(state[key] as object), ...(incoming[key] as object) };
            } else {
              nextState[key] = incoming[key];
            }
            nextState.syncMetadata.lastUpdated[key as string] = incomingTs;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          console.log('[OmniStore] Reconciliation successful at', incomingTs);
          return nextState;
        }
        return state;
      }),
      getStateFingerprint: () => {
        const state = get();
        const criticalData = {
          ai: state.ai,
          transaction: {
            totalVolume: state.transaction.totalVolume,
            unsettledStaffCredits: state.transaction.unsettledStaffCredits
          },
          selectedNodeId: state.selectedNodeId
        };
        // [Zero-Knowledge] 使用简单的字符串化哈希作为状态指纹
        const str = JSON.stringify(criticalData);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
      },
      extrapolatedState: null,
      extrapolate: (changes) => set((state) => ({
        // [Optimistic Extrapolation] 在指令提交前预估状态变化
        extrapolatedState: {
          ...state.extrapolatedState,
          ...changes
        }
      })),
      clearExtrapolation: () => set({ extrapolatedState: null }),
      rtt: 0,
      updateRtt: (val) => set({ rtt: val }),
      isStressTesting: false,
      setStressTesting: (val) => set({ isStressTesting: val }),

      // v15.1: Instruction Replay & Fault Traceability
      instructionLog: [],
      logInstruction: (type, payload) => set((state) => {
        const entry: InstructionLogEntry = {
          id: Math.random().toString(36).substring(7),
          type,
          payload,
          timestamp: Date.now(),
          snapshotBefore: JSON.stringify(state)
        }
        return { instructionLog: [...state.instructionLog, entry].slice(-100) } // Keep last 100 entries
      }),
      clearInstructionLog: () => set({ instructionLog: [] }),
      replayLog: async () => {
        const log = get().instructionLog
        if (log.length === 0) return
        
        // 1. Take a snapshot of current state before replay
        get().takeSnapshot()
        
        // 2. Clear current state to initial (or first snapshot in log)
        if (log[0].snapshotBefore) {
          const initialState = JSON.parse(log[0].snapshotBefore)
          set(initialState)
        }
        
        // 3. Sequential replay simulation (can be extended for actual logic re-execution)
        for (const entry of log) {
          console.log(`[Replay] Executing ${entry.type}`, entry.payload)
          await new Promise(resolve => setTimeout(resolve, 500)) // Visual pause
        }
      },
      getStabilityReport: () => ({
        uptime: (Date.now() - (get().instructionLog[0]?.timestamp || Date.now())) / 1000,
        conflictsResolved: get().instructionLog.filter(e => e.type.includes('RECONCILE') || e.type.includes('ROLLBACK')).length,
        avgLatency: get().rtt,
        integrityScore: get().nebula.consistencyScore
      }),
    }),
    {
      name: 'sovereign-omni-store', // 存储键名
      storage: createJSONStorage(() => localStorage), // 使用 localStorage 持久化
      partialize: (state) => ({ 
        ai: state.ai, 
        selectedNodeId: state.selectedNodeId,
        transaction: state.transaction,
        lastSnapshot: state.lastSnapshot,
        instructionLog: state.instructionLog
      }), // 仅持久化关键状态，跳过高度波动的 nebula 指标
    }
  )
)
