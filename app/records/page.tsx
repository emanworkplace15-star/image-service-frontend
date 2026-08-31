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

async function load(
  page: number,
  setRows: (rows: ImageRecord[]) => void,
  setMeta: (meta: { page: number; totalPages: number; total: number }) => void,
  setError: (message: string) => void,
) {
  try {
    const res = await api<Page<ImageRecord>>(`/images?page=${page}&limit=20`);
    setRows(res.data);
    setMeta({ page: res.page, totalPages: res.totalPages, total: res.total });
  } catch (err) {
    setError(errMessage(err));
  }
}

export default function RecordsPage() {
  const [rows, setRows] = useState<ImageRecord[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setSelected(new Set());
    load(page, setRows, setMeta, setError);
  }, [page]);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === rows.length || rows.every((r) => current.has(r.id))
        ? new Set()
        : new Set(rows.map((r) => r.id)),
    );
  }

  async function deleteSelected() {
    const count = selected.size;
    if (count === 0 || deleting) return;
    if (!window.confirm(`Delete ${count} image${count > 1 ? 's' : ''} (and their S3 objects)? This cannot be undone.`))
      return;
    setDeleting(true);
    setError('');
    try {
      const res = await api<{ deleted: number }>('/images', {
        method: 'DELETE',
        body: JSON.stringify({ ids: [...selected] }),
      });
      setSelected(new Set());
      // Clamp the page if this page just emptied, then refetch.
      const nextPage =
        rows.length === selected.size && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else load(nextPage, setRows, setMeta, setError);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const onPageCount = rows.filter((r) => selected.has(r.id)).length;

  return (
    <>
      <h1>Image records ({meta.total})</h1>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}>
        <button
          className="delete-btn"
          disabled={onPageCount === 0 || deleting}
          onClick={deleteSelected}
        >
          {deleting
            ? 'Deleting…'
            : `Delete selected${onPageCount > 0 ? ` (${onPageCount})` : ''}`}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                />
              </th>
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
              <tr key={row.id} className={selected.has(row.id) ? 'row-selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.id}`}
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
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