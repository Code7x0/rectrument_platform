/** Staff-added candidates with no Talent Partner attribution. */
export const INTERNAL_SOURCE_LABEL = "Internally sourced";

export const INTERNAL_SOURCE_ALLOCATION_VALUE = "__internal__";

export function isInternalSourceSelection(
  allocationId: string | null | undefined,
): boolean {
  const value = allocationId?.trim() ?? "";
  return !value || value === INTERNAL_SOURCE_ALLOCATION_VALUE;
}
