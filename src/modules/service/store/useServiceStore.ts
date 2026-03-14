import { create } from 'zustand'
import { Service } from '@/modules/core/types/omni-flow'

interface ServiceState {
  services: Service[]
  isLoading: boolean
  error: string | null

  // Actions
  setServices: (services: Service[]) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // 辅助方法
  getServicesByMerchant: (merchantId: string) => Service[]
  getServiceById: (id: string) => Service | undefined
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  isLoading: false,
  error: null,

  setServices: (services) => set({ services }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getServicesByMerchant: (merchantId) => {
    return get().services.filter(s => s.merchant_id === merchantId)
  },

  getServiceById: (id) => {
    return get().services.find(s => s.id === id)
  }
}))
