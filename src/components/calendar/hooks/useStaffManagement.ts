'use client'

import { useState, useEffect } from 'react'
import { StaffMember, STAFF_MEMBERS } from '@/utils/calendar-constants'

export function useStaffManagement(
  isMounted: boolean,
  staffMembers: StaffMember[],
  setStaffMembers: (staff: StaffMember[]) => void
) {
  const [newStaffName, setNewStaffName] = useState('')
  const [activeColorPickerStaffId, setActiveColorPickerStaffId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!isMounted) return
    const saved = localStorage.getItem('staff_members')
    if (saved) {
      try {
        setStaffMembers(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse staff_members from localStorage', e)
      }
    }
  }, [isMounted, setStaffMembers])

  useEffect(() => {
    localStorage.setItem('staff_members', JSON.stringify(staffMembers))
  }, [staffMembers])

  return {
    newStaffName,
    setNewStaffName,
    activeColorPickerStaffId,
    setActiveColorPickerStaffId,
    draggedIndex,
    setDraggedIndex
  }
}
