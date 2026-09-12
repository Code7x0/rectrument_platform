/** Parse 2nd-level review audit markers stored in submission remarks. */
export function countSecondReviewRequests(remarks: string | null | undefined): number {
  if (!remarks?.trim()) {
    return 0;
  }
  const matches = remarks.match(/\[2nd Level Review Request/g);
  return matches?.length ?? 0;
}

export function latestSecondReviewRequestedAt(
  remarks: string | null | undefined,
): string | null {
  if (!remarks?.trim()) {
    return null;
  }
  const pattern =
    /\[2nd Level Review Request(?: @ ([^\]]+))?\]/g;
  let latest: string | null = null;
  for (const match of remarks.matchAll(pattern)) {
    const stamp = match[1]?.trim();
    if (stamp) {
      latest = stamp;
    }
  }
  return latest;
}

/** Initial submission + each 2nd-level review request. */
export function reviewIterationCount(
  remarks: string | null | undefined,
): number {
  return 1 + countSecondReviewRequests(remarks);
}
