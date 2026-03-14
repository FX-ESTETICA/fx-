import { useCallback } from 'react'
import { StaffMember } from '@/utils/calendar-constants'

interface UseStaffSelectionProps {
  staffMembers: StaffMember[]
  selectedStaffId: string
  setSelectedStaffId: (id: string) => void
  selectedStaffIds: string[]
  setSelectedStaffIds: (ids: string[]) => void
  isDesignatedMode: boolean
  setIsDesignatedMode: (mode: boolean) => void
  itemStaffMap: Record<string, string>
  setItemStaffMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  newTitle: string
}

export function useStaffSelection({
  staffMembers,
  selectedStaffId,
  setSelectedStaffId,
  selectedStaffIds,
  setSelectedStaffIds,
  isDesignatedMode,
  setIsDesignatedMode,
  itemStaffMap,
  setItemStaffMap,
  newTitle
}: UseStaffSelectionProps) {

  const handleStaffClick = useCallback((staffId: string) => {
    const currentItems = newTitle.split(',').map(s => s.trim()).filter(Boolean)
    
    if (staffId === 'NO') {
      setSelectedStaffId('NO')
      setSelectedStaffIds([])
      return
    }
    
    const isAlreadySelected = selectedStaffIds.includes(staffId)
    if (isAlreadySelected) {
      const newIds = selectedStaffIds.filter(id => id !== staffId)
      setSelectedStaffIds(newIds)
      
      if (currentItems.length > 0) {
        setItemStaffMap(prev => {
          const newMap = { ...prev }
          if (newIds.length === 1 && !isDesignatedMode) {
            currentItems.forEach(it => { newMap[it] = newIds[0] })
          } else {
            currentItems.forEach(it => { if (newMap[it] === staffId) delete newMap[it] })
          }
          return newMap
        })
      }
      if (selectedStaffId === staffId) {
        setSelectedStaffId(newIds.length > 0 ? newIds[0] : '')
      }
    } else {
      const newSelectedIds = [...selectedStaffIds, staffId]
      setSelectedStaffId(staffId)
      setSelectedStaffIds(newSelectedIds)
      
      if (currentItems.length > 0 && !isDesignatedMode) {
        setItemStaffMap(prev => {
          const newMap = { ...prev }
          if (newSelectedIds.length === 1) {
            currentItems.forEach(it => { newMap[it] = newSelectedIds[0] })
          } else {
            currentItems.forEach((it, idx) => {
              newMap[it] = newSelectedIds[idx % newSelectedIds.length]
            })
          }
          return newMap
        })
      }
    }
  }, [newTitle, selectedStaffIds, isDesignatedMode, setSelectedStaffId, setSelectedStaffIds, setItemStaffMap])

  const handleAverageDistribution = useCallback(() => {
    const currentItems = newTitle.split(',').map(s => s.trim()).filter(Boolean)
    if (currentItems.length > 0 && selectedStaffIds.length > 1) {
      setItemStaffMap(prev => {
        const newMap = { ...prev }
        currentItems.forEach((it, idx) => {
          newMap[it] = selectedStaffIds[idx % selectedStaffIds.length]
        })
        return newMap
      })
    }
  }, [newTitle, selectedStaffIds, setItemStaffMap])

  return {
    staffMembers,
    selectedStaffId,
    selectedStaffIds,
    isDesignatedMode,
    itemStaffMap,
    handleStaffClick,
    handleAverageDistribution,
    setIsDesignatedMode
  }
}
