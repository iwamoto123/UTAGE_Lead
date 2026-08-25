import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return <SkeletonPage title="リード獲得" cards={4} rows={12} />;
}
