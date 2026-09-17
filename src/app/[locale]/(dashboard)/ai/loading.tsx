import { Skeleton } from "@/components/ui/skeleton";

export default function AiLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
