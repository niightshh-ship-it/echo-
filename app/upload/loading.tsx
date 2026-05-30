export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="w-full max-w-md">
        <div className="h-8 mb-8" />
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 gap-2">
            <div className="h-20 rounded-2xl border border-white/10" />
            <div className="h-20 rounded-2xl border border-white/10" />
          </div>
          <div className="h-12 rounded-xl border border-white/10" />
          <div className="h-12 rounded-xl border border-white/10" />
          <div className="h-12 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}
