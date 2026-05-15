'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';

import { getPlanLimits, resolvePlanFromHas } from '@/lib/subscription-utils';

export const useSubscriptionPlan = () => {
  const { has, isLoaded } = useAuth();

  return useMemo(() => {
    const plan = resolvePlanFromHas(has as (params: { plan?: string }) => boolean);

    return {
      isLoaded,
      plan,
      limits: getPlanLimits(plan),
    };
  }, [has, isLoaded]);
};

