'use client'

import { useMemo, useState } from 'react'
import { CalendarEvent } from '@/utils/calendar-constants'
import { createClient } from '@/utils/supabase/client'

export function useRecycleBin(
  allDatabaseEvents: CalendarEvent[],
  onRestore: () => void, 
  onDelete: () => void
) {
  const supabase = createClient()
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const deletedEvents = useMemo(() => {
    return allDatabaseEvents.filter(e => {
      if (e.status !== 'deleted') return false
      
      // --- 建立 context_snapshot 标准，清理 notes 中的所有正则逻辑 ---
      const snapshot = e.context_snapshot || {}
      let deletedAtStr = snapshot.deleted_at
      
      // 降级方案：旧数据正则匹配
      if (!deletedAtStr) {
        const notes = e.notes || ''
        const deletedAtMatch = notes.match(/\[DELETED_AT:(.*?)\]/)
        if (deletedAtMatch) deletedAtStr = deletedAtMatch[1]
      }

      if (!deletedAtStr) return false
      
      try {
        const deletedAt = new Date(deletedAtStr.replace(/-/g, '/'))
        const now = new Date()
        const diffHours = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60)
        return diffHours <= 72
      } catch (err) {
        return false
      }
    }).sort((a, b) => {
      const snapshotA = a.context_snapshot || {}
      const snapshotB = b.context_snapshot || {}
      
      let timeA = snapshotA.deleted_at
      let timeB = snapshotB.deleted_at
      
      // 降级匹配
      if (!timeA) timeA = a.notes?.match(/\[DELETED_AT:(.*?)\]/)?.[1] || ''
      if (!timeB) timeB = b.notes?.match(/\[DELETED_AT:(.*?)\]/)?.[1] || ''
      
      return new Date(timeB.replace(/-/g, '/')).getTime() - new Date(timeA.replace(/-/g, '/')).getTime()
    })
  }, [allDatabaseEvents])

  const handleRestoreEvent = async (event: CalendarEvent) => {
    setIsSubmitting(true)
    
    // 清理 context_snapshot 中的 deleted_at
    const snapshot = event.context_snapshot || {}
    const { deleted_at, ...restSnapshot } = snapshot
    
    // 同时清理 notes 中的旧标识 (可选，为了纯净)
    const oldNotes = event.notes || ''
    const updatedNotes = oldNotes.replace(/,?\s?\[DELETED_AT:.*?\]/, '') || ''
    
    const { error } = await supabase
      .from('fx_events')
      .update({
        status: 'pending',
        notes: updatedNotes,
        context_snapshot: restSnapshot
      })
      .eq('id', event.id)

    if (error) {
      alert(`恢复失败: ${error.message}`)
    } else {
      onRestore()
    }
    setIsSubmitting(false)
  }

  const handlePermanentDelete = async (eventId: string) => {
    if (!confirm('确定要彻底删除此预约吗？此操作不可撤销。')) return
    
    setIsSubmitting(true)
    const { error } = await supabase
      .from('fx_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      alert(`彻底删除失败: ${error.message}`)
    } else {
      window.dispatchEvent(new CustomEvent('appointment_deleted'))
      onDelete()
    }
    setIsSubmitting(false)
  }

  return {
    deletedEvents,
    handleRestoreEvent,
    handlePermanentDelete,
    isSubmitting
  }
}
