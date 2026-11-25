const VIP_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

type VipEntitlement = {
  isVip: boolean;
  vipExpiresAt: Date | null;
};

export function isVipActive(user: VipEntitlement, now = new Date()): boolean {
  return user.isVip && (!user.vipExpiresAt || user.vipExpiresAt.getTime() > now.getTime());
}

export function nextVipExpiration(currentExpiry: Date | null | undefined, activatedAt = new Date()): Date {
  const startAt = currentExpiry && currentExpiry.getTime() > activatedAt.getTime()
    ? currentExpiry
    : activatedAt;
  return new Date(startAt.getTime() + VIP_DURATION_MS);
}
