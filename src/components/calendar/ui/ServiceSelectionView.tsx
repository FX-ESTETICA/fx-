import { SERVICE_CATEGORIES_BY_INDUSTRY, getStaffColorClass } from '@/utils/calendar-constants'
import { ServiceGrid } from '@/modules/core/components/ServiceGrid'
import { ModalHeader } from '@/modules/core/components/ModalElements'
import { StaffMember, CalendarEvent } from '@/utils/calendar-constants'
import { IndustryType } from '@/modules/core/types/omni-flow'

interface ServiceSelectionViewProps {
  newTitle: string
  itemStaffMap: Record<string, string>
  selectedStaffId: string
  staffMembers: StaffMember[]
  editingEvent: CalendarEvent | null
  onToggleService: (service: string) => void
  industryType?: IndustryType
}

export const ServiceSelectionView: React.FC<ServiceSelectionViewProps> = ({
  newTitle,
  itemStaffMap,
  selectedStaffId,
  staffMembers,
  editingEvent,
  onToggleService,
  industryType = 'beauty'
}) => {
  const categories = SERVICE_CATEGORIES_BY_INDUSTRY[industryType] || SERVICE_CATEGORIES_BY_INDUSTRY.beauty;

  return (
    <div className="space-y-[-4px] animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Title Section - Centered */}
      <ModalHeader title={industryType === 'beauty' ? 'FX ESTETICA' : '服务选择'} className="mb-[-4px]" />

      <ServiceGrid 
        categories={categories}
        newTitle={newTitle}
        itemStaffMap={itemStaffMap}
        selectedStaffId={selectedStaffId}
        staffMembers={staffMembers}
        editingEventId={editingEvent?.id}
        onToggleService={onToggleService}
        getStaffColorClass={(id, type) => getStaffColorClass(id, staffMembers, type)}
      />
    </div>
  )
}
