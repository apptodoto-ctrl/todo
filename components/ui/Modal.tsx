"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

/** true cuando la pantalla es de móvil (el modal se comporta como hoja inferior) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-md",
}: ModalProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Cierra con Escape y bloquea el scroll del fondo
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const panelMotion = isMobile
    ? {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { type: "spring" as const, damping: 34, stiffness: 360 },
      }
    : {
        initial: { scale: 0.94, y: 18, opacity: 0 },
        animate: { scale: 1, y: 0, opacity: 1 },
        exit: { scale: 0.94, y: 18, opacity: 0 },
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
      };

  const dragProps = isMobile
    ? {
        drag: "y" as const,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.4 },
        onDragEnd: (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
          if (info.offset.y > 110 || info.velocity.y > 700) onClose();
        },
      }
    : {};

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            {...panelMotion}
            {...dragProps}
            className={`bg-white w-full ${maxWidth} shadow-2xl shadow-black/25 flex flex-col rounded-t-[28px] sm:rounded-3xl max-h-[92dvh] sm:max-h-[90vh] pb-safe sm:pb-0`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Tirador (solo móvil) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-11 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Encabezado */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-base truncate">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 sm:w-8 sm:h-8 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="overflow-y-auto touch-scroll px-5 sm:px-6 py-5 flex-1">{children}</div>

            {/* Pie */}
            {footer && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 shrink-0 border-t border-slate-100 sm:border-t-0 bg-white rounded-b-3xl">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
