import React, { useEffect, useState } from 'react';
import { Atom } from 'lucide-react';

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export const ResilientImage = React.memo(function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-200 p-4 text-center ${className}`}
      >
        <Atom className="w-8 h-8 text-sky-400 mb-2" />
        <span className="text-xs font-medium tracking-tight text-slate-300 line-clamp-2">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
});
