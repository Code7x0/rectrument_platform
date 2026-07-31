import { UnauthorizedPageClient } from "./unauthorized-page-client";

export const metadata = {
  title: "Unauthorized",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason?.trim() || "not_found";
  return <UnauthorizedPageClient reason={reason} />;
}
