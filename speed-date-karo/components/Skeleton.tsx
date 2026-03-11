'use client';

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700 rounded ${className}`} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 bg-gray-800 rounded border border-gray-700 ${className}`}>
      <SkeletonLine className="h-5 w-2/3 mb-2" />
      <SkeletonLine className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonEventList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  );
}

export function SkeletonStatGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="p-4 bg-gray-800 rounded border border-gray-700 animate-pulse">
          <SkeletonLine className="h-3 w-16 mb-2" />
          <SkeletonLine className="h-8 w-12" />
        </div>
      ))}
    </div>
  );
}
