import { create } from 'zustand'
import { Resource } from '@/modules/core/types/omni-flow'

interface ResourceState {
  resources: Resource[]
  isLoading: boolean
  error: string | null
  
  // Actions
  setResources: (resources: Resource[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  
  // 辅助方法 (根据 merchant_id 过滤)
  getResourcesByMerchant: (merchantId: string) => Resource[]
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  resources: [],
  isLoading: false,
  error: null,

  setResources: (resources) => set({ resources }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getResourcesByMerchant: (merchantId) => {
    return get().resources.filter(r => r.merchant_id === merchantId)
  }
}))
