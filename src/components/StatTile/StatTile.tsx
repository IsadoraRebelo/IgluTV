import type { ComponentType } from "react";

export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl md:bg-white/[0.03] md:px-4 py-1 md:py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5">
        <Icon className="text-accent h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-md md:text-xl font-bold text-white">{value}</span>
        <span className="text-muted-foreground text-[10px] md:text-xs">{label}</span>
      </div>
    </div>
  );
}
