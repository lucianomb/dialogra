import { PLAN_SLUGS, PLANS, PlanType } from '@/lib/subscription-constants';

export type ClerkHasParams = {
  plan?: string;
};

export type ClerkHasFn = (params: ClerkHasParams) => boolean;

const hasPlan = (has: ClerkHasFn | null | undefined, slug: string) => {
  if (!has) return false;

  // Keep matching strict to avoid false positives when users downgrade/upgrade plans.
  const candidates = [
    slug,
    `u:${slug}`,
    `o:${slug}`,
  ];

  return candidates.some((plan) => has({ plan }));
};

export const resolvePlanFromHas = (has?: ClerkHasFn | null): PlanType => {
  if (hasPlan(has, PLAN_SLUGS.PRO)) {
    return 'pro';
  }

  if (hasPlan(has, PLAN_SLUGS.STANDARD)) {
    return 'standard';
  }

  return 'free';
};

export const getPlanLimits = (plan: PlanType) => PLANS[plan];

