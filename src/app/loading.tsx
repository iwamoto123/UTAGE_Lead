import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return <SkeletonPage title="月次PL" cards={4} rows={12} />;
}
