'use server';

import {CreateBook, IBook, TextSegment} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import {generateSlug, serializeData, escapeRegex} from "@/lib/utils";
import Book from '@/database/models/book.model';
import BookSegment from "@/database/models/bookSegment.model";
import mongoose, { type ClientSession } from 'mongoose';
import {revalidatePath} from "next/cache";
import { auth } from '@clerk/nextjs/server';
import { getServerSubscription } from '@/lib/subscription-server';

export const getAllBooks = async (query?: string) => {
  try {
    await connectToDatabase();

    let filter = {};
    if (query) {
      const regex = new RegExp(escapeRegex(query), 'i');
      filter = {
        $or: [
          { title: { $regex: regex } },
          { author: { $regex: regex } },
        ],
      };
    }

    const books = await Book.find(filter).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      data: serializeData(books),
    }
  } catch (e) {
    console.error('Error connecting to database: ', e);
    return {
      success: false,
      error: e,
    }
  }
}

export const checkBookExists = async (title: string) => {
  try {
    await connectToDatabase();

    const slug = generateSlug(title);

    const existingBook = await Book.findOne({ slug }).lean();

    if (existingBook) {
      return {
        exists: true,
        book: serializeData(existingBook),
      }
    }

    return {
      exists: false,
    }
  } catch (e) {
    console.log('Error checking book exists: ', e);
    return {
      exists: false,
      error: e,
    }
  }
}

export const createBook = async (data: CreateBook) => {
  let session: ClientSession | null = null;
  try {
    const { userId } = await auth();

    if (!userId || userId !== data.clerkId) {
      return {
        success: false,
        error: 'Unauthorized to create a book for this user.',
      };
    }

    await connectToDatabase();
    session = await mongoose.startSession();
    session.startTransaction();

    const slug = generateSlug(data.title);

    // Check if book already exists (can be done inside or outside, but safer inside)
    const existingBook = await Book.findOne({ slug }).session(session).lean();

    if (existingBook) {
      await session.commitTransaction();
      return {
        success: true,
        data: serializeData(existingBook),
        alreadyExists: true,
      };
    }

    const subscription = await getServerSubscription();
    // Re-check count inside transaction
    const totalBooks = await Book.countDocuments({ clerkId: data.clerkId }).session(session);

    if (totalBooks >= subscription.limits.maxBooks) {
      await session.abortTransaction();
      return {
        success: false,
        error: `You reached your ${subscription.plan} plan limit of ${subscription.limits.maxBooks} book(s).`,
        isBillingError: true,
      };
    }

    const [book] = await Book.create([{ ...data, slug, totalSegments: 0 }], { session });

    await session.commitTransaction();

    revalidatePath('/');

    return {
      success: true,
      data: serializeData(book),
    };
  } catch (e) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('Error creating book: ', e);
    return {
      success: false,
      error: e,
    };
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const getBookBySlug = async (slug: string) => {
  try {
    await connectToDatabase();

    const book = await Book.findOne({ slug }).lean();

    if (!book) {
      return { success: false, error: 'Book not found' };
    }

    return {
      success: true,
      data: serializeData(book) as IBook,
    };
  } catch (e) {
    console.error('Error fetching book by slug: ', e);
    return { success: false, error: e };
  }
};

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
  let session: ClientSession | null = null;

  try {
    const conn = await connectToDatabase();
    session = await conn.startSession();
    session.startTransaction();

    console.log('Saving book segments...');

    const segmentsToInsert = segments.map(({text, segmentIndex, pageNumber, wordCount}) => ({
      clerkId,
      bookId,
      content: text,
      segmentIndex,
      pageNumber,
      wordCount,
    }));

    await BookSegment.insertMany(segmentsToInsert, {session});

    await Book.findByIdAndUpdate(bookId, {totalSegments: segments.length}, {session});

    await session.commitTransaction();

    console.log('Book segments saved successfully.');

    return {
      success: true,
      data: {segmentsCreated: segments.length}
    }
  } catch (e) {
    console.error('Error saving book segments: ', e);

    const activeSession = session;
    if (activeSession && activeSession.inTransaction()) {
      await activeSession.abortTransaction();
    }

    await Book.findByIdAndDelete(bookId);
    console.log('Deleted book due to failure to save segments.');

    return {
      success: false,
      error: e,
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export const searchBookSegments = async (
  bookId: string,
  query: string,
  segmentCount = 3,
) => {
  try {
    if (!bookId?.trim() || !query?.trim()) {
      return { success: true, data: [] as Array<{ segmentIndex: number; content: string }> };
    }

    await connectToDatabase();

    const segments = await BookSegment.find(
      {
        bookId,
        $text: { $search: query.trim() },
      },
      {
        _id: 0,
        content: 1,
        segmentIndex: 1,
        score: { $meta: 'textScore' },
      },
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(segmentCount)
      .lean();

    return {
      success: true,
      data: segments as Array<{ segmentIndex: number; content: string }>,
    };
  } catch (e) {
    console.error('Error searching book segments: ', e);
    return {
      success: false,
      error: e,
      data: [] as Array<{ segmentIndex: number; content: string }>,
    };
  }
};
