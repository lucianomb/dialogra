'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

const Search = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  
  const [localQuery, setLocalQuery] = useState(initialQuery);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      
      if (localQuery) {
        params.set('query', localQuery);
      } else {
        params.delete('query');
      }
      
      router.push(`/?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [localQuery, router]);

  return (
    <div className="search-container">
      <SearchIcon className="search-icon" size={18} />
      <input
        type="text"
        placeholder="Search books by title or author..."
        className="search-input"
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
      />
    </div>
  );
};

export default Search;
