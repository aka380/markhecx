import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="stack" role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading your creative space…</span>
    </div>
  );
}
