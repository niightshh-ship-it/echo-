export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-black text-white px-4 pt-12 pb-28">
      <div className="w-full max-w-md">
        <div className="h-8 mb-6" />
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 p-5">
              <div className="h-3 w-20 bg-white/10 rounded mb-3" />
              <div className="h-4 w-40 bg-white/5 rounded" />
            </div>
          ))}
          <div className="h-12 rounded-2xl bg-red-950/20 border border-red-900/40 mt-6" />
        </div>
      </div>
    </div>
  );
}
