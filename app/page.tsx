'use client';

import { useEffect, useState } from 'react';
import { api, errMessage, Page } from '@/lib/api';

interface GalleryItem {
  id: string;
  status: 'PENDING' | 'UPLOADED' | 'PROCESSED' | 'FAILED';
  originalSize: number | null;
  processedSize: number | null;
  createdAt: string;
  url: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<Page<GalleryItem>>(`/images/gallery?page=${page}&limit=12`, {}, false)
      .then((res) => {
        setItems(res.data);
        setMeta({
          page: res.page,
          totalPages: res.totalPages,
          total: res.total,
        });
      })
      .catch((err) => setError(errMessage(err)));
  }, [page]);

  return (
    <>
      <h1>Gallery ({meta.total} images)</h1>
      {error && <p className="error">{error}</p>}
      <div className="gallery">
        {items.map((item) => (
          <div className="card" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.id} />
            <div className="meta">
              <span className={`badge ${item.status}`}>{item.status}</span>
              <span>
                {formatBytes(item.originalSize)} →{' '}
                {formatBytes(item.processedSize)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button
            className="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {meta.page} / {meta.totalPages}
          </span>
          <button
            className="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
