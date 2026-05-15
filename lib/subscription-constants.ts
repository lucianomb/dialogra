export const PLAN_SLUGS = {
  STANDARD: 'standard',
  PRO: 'pro',
} as const;

export type PlanType = 'free' | 'standard' | 'pro';

export type PlanLimit = {
  maxBooks: number;
  maxSessionsPerMonth: number | null;
  maxSessionMinutes: number;
  includesSessionHistory: boolean;
};

export const PLANS: Record<PlanType, PlanLimit> = {
  free: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxSessionMinutes: 5,
    includesSessionHistory: false,
  },
  standard: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxSessionMinutes: 15,
    includesSessionHistory: true,
  },
  pro: {
    maxBooks: 100,
    maxSessionsPerMonth: null,
    maxSessionMinutes: 60,
    includesSessionHistory: true,
  },
};

export const getCurrentBillingPeriodStart = (date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

export const getCurrentBillingPeriodEnd = (date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);

export const getCurrentBillingPeriodRange = (date = new Date()) => ({
  start: getCurrentBillingPeriodStart(date),
  end: getCurrentBillingPeriodEnd(date),
});
