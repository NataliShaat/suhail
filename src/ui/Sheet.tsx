import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export const sheetSpring = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

interface SheetProps {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  /** Keep the map visible and interactive behind a short sheet. */
  scrim?: boolean;
  className?: string;
}

/** A springy bottom sheet: drag the handle down or tap outside to close. */
export function Sheet({ onClose, labelledBy, children, scrim = true, className = '' }: SheetProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Move focus into the sheet for screen readers and keyboards, without a ring on the first button.
    ref.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 600) onClose();
  };

  return (
    <>
      {scrim && (
        <motion.div
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          aria-hidden
        />
      )}
      <motion.div
        ref={ref}
        role="dialog"
        tabIndex={-1}
        aria-modal={scrim}
        aria-labelledby={labelledBy}
        className={`sheet ${className}`}
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        exit={{ y: '105%', transition: { type: 'spring', stiffness: 500, damping: 48 } }}
        transition={sheetSpring}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.7 }}
        onDragEnd={onDragEnd}
      >
        <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}>
          <span className="sheet-handle" aria-hidden />
          <button className="icon-btn on-sand sheet-close" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </motion.div>
    </>
  );
}
