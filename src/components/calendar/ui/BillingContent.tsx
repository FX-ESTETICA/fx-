import React from 'react'
import { 
  SERVICE_CATEGORIES, 
  PRESET_PRICES, 
  COLOR_TO_STAFF_ID, 
  getCleanColorName, 
  getStaffColorClass 
} from '@/utils/calendar-constants'
import { useCheckoutInit } from '../hooks/useCheckoutInit'
import { escapeRegExp } from '@/utils/calendar-helpers'
import { BillingLayout, BillingItemRow } from '@/modules/core/components/BillingLayout'
import { StaffMember } from '@/utils/calendar-constants'

interface BillingContentProps {
  staffMembers: StaffMember[]
  itemStaffMap: Record<string, string>
  staffAmounts: Record<string, string>
  customItemPrices: Record<string, string>
  editingPriceItemKey: string | null
  showCustomKeypad: boolean
  manualTotalAmount: string | null
  showCheckoutPreview: boolean
  setShowCheckoutPreview: (show: boolean) => void
  setEditingPriceItemKey: (key: string | null) => void
  setCustomItemPrices: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setStaffAmounts: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setManualTotalAmount: (val: string | null | ((prev: string | null) => string | null)) => void
  setKeypadTargetKey: (key: { key: string; staffId?: string; basePrice?: number; name?: string } | null) => void
  setShowCustomKeypad: (show: boolean) => void
  clickedStaffId: string
  mergedEvents: any[]
  mergedTotalPrice: number
  atomicSplits: {
    merchant: number;
    staff: number;
    platform: number;
  }
  involvedStaffIds: string[]
  resourceLoadFactors: Record<string, number>
  aiSchedulingInsights: string[]
  predictedOccupancy: Record<string, number>
}

export default function BillingContent({
  staffMembers,
  itemStaffMap,
  staffAmounts,
  customItemPrices,
  editingPriceItemKey,
  showCustomKeypad,
  manualTotalAmount,
  showCheckoutPreview,
  setShowCheckoutPreview,
  setEditingPriceItemKey,
  setCustomItemPrices,
  setStaffAmounts,
  setManualTotalAmount,
  setKeypadTargetKey,
  setShowCustomKeypad,
  clickedStaffId,
  mergedEvents,
  mergedTotalPrice,
  atomicSplits,
  involvedStaffIds,
  resourceLoadFactors,
  aiSchedulingInsights,
  predictedOccupancy
}: BillingContentProps) {
  useCheckoutInit(mergedEvents);

  // Flatten all items and determine staff alignment
  const allItemRows: BillingItemRow[] = [];
  const staffFirstAppearanceIdx: Record<string, number> = {};

  mergedEvents.forEach((event: any, eventIdx: number) => {
    const serviceItem = event.service_item || '';
    const eventItems = serviceItem.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
    const notes = event.notes || '';
    const bgColor = event.bg_color || '';

    eventItems.forEach((itemName: string, idx: number) => {
      const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name.toLowerCase() === itemName.toLowerCase());
      if (!itemData) return;

      const itemKey = `${event.id}-${itemName}-${idx}`;
      
      // --- 建立 context_snapshot 标准，清理 notes 中的所有正则逻辑 ---
      const snapshot = event.context_snapshot || {};
      const snapshotStaffId = snapshot.item_staff_map?.[itemKey] || snapshot.selected_staff_id;
      
      const itemStaffId = itemStaffMap[itemKey] || snapshotStaffId || (() => {
        // 降级方案：旧数据正则匹配
        const escapedItem = escapeRegExp(itemName);
        const itemStaffMatch = notes.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`));
        if (itemStaffMatch) return itemStaffMatch[1];
        
        // 兜底方案：基于背景颜色或点击的技师
        const colorName = getCleanColorName(bgColor);
        const fallbackStaffId = eventIdx === mergedEvents.length - 1 ? clickedStaffId : undefined;
        return (colorName && COLOR_TO_STAFF_ID[colorName]) || fallbackStaffId;
      })();

      const rowIndex = allItemRows.length;
      if (itemStaffId && staffFirstAppearanceIdx[itemStaffId] === undefined) {
        staffFirstAppearanceIdx[itemStaffId] = rowIndex;
      }

      allItemRows.push({
        itemName,
        itemKey,
        itemData: {
          name: itemData.name,
          price: itemData.price
        },
        itemStaffId,
        staffFirstAppearanceIdx: staffFirstAppearanceIdx[itemStaffId]
      });
    });
  });

  // Identify extra staff (those with amounts but no items)
  const extraStaff = staffMembers.filter(s => 
    s.id !== 'NO' && 
    staffFirstAppearanceIdx[s.id] === undefined && 
    (involvedStaffIds.includes(s.id) || staffAmounts[s.name] !== undefined)
  );

  const handleUpdateItemPrice = (itemKey: string, newVal: string, diff: number, staffId?: string) => {
    setCustomItemPrices(prev => ({ ...prev, [itemKey]: newVal }));
    
    if (staffId && staffId !== 'NO') {
      const staff = staffMembers.find(s => s.id === staffId);
      if (staff) {
        setStaffAmounts(prev => {
          const newStaffAmount = (Number(prev[staff.name] || 0) + diff).toString();
          return { ...prev, [staff.name]: newStaffAmount };
        });
      }
    }
    
    if (manualTotalAmount !== null) {
      setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
    }
  };

  return (
    <BillingLayout 
      allItemRows={allItemRows}
      extraStaff={extraStaff}
      staffMembers={staffMembers}
      staffAmounts={staffAmounts}
      customItemPrices={customItemPrices}
      editingPriceItemKey={editingPriceItemKey}
      showCustomKeypad={showCustomKeypad}
      manualTotalAmount={manualTotalAmount}
      showCheckoutPreview={showCheckoutPreview}
      mergedTotalPrice={mergedTotalPrice}
      atomicSplits={atomicSplits}
      resourceLoadFactors={resourceLoadFactors}
      aiSchedulingInsights={aiSchedulingInsights}
      predictedOccupancy={predictedOccupancy}
      presetPricesMap={PRESET_PRICES}
      getStaffColorClass={getStaffColorClass}
      onClose={() => setShowCheckoutPreview(false)}
      onSetEditingPriceItemKey={setEditingPriceItemKey}
      onUpdateItemPrice={handleUpdateItemPrice}
      onOpenCustomKeypad={(target) => {
        setKeypadTargetKey(target);
        setShowCustomKeypad(true);
        if (target.key && !target.key.startsWith('STAFF_') && target.key !== 'TOTAL') {
          setCustomItemPrices(prev => ({ ...prev, [target.key]: '' }));
        }
      }}
    />
  );
}
