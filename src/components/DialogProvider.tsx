"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type NotifyOptions = { title?: string };
type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type PromptOptions = {
  title?: string;
  defaultValue?: string;
  confirmLabel?: string;
  placeholder?: string;
};

type DialogApi = {
  /** Show a message with an OK button. Resolves when closed. */
  notify: (message: string, options?: NotifyOptions) => Promise<void>;
  /** Ask a yes/no question. Resolves true on confirm, false on cancel/close. */
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  /** Ask for text. Resolves to the text, or null on cancel/close. */
  prompt: (message: string, options?: PromptOptions) => Promise<string | null>;
};

type DialogRequest = { id: number } & (
  | {
      kind: "notify";
      message: string;
      title: string;
      resolve: () => void;
    }
  | {
      kind: "confirm";
      message: string;
      title: string;
      confirmLabel: string;
      cancelLabel: string;
      danger: boolean;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      message: string;
      title: string;
      defaultValue: string;
      placeholder: string;
      confirmLabel: string;
      resolve: (value: string | null) => void;
    }
);

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
}

export default function DialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // A queue, so a second dialog never replaces one that is still open.
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const current = queue[0] ?? null;

  const nextId = useRef(0);
  const enqueue = useCallback((req: DistributiveOmit<DialogRequest, "id">) => {
    setQueue((q) => [...q, { ...req, id: nextId.current++ } as DialogRequest]);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      notify: (message, options) =>
        new Promise<void>((resolve) =>
          enqueue({
            kind: "notify",
            message,
            title: options?.title ?? "Heads up",
            resolve,
          })
        ),
      confirm: (message, options) =>
        new Promise<boolean>((resolve) =>
          enqueue({
            kind: "confirm",
            message,
            title: options?.title ?? "Are you sure?",
            confirmLabel: options?.confirmLabel ?? "Confirm",
            cancelLabel: options?.cancelLabel ?? "Cancel",
            danger: options?.danger ?? false,
            resolve,
          })
        ),
      prompt: (message, options) =>
        new Promise<string | null>((resolve) =>
          enqueue({
            kind: "prompt",
            message,
            title: options?.title ?? "Enter a value",
            defaultValue: options?.defaultValue ?? "",
            placeholder: options?.placeholder ?? "",
            confirmLabel: options?.confirmLabel ?? "Save",
            resolve,
          })
        ),
    }),
    [enqueue]
  );

  function close() {
    setQueue((q) => q.slice(1));
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogView key={current.id} req={current} onDone={close} />}
    </DialogContext.Provider>
  );
}

function DialogView({
  req,
  onDone,
}: {
  req: DialogRequest;
  onDone: () => void;
}) {
  const titleId = useId();
  const [text, setText] = useState(req.kind === "prompt" ? req.defaultValue : "");
  const primaryRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  // Close without a result: notify -> resolve, confirm -> false, prompt -> null.
  function cancel() {
    if (settled.current) return;
    settled.current = true;
    if (req.kind === "notify") req.resolve();
    else if (req.kind === "confirm") req.resolve(false);
    else req.resolve(null);
    onDone();
  }

  function accept() {
    if (settled.current) return;
    if (req.kind === "prompt") {
      const value = text.trim();
      if (!value) return; // keep the dialog open until there is text
      settled.current = true;
      req.resolve(value);
    } else if (req.kind === "confirm") {
      settled.current = true;
      req.resolve(true);
    } else {
      settled.current = true;
      req.resolve();
    }
    onDone();
  }

  useEffect(() => {
    if (req.kind === "prompt") {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      primaryRef.current?.focus();
    }
  }, [req.kind]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const danger = req.kind === "confirm" && req.danger;
  const primaryLabel =
    req.kind === "notify" ? "OK" : req.kind === "confirm" ? req.confirmLabel : req.confirmLabel;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={cancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm bg-white rounded-xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={cancel}
          className="absolute top-3 right-3 p-1 text-muted hover:text-primary rounded hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 id={titleId} className="text-base font-semibold mb-1 pr-6">
          {req.title}
        </h3>
        <p className="text-sm text-muted mb-5 whitespace-pre-line">{req.message}</p>

        {req.kind === "prompt" && (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                accept();
              }
            }}
            placeholder={req.placeholder}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-5"
          />
        )}

        <div className="flex gap-2 justify-end">
          {req.kind !== "notify" && (
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              {req.kind === "confirm" ? req.cancelLabel : "Cancel"}
            </button>
          )}
          <button
            type="button"
            ref={primaryRef}
            onClick={accept}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
              danger ? "bg-danger hover:bg-red-600" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
