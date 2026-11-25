export function isUnresolvedDrimPayAttempt(
  providerReference: string | null | undefined,
  orderId: string | null | undefined,
): boolean {
  return !providerReference || (orderId !== null && orderId !== undefined && providerReference === orderId);
}
