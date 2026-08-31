'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getToken } from '@/lib/api';

export function NavBar() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, [pathname]);

  return (
    <nav>
      <Link href="/" className={pathname === '/' ? 'active' : ''}>
        Gallery
      </Link>
      {authed && (
        <>
          <Link
            href="/upload"
            className={pathname === '/upload' ? 'active' : ''}
          >
            Upload
          </Link>
          <Link
            href="/records"
            className={pathname === '/records' ? 'active' : ''}
          >
            Records
          </Link>
        </>
      )}
      <span className="spacer" />
      {authed ? (
        <a
          href="/"
          onClick={() => {
            clearToken();
            setAuthed(false);
          }}
        >
          Logout
        </a>
      ) : (
        <Link href="/login" className={pathname === '/login' ? 'active' : ''}>
          Login
        </Link>
      )}
    </nav>
  );
}
