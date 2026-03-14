import React from 'react'
import { StaffMember } from '@/utils/calendar-constants'
import { Keypad, KeypadDisplay } from '@/modules/core/components/Keypad'

interface KeypadOverlayProps {
  keypadTargetKey: { key: string; staffId?: string; basePrice?: number; name?: string } | null
  manualTotalAmount: string | null
  setManualTotalAmount: (val: string | null | ((prev: string | null) => string | null)) => void
  staffAmounts: Record<string, string>
  setStaffAmounts: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  customItemPrices: Record<string, string>
  setCustomItemPrices: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  staffMembers: StaffMember[]
  setShowCustomKeypad: (show: boolean) => void
}

export const KeypadOverlay: React.FC<KeypadOverlayProps> = ({
  keypadTargetKey,
  manualTotalAmount,
  setManualTotalAmount,
  staffAmounts,
  setStaffAmounts,
  customItemPrices,
  setCustomItemPrices,
  staffMembers,
  setShowCustomKeypad
}) => {

  if (!keypadTargetKey) return null

  const { key, staffId, basePrice, name } = keypadTargetKey

  const displayValue = key === 'TOTAL' ? (manualTotalAmount || '0') : (
    key.startsWith('STAFF_') ? (staffAmounts[key.replace('STAFF_', '')] || '0') : (
      customItemPrices[key] || '0'
    )
  )

  const handleNumberClick = (num: number) => {
    if (key === 'TOTAL') {
      setManualTotalAmount(prev => (prev || '') + num.toString());
      return;
    }

    const isStaffAmount = key.startsWith('STAFF_');
    if (isStaffAmount) {
      const staffName = key.replace('STAFF_', '');
      const current = (staffAmounts || {})[staffName] || '';
      const newVal = current + num.toString();
      const oldVal = current || '0';
      const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
      
      setStaffAmounts(prev => ({ ...(prev || {}), [staffName]: newVal }));
      if (manualTotalAmount !== null) {
        setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
      }
      return;
    }

    const current = (customItemPrices || {})[key] || '';
    const newVal = current + num.toString();
    const oldVal = (customItemPrices || {})[key] || (Number(basePrice) || 0).toString();
    const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
    
    setCustomItemPrices(prev => ({ ...(prev || {}), [key]: newVal }));
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff && staff.id !== 'NO') {
      setStaffAmounts(prev => {
        const newStaffAmount = (Number(prev[staff.name] || 0) + diff).toString();
        return { ...prev, [staff.name]: newStaffAmount };
      });
    }
    if (manualTotalAmount !== null) {
      setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
    }
  }

  const handleClearClick = () => {
    if (key === 'TOTAL') {
      if (manualTotalAmount === '' || manualTotalAmount === null) {
        setManualTotalAmount(null);
      } else {
        setManualTotalAmount('');
      }
      return;
    }

    const isStaffAmount = key.startsWith('STAFF_');
    if (isStaffAmount) {
      const staffName = key.replace('STAFF_', '');
      const oldVal = (staffAmounts || {})[staffName] || '0';
      const diff = -Number(oldVal);
      setStaffAmounts(prev => ({ ...(prev || {}), [staffName]: '' }));
      if (manualTotalAmount !== null) {
        setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
      }
      return;
    }

    setCustomItemPrices(prev => ({ ...(prev || {}), [key]: '' }));
    const oldVal = (customItemPrices || {})[key] || (Number(basePrice) || 0).toString();
    const diff = -Number(oldVal);
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff && staff.id !== 'NO') {
      setStaffAmounts(prev => {
        const newStaffAmount = (Number(prev[staff.name] || 0) + diff).toString();
        return { ...prev, [staff.name]: newStaffAmount };
      });
    }
    if (manualTotalAmount !== null) {
      setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
    }
  }

  const handleBackspaceClick = () => {
    if (key === 'TOTAL') {
      setManualTotalAmount(prev => (prev || '').slice(0, -1));
      return;
    }

    const isStaffAmount = key.startsWith('STAFF_');
    if (isStaffAmount) {
      const staffName = key.replace('STAFF_', '');
      const current = (staffAmounts || {})[staffName] || '';
      if (current.length === 0) return;
      const newVal = current.slice(0, -1);
      const oldVal = current || '0';
      const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
      
      setStaffAmounts(prev => ({ ...(prev || {}), [staffName]: newVal }));
      if (manualTotalAmount !== null) {
        setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
      }
      return;
    }

    const current = (customItemPrices || {})[key] || '';
    if (current.length === 0) return;
    const newVal = current.slice(0, -1);
    const oldVal = (customItemPrices || {})[key] || (Number(basePrice) || 0).toString();
    const diff = (Number(newVal) || 0) - (Number(oldVal) || 0);
    
    setCustomItemPrices(prev => ({ ...(prev || {}), [key]: newVal }));
    const staff = staffMembers.find(s => s.id === staffId);
    if (staff && staff.id !== 'NO') {
      setStaffAmounts(prev => {
        const newStaffAmount = (Number(prev[staff.name] || 0) + diff).toString();
        return { ...prev, [staff.name]: newStaffAmount };
      });
    }
    if (manualTotalAmount !== null) {
      setManualTotalAmount(prev => (Number(prev || 0) + diff).toString());
    }
  }

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <KeypadDisplay 
        label={name || '金额'}
        value={displayValue}
      />

      <Keypad 
        onNumberClick={handleNumberClick}
        onClearClick={handleClearClick}
        onBackspaceClick={handleBackspaceClick}
        className="flex-1"
      />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <button
          type="button"
          onClick={() => setShowCustomKeypad(false)}
          className="py-4 rounded-2xl bg-white/5 text-white/40 font-black italic text-sm uppercase tracking-[0.2em] border border-white/5 active:scale-95 transition-all"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => setShowCustomKeypad(false)}
          className="py-4 rounded-2xl bg-white text-zinc-950 font-black italic text-sm uppercase tracking-[0.2em] shadow-xl shadow-white/10 active:scale-95 transition-all"
        >
          OK
        </button>
      </div>
    </div>
  )
}
