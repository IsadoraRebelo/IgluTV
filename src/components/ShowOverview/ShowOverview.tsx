'use client';

import { useEffect, useRef, useState } from 'react';

export function ShowOverview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const paragraphRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = paragraphRef.current;
    if (!el) return;
    setIsTruncated(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p
        ref={paragraphRef}
        className={`mt-2 max-w-[65ch] text-[15px] leading-relaxed text-[#c2d0dd] ${
          expanded ? '' : 'line-clamp-2 md:line-clamp-5'
        }`}
      >
        {text}
      </p>
      {isTruncated || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 text-sm font-medium text-[#8a9bab] hover:text-white"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}
