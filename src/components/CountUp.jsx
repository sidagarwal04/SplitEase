import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

export default function CountUp({
  value = 0,
  duration = 0.9,
  formatter = (n) => n.toFixed(2),
  className = '',
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, Number(value) || 0, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(latest),
    });
    prev.current = Number(value) || 0;
    return () => controls.stop();
  }, [value, duration]);

  return <span className={className}>{formatter(display)}</span>;
}
