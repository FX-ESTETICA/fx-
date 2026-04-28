"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { getCroppedImg } from "@/utils/cropImage";
import { useTranslations } from "next-intl";
import { useHardwareBack } from "@/hooks/useHardwareBack";

interface StudioImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onComplete: (croppedFile: File) => Promise<void>;
}

export const StudioImageCropModal = ({ isOpen, imageSrc, onClose, onComplete }: StudioImageCropModalProps) => {
    const t = useTranslations('StudioImageCropModal');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const registerBack = useHardwareBack(state => state.register);
  const unregisterBack = useHardwareBack(state => state.unregister);

  useEffect(() => {
    if (isOpen) {
      registerBack('studio-crop-modal', () => {
        onClose();
        return true;
      }, 50);
    } else {
      unregisterBack('studio-crop-modal');
    }
    return () => unregisterBack('studio-crop-modal');
  }, [isOpen, onClose, registerBack, unregisterBack]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], "cover.jpg", { type: "image/jpeg" });
      await onComplete(file);
      onClose();
    } catch (e) {
      console.error(e);
      alert("裁剪失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 ">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl h-[85vh] flex flex-col bg-black border border-white/10 rounded-3xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/50 z-10">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-1.5 h-1.5 rounded-full  animate-pulse " />
                <h2 className="text-sm font-bold tracking-[0.2em] text-white ">
                  {t('txt_6d5d49')}</h2>
              </div>
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cropper Area */}
            <div className="relative flex-1 bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                cropShape="rect"
                showGrid={true}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                style={{
                  containerStyle: { background: 'transparent' },
                  cropAreaStyle: { border: '2px solid rgba(0,240,255,0.8)', boxShadow: '0 0 30px rgba(0,240,255,0.3)' }
                }}
              />
            </div>

            {/* Controls */}
            <div className="p-6 bg-black/80 border-t border-white/5 z-10 space-y-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-white">{t('txt_05853d')}</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gx-cyan cursor-pointer"
                />
              </div>
              
              <Button
                variant="cyan"
                className="w-full py-4 rounded-xl font-bold tracking-widest uppercase flex items-center justify-center gap-2"
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t('txt_2fb90b')}</>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t('txt_b8abb4')}</>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
