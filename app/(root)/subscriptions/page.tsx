import { auth } from '@clerk/nextjs/server';
import { PricingTable } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

const SubscriptionsPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <main className="clerk-subscriptions">
      <section className="w-full max-w-4xl text-center mb-10">
        <h1 className="page-title-xl">Choose Your Plan</h1>
        <p className="subtitle mt-3">
          Upgrade when you are ready for more books, longer sessions, and higher monthly limits.
        </p>
      </section>

      <div className="clerk-pricing-table-wrapper w-full">
        <PricingTable />
      </div>
    </main>
  );
};

export default SubscriptionsPage;

