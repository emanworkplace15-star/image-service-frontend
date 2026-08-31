'use client';

import { useEffect, useState } from 'react';
import { api, errMessage, Page } from '@/lib/api';

interface ImageRecord {
  id: string;
  originalKey: string;
  processedKey: string | null;
  originalSize: number | null;
  processedSize: number | null;
  contentType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function RecordsPage() {
  const [rows, setRows] = useState<ImageRecord[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api<Page<ImageRecord>>(`/images?page=${page}&limit=20`)
      .then((res) => {
        setRows(res.data);
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
      <h1>Image records ({meta.total})</h1>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Original</th>
              <th>Processed</th>
              <th>Keys</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id.slice(0, 8)}…</td>
                <td>
                  <span className={`badge ${row.status}`}>{row.status}</span>
                </td>
                <td>{row.contentType}</td>
                <td>{formatBytes(row.originalSize)}</td>
                <td>{formatBytes(row.processedSize)}</td>
                <td className="mono">
                  {row.originalKey}
                  {row.processedKey ? ` → ${row.processedKey}` : ''}
                </td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    </>
  );
}
