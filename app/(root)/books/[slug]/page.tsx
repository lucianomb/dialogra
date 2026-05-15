import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getBookBySlug } from '@/lib/actions/book.actions';
import VapiControls from "@/components/VapiControls";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const BookPage = async ({ params }: PageProps) => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { slug } = await params;
  const result = await getBookBySlug(slug);
  if (!result.success || !result.data) redirect('/');

  const book = result.data;

  return (
    <main className="book-page-container">
      {/* Floating Back Button */}
      <Link href="/" className="back-btn-floating" aria-label="Go back">
        <ArrowLeft className="w-5 h-5 text-(--text-primary)" />
      </Link>

      <VapiControls book={book} />
    </main>
  );
};

export default BookPage;

