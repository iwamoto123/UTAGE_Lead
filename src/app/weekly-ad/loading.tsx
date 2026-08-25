import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return <SkeletonPage title="週次広告レポート" cards={4} rows={8} />;
}
