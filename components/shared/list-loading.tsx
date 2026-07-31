import { ContentContainer } from "@/components/shared/content-container";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PageHeader } from "@/components/shared/page-header";

interface ListLoadingProps {
  title?: string;
  description?: string;
}

export default function ListLoading({
  title = "Loading…",
  description = "Fetching the latest records.",
}: ListLoadingProps) {
  return (
    <ContentContainer>
      <PageHeader title={title} description={description} />
      <LoadingSkeleton rows={8} />
    </ContentContainer>
  );
}
