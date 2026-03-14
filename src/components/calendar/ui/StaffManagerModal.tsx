import React from 'react'
import { X, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLOR_OPTIONS } from '@/utils/calendar-constants'

import { StaffMember } from '@/utils/calendar-constants'

interface StaffManagerModalProps {
  isStaffManagerOpen: boolean
  setIsStaffManagerOpen: (open: boolean) => void
  isCalendarLocked: boolean
  staffMembers: StaffMember[]
  setStaffMembers: (staff: StaffMember[]) => void
  newStaffName: string
  setNewStaffName: (name: string) => void
  activeColorPickerStaffId: string | null
  setActiveColorPickerStaffId: (id: string | null) => void
  draggedIndex: number | null
  setDraggedIndex: (index: number | null) => void
}

export const StaffManagerModal: React.FC<StaffManagerModalProps> = ({
  isStaffManagerOpen,
  setIsStaffManagerOpen,
  isCalendarLocked,
  staffMembers,
  setStaffMembers,
  newStaffName,
  setNewStaffName,
  activeColorPickerStaffId,
  setActiveColorPickerStaffId,
  draggedIndex,
  setDraggedIndex
}) => {
  if (!isStaffManagerOpen || isCalendarLocked) return null

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-transparent"
    >
      <div 
        className="w-full max-w-sm bg-transparent border border-white/40 rounded-[2rem] shadow-2xl overflow-hidden p-6 space-y-6 backdrop-blur-[1px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black italic tracking-widest text-white uppercase">管理服务人员</h3>
          <button type="button" onClick={() => setIsStaffManagerOpen(false)} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Add Staff */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="新员工姓名..."
              className="flex-1 bg-white/[0.01] border-none rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name = newStaffName.trim()
                  if (name) {
                    const newId = Date.now().toString()
                    setStaffMembers([...staffMembers, { 
                      id: newId, 
                      merchant_id: 'default',
                      name: name, 
                      role: '技师', 
                      avatar: name.substring(0, 2).toUpperCase(), 
                      color: 'border-sky-400', 
                      bgColor: 'bg-sky-400/10',
                      commission_rate: 0.3
                    }])
                    setNewStaffName('')
                  }
                }
              }}
            />
            <button 
              type="button"
              onClick={() => {
                const name = newStaffName.trim()
                if (name) {
                  const newId = Date.now().toString()
                  setStaffMembers([...staffMembers, { 
                    id: newId, 
                    merchant_id: 'default',
                    name: name, 
                    role: '技师', 
                    avatar: name.substring(0, 2).toUpperCase(), 
                    color: 'border-sky-400', 
                    bgColor: 'bg-sky-400/10',
                    commission_rate: 0.3
                  }])
                  setNewStaffName('')
                }
              }}
              className="px-4 py-2 bg-white text-black rounded-xl text-xs font-black hover:bg-zinc-200"
            >
              添加
            </button>
          </div>

          {/* Staff List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
            {staffMembers.map((staff, index) => (
              <div 
                key={staff.id} 
                draggable={staff.id !== 'NO'}
                onDragStart={(e) => {
                  if (staff.id === 'NO') return;
                  setDraggedIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  const img = new Image();
                  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                  e.dataTransfer.setDragImage(img, 0, 0);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedIndex === null || draggedIndex === index || staff.id === 'NO') return;
                  
                  const newStaff = [...staffMembers];
                  const draggedStaff = newStaff[draggedIndex];
                  newStaff.splice(draggedIndex, 1);
                  newStaff.splice(index, 0, draggedStaff);
                  setStaffMembers(newStaff);
                  setDraggedIndex(index);
                }}
                onDragEnd={() => setDraggedIndex(null)}
                className={cn(
                  "relative flex items-center justify-between p-3 bg-white/5 rounded-2xl group hover:bg-white/10",
                  staff.id !== 'NO' ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                  draggedIndex === index && "opacity-50 border-2 border-white/20",
                  staff.hidden && "opacity-40"
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveColorPickerStaffId(activeColorPickerStaffId === staff.id ? null : staff.id);
                    }}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shrink-0",
                      staff.bgColor?.replace('/10', '') || 'bg-sky-400'
                    )}
                  >
                    {staff.avatar}
                  </button>
                  
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{staff.name}</span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{staff.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {staff.id !== 'NO' && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStaffMembers(staffMembers.map(s => 
                          s.id === staff.id ? { ...s, hidden: !s.hidden } : s
                        ))
                      }}
                      className={cn(
                        "p-2",
                        staff.hidden ? "text-zinc-600 hover:text-zinc-400" : "text-white/40 hover:text-white"
                      )}
                      title={staff.hidden ? "显示该员工" : "隐藏该员工"}
                    >
                      {staff.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}

                  {staff.id !== 'NO' && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStaffMembers(staffMembers.filter(s => s.id !== staff.id))
                      }}
                      className="p-2 text-rose-500/30 hover:text-rose-500"
                      title="删除员工"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Color Picker Popup */}
                {activeColorPickerStaffId === staff.id && (
                  <div className="absolute left-14 top-0 z-[120] w-48 p-3 bg-transparent backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => {
                            setStaffMembers(staffMembers.map(s => 
                              s.id === staff.id 
                                ? { ...s, bgColor: `${color.value}/10`, color: `border-${color.value.split('-')[1]}-500` } 
                                : s
                            ))
                            setActiveColorPickerStaffId(null)
                          }}
                          className={cn(
                            "w-6 h-6 rounded-full",
                            color.value,
                            staff.bgColor?.includes(color.value) ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900" : ""
                          )}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9px] text-zinc-500 text-center uppercase tracking-[0.2em]">
          员工信息将自动保存
        </p>
      </div>
    </div>
  )
}
