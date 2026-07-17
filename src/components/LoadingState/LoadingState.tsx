export function LoadingState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#14181c] px-6 py-24">
      <div
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#2c3440] border-t-[#8a9bab]"
      />
    </div>
  );
}
