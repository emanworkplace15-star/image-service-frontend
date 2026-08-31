'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  IMAGE_FAILED_EVENT,
  IMAGE_PROCESSED_EVENT,
  offImageEvent,
  onImageEvent,
  RealtimeFailedEvent,
  RealtimeProcessedEvent,
} from '@/lib/socket';

interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const ToastContext = createContext<(kind: Toast['kind'], text: string) => void>(
  () => {},
);

export function usePushToast() {
  return useContext(ToastContext);
}

const AUTO_DISMISS_MS = 6000;

export function ToastProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const pushToast = useCallback((kind: Toast['kind'], text: string) => {
    setToasts((current) => [
      ...current.slice(-4),
      { id: nextId.current++, kind, text },
    ]);
  }, []);

  useEffect(() => {
    const onProcessed = (evt: RealtimeProcessedEvent) =>
      pushToast('success', 'Image processed');
    const onFailed = (evt: RealtimeFailedEvent) =>
      pushToast(
        'error',
        `Image failed${evt.failureReason ? `: ${evt.failureReason}` : ''}`,
      );

    const offProcessed = onImageEvent(IMAGE_PROCESSED_EVENT, onProcessed);
    const offFailed = onImageEvent(IMAGE_FAILED_EVENT, onFailed);
    return () => {
      offProcessed();
      offFailed();
    };
  }, [pushToast]);

  return (
    <ToastContext.Provider value={pushToast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() =>
              setToasts((current) =>
                current.filter((t) => t.id !== toast.id),
              )
            }
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`toast ${toast.kind}`} onClick={onDismiss}>
      {toast.text}
    </div>
  );
}