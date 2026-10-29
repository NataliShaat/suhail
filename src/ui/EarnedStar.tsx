import { motion, useReducedMotion } from 'framer-motion';
import { StarIcon } from './StarIcon';

const SPARKS = [0, 60, 120, 180, 240, 300];

/** The star a visited place earns: pops in (0 → 1.3 → 1, with a twist) behind a short gold burst. */
export function EarnedStar({ size = 18, delay = 0.3 }: { size?: number; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="earned-star"
      // Map badges render in their own React root, outside MotionConfig, so reduced motion is handled here: a plain fade.
      initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -45, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { scale: [0, 1.3, 1], rotate: [-45, 14, 0], opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={reduce ? { duration: 0.3, delay } : { duration: 0.6, delay, times: [0, 0.6, 1], ease: 'easeOut' }}
      aria-hidden
    >
      {!reduce && (
        <>
          <motion.span
            className="earned-star-glow"
            initial={{ scale: 0.3, opacity: 0.95 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.6, delay: delay + 0.12, ease: 'easeOut' }}
          />
          {SPARKS.map((deg) => (
            <span key={deg} className="earned-star-ray" style={{ transform: `rotate(${deg}deg)` }}>
              <motion.span
                className="earned-star-spark"
                initial={{ x: 0, opacity: 0, scale: 1 }}
                animate={{ x: [0, size * 0.95], opacity: [1, 0], scale: [1, 0.4] }}
                transition={{ duration: 0.5, delay: delay + 0.15, ease: 'easeOut' }}
              />
            </span>
          ))}
        </>
      )}
      <StarIcon size={size} />
    </motion.span>
  );
}
