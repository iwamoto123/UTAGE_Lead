import { SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return <SkeletonPage title="入力状況" cards={3} rows={8} />;
}
