import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "../ui";
export function CreatorGridSkeleton() {
  return (
    <div className="creator-grid" role="status" aria-label="Loading creators">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="creator-card creator-skeleton">
          <Skeleton className="h-24 w-full" />
          <div className="panel stack">
            <Skeleton className="h-12 w-12" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
      <span className="sr-only">Loading creators…</span>
    </div>
  );
}
