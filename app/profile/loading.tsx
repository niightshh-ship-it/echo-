export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="w-full max-w-md">
        <div className="h-8 mb-6" />
        <div className="rounded-3xl border border-white/10 p-8 mb-6 animate-pulse">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-20 w-20 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-32 bg-white/10 rounded" />
              <div className="h-4 w-24 bg-white/5 rounded" />
            </div>
          </div>
          <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
          <div className="h-4 w-1/2 bg-white/5 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          <div className="aspect-[9/16] bg-white/5 rounded-2xl" />
          <div className="aspect-[9/16] bg-white/5 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
