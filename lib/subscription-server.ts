import 'server-only';

import { auth } from '@clerk/nextjs/server';

import { getPlanLimits, resolvePlanFromHas } from '@/lib/subscription-utils';

export const getServerSubscription = async () => {
  const { userId, has } = await auth();
  const plan = resolvePlanFromHas(has as (params: { plan?: string }) => boolean);

  return {
    userId,
    plan,
    limits: getPlanLimits(plan),
  };
};

