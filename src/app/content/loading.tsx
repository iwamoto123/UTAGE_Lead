import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return <SkeletonPage title="コンテンツKPI" cards={6} rows={10} />;
}
