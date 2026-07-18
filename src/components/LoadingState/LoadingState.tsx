export function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div
        role="status"
        aria-label="Loading"
        className="border-surface border-t-text-secondary h-8 w-8 animate-spin rounded-full border-2"
      />
    </div>
  );
}
