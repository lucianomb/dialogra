import React from 'react'
import {BookCardProps} from "@/types";
import Image from "next/image";
import {SignedIn, SignedOut, SignInButton} from "@clerk/nextjs";
import Link from "next/link";

const BookCard = ({title, author, coverURL, slug}: BookCardProps) => {
  const content = (
    <article className="book-card">
      <figure className="book-card-figure">
        <div className="book-card-cover-wrapper">
          <Image src={coverURL} alt={title} width={133} height={200} className="book-card-cover" />
        </div>
        <figcaption className="book-card-meta">
          <h3 className="book-card-title">{title}</h3>
          <p className="book-card-author">{author}</p>
        </figcaption>
      </figure>
    </article>
  );

  return (
    <>
      <SignedIn>
        <Link href={`/books/${slug}`}>
          {content}
        </Link>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <div className="cursor-pointer">
            {content}
          </div>
        </SignInButton>
      </SignedOut>
    </>
  )
}
export default BookCard
