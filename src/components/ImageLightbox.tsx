import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!src) return;
    setZoomed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
          <motion.img
            key={src}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
            src={src}
            alt={alt}
            onClick={(e) => {
              e.stopPropagation();
              setZoomed((v) => !v);
            }}
            className={`${
              zoomed ? "max-w-none max-h-none cursor-zoom-out" : "max-w-full max-h-full cursor-zoom-in"
            } rounded-lg shadow-2xl object-contain select-none`}
            draggable={false}
          />
          {alt && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-md">
              {alt}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
