import { ContentContainer } from "@/components/shared/content-container";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";

export default function JobsLoading() {
  return (
    <ContentContainer>
      <PageHeader title="Jobs" description="Loading jobs..." />
      <LoadingSkeleton rows={8} />
    </ContentContainer>
  );
}
