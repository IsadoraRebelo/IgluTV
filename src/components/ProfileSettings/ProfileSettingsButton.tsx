'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type BannerShowOption } from './actions';
import { AvatarUploadView } from './AvatarUploadView';
import { BannerImagesView } from './BannerImagesView';
import { BannerShowsView } from './BannerShowsView';
import { EditProfileView } from './EditProfileView';

type View = 'edit' | 'shows' | 'images' | 'picture';

export function ProfileSettingsButton({
  username,
  avatarUrl,
  bannerUrl,
}: {
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('edit');
  const [selectedShow, setSelectedShow] = useState<BannerShowOption | null>(
    null
  );
  const router = useRouter();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setView('edit');
      setSelectedShow(null);
    }
  }

  function handleApplied() {
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="Profile settings"
          className="absolute right-4 md:right-2 top-5 md:top-auto md:bottom-0 z-10 flex h-9 w-9 md:h-5 md:w-5 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 md:right-25 md:h-9 md:w-9"
        >
          <Settings className="md:h-5 md:w-5 h-4 w-4" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/70" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-background fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-lg shadow-2xl max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[90vw] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          <DialogPrimitive.Title className="sr-only">
            Profile settings
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Change your username and banner
          </DialogPrimitive.Description>

          {view === 'edit' ? (
            <EditProfileView
              username={username}
              avatarUrl={avatarUrl}
              bannerUrl={bannerUrl}
              onClose={() => handleOpenChange(false)}
              onChangeBanner={() => setView('shows')}
              onChangePicture={() => setView('picture')}
            />
          ) : null}

          {view === 'shows' ? (
            <BannerShowsView
              onCancel={() => setView('edit')}
              onSelectShow={(show) => {
                setSelectedShow(show);
                setView('images');
              }}
            />
          ) : null}

          {view === 'images' && selectedShow ? (
            <BannerImagesView
              key={selectedShow.id}
              show={selectedShow}
              onBack={() => setView('shows')}
              onApplied={handleApplied}
            />
          ) : null}

          {view === 'picture' ? (
            <AvatarUploadView
              currentAvatarUrl={avatarUrl}
              onCancel={() => setView('edit')}
              onApplied={handleApplied}
            />
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
