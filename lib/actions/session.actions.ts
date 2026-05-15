'use server';

import mongoose, { type ClientSession } from 'mongoose';
import {EndSessionResult, StartSessionResult} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import VoiceSession from "@/database/models/voiceSession.model";
import {getCurrentBillingPeriodRange} from "@/lib/subscription-constants";
import { auth } from '@clerk/nextjs/server';
import { getServerSubscription } from '@/lib/subscription-server';

export const startVoiceSession = async (clerkId: string, bookId: string): Promise<StartSessionResult> => {
  let session: ClientSession | null = null;
  try {
    const { userId } = await auth();

    if (!userId || userId !== clerkId) {
      return { success: false, error: 'Unauthorized.' };
    }

    await connectToDatabase();
    session = await mongoose.startSession();
    session.startTransaction();

    const subscription = await getServerSubscription();
    const { start, end } = getCurrentBillingPeriodRange();

    const currentMonthSessions = await VoiceSession.countDocuments({
      clerkId,
      startedAt: { $gte: start, $lt: end },
    }).session(session);

    if (
      subscription.limits.maxSessionsPerMonth !== null
      && currentMonthSessions >= subscription.limits.maxSessionsPerMonth
    ) {
      await session.abortTransaction();
      return {
        success: false,
        error: `You reached your monthly session limit (${subscription.limits.maxSessionsPerMonth}).`,
        isBillingError: true,
      };
    }

    const [voiceSession] = await VoiceSession.create(
      [
        {
          clerkId,
          bookId,
          startedAt: new Date(),
          billingPeriodStart: start,
          durationSeconds: 0,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return {
      success: true,
      sessionId: voiceSession._id.toString(),
      maxDurationMinutes: subscription.limits.maxSessionMinutes,
    };
  } catch (e) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('Error starting voice session: ', e);
    return { success: false, error: 'Failed to start voice session. Please try again.'};
  } finally {
    if (session) {
      await session.endSession();
    }
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
