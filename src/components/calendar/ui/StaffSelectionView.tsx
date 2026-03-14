import React from 'react'
import { getStaffColorClass } from '@/utils/calendar-constants'
import { StaffSelector } from '@/modules/core/components/StaffSelector'
import { useStaffSelection } from '../hooks/useStaffSelection'

import { StaffMember } from '@/utils/calendar-constants'

import { LIQUID_UI_CONFIGS } from '@/modules/core/config/liquid-ui-config'
import { IndustryType } from '@/modules/core/types/omni-flow'

interface StaffSelectionViewProps {
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
  industryType?: IndustryType
  lang?: 'zh' | 'it'
}

export const StaffSelectionView: React.FC<StaffSelectionViewProps> = ({
  staffMembers,
  selectedStaffId,
  setSelectedStaffId,
  selectedStaffIds,
  setSelectedStaffIds,
  isDesignatedMode,
  setIsDesignatedMode,
  itemStaffMap,
  setItemStaffMap,
  newTitle,
  industryType = 'beauty',
  lang = 'zh'
}) => {
  const config = LIQUID_UI_CONFIGS[industryType] || LIQUID_UI_CONFIGS.generic;
  const resourceLabel = config.resourceName[lang];

  const { 
    handleStaffClick,
    handleAverageDistribution
  } = useStaffSelection({
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
  })

  return (
    <StaffSelector
      staffMembers={staffMembers}
      selectedStaffId={selectedStaffId}
      selectedStaffIds={selectedStaffIds}
      involvedStaffIds={Object.values(itemStaffMap)}
      isDesignatedMode={isDesignatedMode}
      onStaffClick={handleStaffClick}
      onDesignatedModeToggle={() => setIsDesignatedMode(!isDesignatedMode)}
      onAverageDistribution={handleAverageDistribution}
      getStaffColorClass={(id, type) => getStaffColorClass(id, staffMembers, type)}
      label={lang === 'zh' ? `选择${resourceLabel}` : `SCEGLI ${resourceLabel.toUpperCase()}`}
      designatedLabel={lang === 'zh' ? `指定${resourceLabel}` : `DESIGNATO`}
      averageLabel={lang === 'zh' ? '平均分配' : 'MEDIA'}
      industryType={industryType}
    />
  )
}
