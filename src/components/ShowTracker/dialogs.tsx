'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';

import { Button } from '@/components';

export function CatchUpDialog({
  onYesToday,
  onYesNoDate,
  onNo,
  onNever,
}: {
  onYesToday: () => void;
  onYesNoDate: () => void;
  onNo: () => void;
  onNever: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onNo();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-primary-foreground border-muted fixed inset-x-0 bottom-0 z-50 flex w-full flex-col gap-1 rounded-t-lg border text-center shadow-lg max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-xs sm:max-w-[250px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          <DialogPrimitive.Title className="text-foreground text-md pt-4 font-semibold">
            Mark previous episodes?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground px-4 text-xs">
            Do you want to mark all previous episodes as watched?
          </DialogPrimitive.Description>
          <div className="flex flex-col pt-4">
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onYesToday}
              >
                Yes, today
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onYesNoDate}
              >
                Yes, no date
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onNo}
              >
                No
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onNever}
              >
                Never for this show
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Offered before any bulk mark-as-watched action (whole show, full season)
// to let the user choose whether the newly-marked episodes are logged with
// today's date or with no date at all.
export function DateChoiceDialog({
  title,
  onPickToday,
  onPickNoDate,
  onCancel,
}: {
  title: string;
  onPickToday: () => void;
  onPickNoDate: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-primary-foreground border-muted fixed inset-x-0 bottom-0 z-50 flex w-full flex-col gap-1 rounded-t-lg border text-center shadow-lg max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-xs sm:max-w-[250px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          <DialogPrimitive.Title className="text-foreground text-md pt-4 font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground px-4 text-xs">
            Log these episodes with today&apos;s date, or without a date?
          </DialogPrimitive.Description>
          <div className="flex flex-col pt-4">
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onPickToday}
              >
                Today
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onPickNoDate}
              >
                No date
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Offered when clicking "Mark watched" while the show is already fully
// watched — lets the user unmark the whole show instead of the click
// silently doing nothing.
export function UnmarkShowDialog({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onNo();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="max-sm:data-[state=open]:animate-fade-in max-sm:data-[state=closed]:animate-fade-out fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content className="max-sm:data-[state=open]:animate-slide-up max-sm:data-[state=closed]:animate-slide-down bg-primary-foreground border-muted fixed inset-x-0 bottom-0 z-50 flex w-full flex-col gap-1 rounded-t-lg border text-center shadow-lg max-sm:pb-[env(safe-area-inset-bottom)] sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-xs sm:max-w-[250px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg">
          <DialogPrimitive.Title className="text-foreground text-md pt-4 font-semibold">
            Mark show as unwatched?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-muted-foreground px-4 text-xs">
            This will remove every watched episode for this show.
          </DialogPrimitive.Description>
          <div className="flex flex-col pt-4">
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onYes}
              >
                Yes
              </Button>
            </div>
            <div className="border-t border-white/10 py-1">
              <Button
                variant="primary"
                className="text-accent w-full font-bold"
                size="sm"
                onClick={onNo}
              >
                No
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
