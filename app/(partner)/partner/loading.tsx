import { ContentContainer } from "@/components/shared/content-container";
import { DashboardSkeleton } from "@/features/dashboard/components";

export default function Loading() {
  return (
    <ContentContainer>
      <DashboardSkeleton metricCount={6} />
    </ContentContainer>
  );
}
