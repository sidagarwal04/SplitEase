import { useState } from 'react';
import { initials } from '../utils/formatters.js';
import clsx from 'clsx';

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export default function Avatar({ name, url, size = 'md', className = '' }) {
  const [errored, setErrored] = useState(false);
  const showImg = url && !errored;
  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-secondary/30 font-medium text-text ring-1 ring-white/10 overflow-hidden',
        sizes[size],
        className
      )}
      title={name}
    >
      {showImg ? (
        <img
          src={url}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}
