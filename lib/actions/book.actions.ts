'use server';

import {CreateBook, TextSegment} from "@/types";
import {connectToDatabase} from "@/database/mongoose";
import {generateSlug, serializeData} from "@/lib/utils";
import Book from '@/database/models/book.model';
import BookSegment from "@/database/models/bookSegment.model";
import type {ClientSession} from 'mongoose';

export const getAllBooks = async () => {
  try {
    await connectToDatabase();

    const books = await Book.find().sort({ createdAt: -1 }).lean();

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

export const createBook = async(data: CreateBook) => {
  try {
    await connectToDatabase();

    const slug = generateSlug(data.title);

    const existingBook = await Book.findOne({ slug }).lean();

    if(existingBook) {
      return {
        success: true,
        data: serializeData(existingBook),
        alreadyExists: true,
      }
    }

    // Todo: Check subscription limits before creating a book

    const book = await Book.create({...data, slug, totalSegments: 0});

    return {
      success: true,
      data: serializeData(book),
    }
  } catch (e) {
    console.error('Error creating book: ', e);
    return {
      success: false,
      error: e,
    }
  }
}

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