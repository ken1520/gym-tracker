"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TOAST_DURATION_MS = 4000;

export type ToastTone = "success" | "error";

type Toast = { id: number; message: string; tone: ToastTone };

type ToastContextValue = { showToast: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
const nextToastId = () => (toastCounter += 1);

const TONE_CLASS: Record<ToastTone, string> = {
  success:
    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

const TONE_ICON: Record<ToastTone, string> = { success: "✓", error: "!" };

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside a ToastProvider");
  return value;
}

// Lives in the root layout so a toast survives the client-side navigation that
// follows a save — the provider never unmounts between pages
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextToastId();
      setToasts((current) => [...current, { id, message, tone }]);

      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, TOAST_DURATION_MS);
      timers.current.add(timer);
    },
    [dismiss],
  );

  // Copied into a local so the cleanup reads the same Set the effect saw
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg motion-safe:animate-toast-in ${TONE_CLASS[toast.tone]}`}
        >
          <span aria-hidden="true" className="font-semibold">
            {TONE_ICON[toast.tone]}
          </span>
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded px-1 leading-none opacity-60 transition-opacity hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
