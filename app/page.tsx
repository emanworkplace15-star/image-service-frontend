'use client';

import { useEffect, useState } from 'react';
import { api, errMessage, Page } from '@/lib/api';
import {
  IMAGE_FAILED_EVENT,
  IMAGE_PROCESSED_EVENT,
  offImageEvent,
  onImageEvent,
  RealtimeFailedEvent,
  RealtimeProcessedEvent,
} from '@/lib/socket';

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  // Lightbox keyboard controls: arrows navigate, Escape closes.
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Live updates: patch the matching row in place while it's on the current
  // page. Events for other pages still arrive as toasts (ToastProvider).
  useEffect(() => {
    const onProcessed = (evt: RealtimeProcessedEvent) =>
      setItems((current) =>
        current.map((item) =>
          item.id === evt.id
            ? {
                ...item,
                status: 'PROCESSED' as const,
                processedSize: evt.processedSize ?? item.processedSize,
                ...(evt.url ? { url: evt.url } : {}),
              }
            : item,
        ),
      );
    const onFailed = (evt: RealtimeFailedEvent) =>
      setItems((current) =>
        current.map((item) =>
          item.id === evt.id ? { ...item, status: 'FAILED' as const } : item,
        ),
      );

    const offProcessed = onImageEvent(IMAGE_PROCESSED_EVENT, onProcessed);
    const offFailed = onImageEvent(IMAGE_FAILED_EVENT, onFailed);
    return () => {
      offProcessed();
      offFailed();
    };
  }, []);

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  function stepLightbox(delta: number) {
    setLightboxIndex((current) =>
      current === null
        ? null
        : (current + delta + items.length) % items.length,
    );
  }

  const lightboxItem = lightboxIndex !== null ? items[lightboxIndex] : null;
  const lightboxShown = lightboxItem !== undefined && lightboxItem !== null;
  if (lightboxShown && !lightboxItem) {
    // Index out of range after a refetch (e.g. row deleted) — close instead of crashing.
    if (lightboxIndex !== null) closeLightbox();
  }

  return (
    <>
      <h1>Gallery ({meta.total} images)</h1>
      {error && <p className="error">{error}</p>}
      <div className="gallery">
        {items.map((item, index) => (
          <div
            className="card clickable"
            key={item.id}
            onClick={() => openLightbox(index)}
          >
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
      {lightboxShown && (
        <div className="lightbox" onClick={closeLightbox}>
          <button
            className="lightbox-close"
            aria-label="Close"
            onClick={closeLightbox}
          >
            ✕
          </button>
          <button
            className="lightbox-nav lightbox-prev"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              stepLightbox(-1);
            }}
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="lightbox-img"
            src={lightboxItem.url}
            alt={lightboxItem.id}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox-nav lightbox-next"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              stepLightbox(1);
            }}
          >
            ›
          </button>
          <div className="lightbox-caption">
            <span className={`badge ${lightboxItem.status}`}>
              {lightboxItem.status}
            </span>
            <span>
              {formatBytes(lightboxItem.originalSize)} →{' '}
              {formatBytes(lightboxItem.processedSize)} ·{' '}
              {(lightboxIndex ?? 0) + 1} / {items.length}
            </span>
          </div>
        </div>
      )}
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
