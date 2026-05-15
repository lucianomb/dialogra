import React from 'react'
import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import {getAllBooks} from "@/lib/actions/book.actions";
import Search from "@/components/Search";

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ query?: string }>;
}

const Page = async ({ searchParams }: Props) => {
  const { query } = await searchParams;
  const bookResults = await getAllBooks(query)
  const books = bookResults.success ? bookResults.data ?? [] : []

  return (
    <main className="wrapper container">
      <HeroSection />

      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-(--text-primary)">Recent Books</h2>
        <Search />
      </div>

      <div className="library-books-grid">
        {books.length > 0 ? (
          books.map((book) => (
            <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
          ))
        ) : (
          <p className="text-(--text-secondary)">No books found.</p>
        )}
      </div>
    </main>
  )
}
export default Page
