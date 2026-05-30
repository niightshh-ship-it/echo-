export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="w-full max-w-md">
        <div className="h-9 w-32 bg-white/10 rounded mb-6 animate-pulse" />
        <div className="space-y-3 mb-6 animate-pulse">
          <div className="h-12 rounded-xl border border-white/10" />
          <div className="h-12 rounded-xl border border-white/10" />
        </div>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 p-4">
              <div className="h-12 w-12 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-3 w-16 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
