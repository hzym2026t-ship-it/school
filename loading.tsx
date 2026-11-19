/** Shown instantly while a page's data loads, so navigation feels immediate. */
export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-gray-200/80";
  return (
    <div aria-busy="true" aria-label="جارٍ التحميل">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className={`${bar} h-7 w-48`} />
          <div className={`${bar} h-4 w-72 max-w-full`} />
        </div>
        <div className={`${bar} h-9 w-28`} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} h-7 w-16`} />
          </div>
        ))}
      </div>
      <div className="card space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${bar} h-9 w-full`} />
        ))}
      </div>
    </div>
  );
}
