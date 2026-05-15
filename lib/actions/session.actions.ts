'use server';

import {EndSessionResult, StartSessionResult} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import VoiceSession from "@/database/models/voiceSession.model";
import {getCurrentBillingPeriodRange} from "@/lib/subscription-constants";
import { auth } from '@clerk/nextjs/server';
import { getServerSubscription } from '@/lib/subscription-server';

export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
  try {
    const { userId } = await auth();

    if (!userId || userId !== clerkId) {
      return { success: false, error: 'Unauthorized.' };
    }

    await connectToDatabase();

    const subscription = await getServerSubscription();
    const { start, end } = getCurrentBillingPeriodRange();

    const currentMonthSessions = await VoiceSession.countDocuments({
      clerkId,
      startedAt: { $gte: start, $lt: end },
    });

    if (
      subscription.limits.maxSessionsPerMonth !== null
      && currentMonthSessions >= subscription.limits.maxSessionsPerMonth
    ) {
      return {
        success: false,
        error: `You reached your monthly session limit (${subscription.limits.maxSessionsPerMonth}).`,
        isBillingError: true,
      };
    }

    const session = await VoiceSession.create({
      clerkId,
      bookId,
      startedAt: new Date(),
      billingPeriodStart: start,
      durationSeconds: 0,
    });

    return {
      success: true,
      sessionId: session._id.toString(),
      maxDurationMinutes: subscription.limits.maxSessionMinutes,
    }
  } catch (e) {
    console.error('Error starting voice session: ', e);
    return { success: false, error: 'Failed to start voice session. Please try again.'};
  }
}

export const endVoiceSession = async (sessionId: string, durationSeconds: number): Promise<EndSessionResult> => {
  try {
    await connectToDatabase();

    const session = await VoiceSession.findByIdAndUpdate(
      sessionId,
      {
        endedAt: new Date(),
        durationSeconds,
      },
      {new: true}
    );

    if (!session) {
      return {success: false, error: 'Voice session not found.'};
    }

    return {success: true};
  } catch (e) {
    console.error('Error ending voice session: ', e);
    return {success: false, error: 'Failed to end voice session. Please try again.'};
  }
};
