import { useState, useEffect, useRef } from 'react';

/**
 * Custom Easing Animated Count-Up Hook
 * Animates numerical values with cubic ease-out physics.
 * 
 * @param {number} targetValue - Destination value
 * @param {number} duration - Animation duration in ms (default: 1100ms)
 * @param {number} decimals - Precision decimal count (default: 0)
 * @returns {number} Current animated value
 */
export const useCountUp = (targetValue = 0, duration = 1100, decimals = 0) => {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    startValueRef.current = currentValue;
    startTimeRef.current = performance.now();

    const start = startValueRef.current;
    const end = Number(targetValue) || 0;
    const diff = end - start;

    if (diff === 0) return;

    // Custom cubic ease-out: 1 - (1 - t)^3
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const nextVal = start + diff * easedProgress;
      setCurrentValue(Number(nextVal.toFixed(decimals)));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(updateCounter);
      } else {
        setCurrentValue(end);
      }
    };

    frameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration, decimals]);

  return currentValue;
};

export default useCountUp;
