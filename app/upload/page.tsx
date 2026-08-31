'use client';

import { ChangeEvent, useState } from 'react';
import { api, errMessage } from '@/lib/api';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface PresignResponse {
  id: string;
  key: string;
  uploadUrl: string;
}

async function uploadToS3(
  file: File,
  uploadUrl: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`S3 upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('S3 upload failed'));
    xhr.send(file);
  });
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    setDone('');
    setError('');
    const selected = e.target.files?.[0] ?? null;
    if (selected && !ALLOWED_TYPES.includes(selected.type)) {
      setError(`Unsupported type: ${selected.type}. Use JPEG, PNG, WebP or GIF.`);
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function onUpload() {
    if (!file) return;
    setBusy(true);
    setError('');
    setDone('');
    setProgress(0);
    try {
      // 1. Ask backend for a presigned PUT (also creates the DB row)
      const presign = await api<PresignResponse>('/images/presign', {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type }),
      });

      // 2. Upload directly to S3
      await uploadToS3(file, presign.uploadUrl, setProgress);

      // 3. Tell the backend the upload landed (verifies via HEAD)
      await api(`/images/${presign.id}/complete`, { method: 'POST' });

      setDone(
        'Upload complete. The Lambda will compress it shortly — check the gallery.',
      );
      setFile(null);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Upload image</h1>
      <div className="dropzone">
        <input type="file" accept={ALLOWED_TYPES.join(',')} onChange={onFileChange} />
        <p style={{ marginTop: 12 }}>
          {file ? file.name : 'Select a JPEG, PNG, WebP or GIF'}
        </p>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onUpload} disabled={!file || busy}>
          {busy ? `Uploading… ${progress}%` : 'Upload'}
        </button>
        {done && <span className="success">{done}</span>}
        {error && <span className="error">{error}</span>}
      </div>
    </>
  );
}
