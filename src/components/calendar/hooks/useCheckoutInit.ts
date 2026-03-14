import { useEffect } from 'react'
import { format } from 'date-fns'
import { useCalendarStore } from '../store/useCalendarStore'
import { 
  SERVICE_CATEGORIES, 
  COLOR_TO_STAFF_ID, 
  getCleanColorName,
  CalendarEvent 
} from '@/utils/calendar-constants'
import { escapeRegExp } from '@/utils/calendar-helpers'

export function useCheckoutInit(mergedEvents: CalendarEvent[]) {
  const {
    showCheckoutPreview,
    staffMembers,
    staffAmounts,
    setStaffAmounts,
    setCustomItemPrices,
    setManualTotalAmount
  } = useCalendarStore()

  useEffect(() => {
    if (showCheckoutPreview && mergedEvents.length > 0) {
      setCustomItemPrices(prevPrices => {
        const newPrices = { ...prevPrices };
        const newStaffAmounts: Record<string, string> = {};
        let changed = false;

        mergedEvents.forEach((event) => {
          const ev = event as CalendarEvent;
          // --- Priority 1: billing_details (New Schema) ---
          if (ev.total_amount !== undefined && ev.total_amount !== null && ev.billing_details) {
            const details = ev.billing_details;
            
            // Items
            if (details.items) {
              details.items.forEach((item, itemIdx: number) => {
                const itemKey = `${ev.id}-${item.name}-${itemIdx}`;
                if (newPrices[itemKey] === undefined) {
                  newPrices[itemKey] = item.price.toString();
                  changed = true;
                }
              });
            }
            
            // Staff
            if (details.staff) {
              Object.entries(details.staff).forEach(([name, amount]) => {
                newStaffAmounts[name] = amount.toString();
              });
            }

            // Manual Total
            if (details.manualTotal !== undefined && details.manualTotal !== null) {
               setManualTotalAmount(details.manualTotal.toString());
            }
            
            return; // Skip legacy parsing for this event
          }

          // --- Priority 1.5: context_snapshot (Standard Metadata) ---
          const snapshot = ev.context_snapshot || {};
          if (snapshot.item_staff_map || snapshot.staff_amounts) {
            // Items & Prices
            const serviceItem = ev.service_item || '';
            const eventItems = serviceItem.split(',').map((s: string) => s.trim()).filter(Boolean);
            
            eventItems.forEach((itemName: string, itemIdx: number) => {
              const itemKey = `${ev.id}-${itemName}-${itemIdx}`;
              
              // Price
              if (newPrices[itemKey] === undefined) {
                const snapshotPrice = snapshot.custom_item_prices?.[itemKey];
                if (snapshotPrice) {
                  newPrices[itemKey] = snapshotPrice;
                  changed = true;
                } else {
                  const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name === itemName);
                  if (itemData) {
                    newPrices[itemKey] = itemData.price.toString();
                    changed = true;
                  }
                }
              }

              // Staff Mapping
              const staffId = snapshot.item_staff_map?.[itemKey] || snapshot.selected_staff_id;
              const staff = staffMembers.find(s => s.id === staffId);
              if (staff && staff.id !== 'NO') {
                const itemPrice = Number(newPrices[itemKey] || 0);
                const currentAmount = Number(newStaffAmounts[staff.name] || 0);
                newStaffAmounts[staff.name] = (currentAmount + itemPrice).toString();
              }
            });

            // Staff Amounts (Direct)
            if (snapshot.staff_amounts) {
              Object.entries(snapshot.staff_amounts as Record<string, string>).forEach(([name, amount]) => {
                newStaffAmounts[name] = amount;
              });
            }

            return; // Skip legacy parsing
          }

          // --- Priority 2: Legacy Parsing (Old Schema) ---
          const serviceItem = ev.service_item || '';
          const notes = ev.notes || '';
          const eventItems = serviceItem.split(',').map((s: string) => s.trim()).filter(Boolean);
          const isCompleted = notes.includes('[STATUS:COMPLETED]');
          
          // First, load any existing amounts from the event object (database)
          staffMembers.forEach(s => {
            const val = (ev as any)[`金额_${s.name}`];
            if (val !== undefined && val !== null && val !== 0) {
              newStaffAmounts[s.name] = val.toString();
            }
          });

          const hasSavedAmounts = Object.keys(newStaffAmounts).length > 0 || notes.includes('_AMT:');

          eventItems.forEach((itemName: string, itemIdx: number) => {
            const itemKey = `${ev.id}-${itemName}-${itemIdx}`;
            const escapedItem = escapeRegExp(itemName);
            
            // Try to load custom price from 'notes' or use default
            let currentItemPrice: string | undefined = newPrices[itemKey];
            
            if (currentItemPrice === undefined) {
              const priceMatch = notes.match(new RegExp(`\\[${escapedItem}_AMT:(\\d+)_IDX:${itemIdx}\\]`));
              
              if (priceMatch && priceMatch[1]) {
                const matchedPrice = priceMatch[1];
                currentItemPrice = matchedPrice;
                newPrices[itemKey] = matchedPrice;
                changed = true;
              } else {
                const itemData = SERVICE_CATEGORIES.flatMap(c => c.items).find(i => i.name === itemName);
                if (itemData) {
                  const priceStr = itemData.price.toString();
                  currentItemPrice = priceStr;
                  newPrices[itemKey] = priceStr;
                  changed = true;
                }
              }
            }

            // Staff amount extraction
            if (currentItemPrice && !hasSavedAmounts && !isCompleted) {
               const staffMatch = notes.match(new RegExp(`\\[${escapedItem}_STAFF:([^\\]]+)\\]`))
               
               let itemStaffId = staffMatch ? staffMatch[1] : undefined;
               if (!itemStaffId) {
                 const colorName = getCleanColorName(ev.bg_color);
                 const eventStaffIdFromColor = colorName ? COLOR_TO_STAFF_ID[colorName] : undefined;
                 itemStaffId = eventStaffIdFromColor;
               }
               
               const staff = staffMembers.find(s => s.id === itemStaffId);
               if (staff && staff.id !== 'NO') {
                 const currentAmount = Number(newStaffAmounts[staff.name] || 0);
                 newStaffAmounts[staff.name] = (currentAmount + Number(currentItemPrice)).toString();
               }
            }
          });
        });

        // Only update staff amounts if we are initializing (staffAmounts is empty) 
        // OR if we found new prices in the notes that weren't in the state
        const isStaffAmountsEmpty = Object.keys(staffAmounts).length === 0;
        if (changed || isStaffAmountsEmpty) {
          // Merge with current staffAmounts to preserve manual edits that might already exist
          const mergedStaffAmounts = { ...staffAmounts, ...newStaffAmounts };
          
          // Check if it actually changed to avoid unnecessary re-renders
          const hasRealChange = Object.entries(mergedStaffAmounts).some(([k, v]) => staffAmounts[k] !== v);
          if (hasRealChange) {
            setStaffAmounts(mergedStaffAmounts);
          }
          return newPrices;
        }
        return prevPrices;
      });
    }
  }, [showCheckoutPreview, mergedEvents, staffMembers, staffAmounts, setStaffAmounts, setCustomItemPrices, setManualTotalAmount]);
}
