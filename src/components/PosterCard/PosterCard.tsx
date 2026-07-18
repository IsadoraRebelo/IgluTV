import Image from 'next/image';
import Link from 'next/link';

import { WatchProgressBar } from '@/components/WatchProgressBar/WatchProgressBar';

import type { ShowStatus, ShowSummary } from '@/types';

import { cn } from '@/utils';

export type PosterCardShow = Pick<ShowSummary, 'id' | 'name' | 'posterUrl'> & {
  markableEpisodeCount?: number;
};

type PosterCardDefaultProps = {
  variant?: 'default';
  show: PosterCardShow;
  caption?: string;
  className?: string;
  sizes?: string;
  progress?: { watchedCount: number; showStatus: ShowStatus | null };
};

type PosterCardOverlayProps = {
  variant: 'overlay';
  href: string;
  posterUrl: string | null;
  imageAlt: string;
  overlay: { title: string; subtitle?: string };
  className?: string;
  sizes?: string;
};

export function PosterCard(
  props: PosterCardDefaultProps | PosterCardOverlayProps
) {
  if (props.variant === 'overlay') {
    const {
      href,
      posterUrl,
      imageAlt,
      overlay,
      className,
      sizes = '(max-width: 640px) 33vw, 20vw',
    } = props;
    return (
      <Link
        href={href}
        className={cn(
          'relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#2c3440]',
          className
        )}
      >
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={imageAlt}
            fill
            sizes={sizes}
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 p-3">
          <div className="truncate text-base font-semibold text-white">
            {overlay.title}
          </div>
          {overlay.subtitle ? (
            <div className="truncate text-xs tracking-wide text-white/70 uppercase">
              {overlay.subtitle}
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  const { show, caption, className, sizes = '128px', progress } = props;

  return (
    <Link
      href={`/show/${show.id}`}
      className={cn('flex flex-col gap-1', className)}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-[#2c3440]">
        {show.posterUrl ? (
          <Image
            src={show.posterUrl}
            alt={show.name}
            fill
            sizes={sizes}
            className="object-cover"
          />
        ) : null}
        {progress ? (
          <WatchProgressBar
            watchedCount={progress.watchedCount}
            markableCount={show.markableEpisodeCount ?? 0}
            showStatus={progress.showStatus}
            showCount={false}
            className="absolute inset-x-0 bottom-0 h-1"
          />
        ) : null}
      </div>
      {caption ? (
        <p className="truncate text-xs text-[#8a9bab]">{caption}</p>
      ) : null}
    </Link>
  );
}
