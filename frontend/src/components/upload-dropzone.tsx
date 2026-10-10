"use client";

import { FileText, X } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import type { PublicConfig } from "@/lib/api";
import { formatBytes, MIME_LABEL } from "@/lib/copy";
import { Button } from "./ui";

/** File types and the size limit come from the server's configuration, not from this component. */
export function UploadDropzone({
  config,
  file,
  error,
  disabled,
  onSelect,
}: {
  config: PublicConfig;
  file: File | null;
  error: string | null;
  disabled?: boolean;
  onSelect(file: File | null): void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();
  const types = config.upload.mimeTypes.map((m) => MIME_LABEL[m] ?? m).join(", ");
  const limits = `${types} · up to ${formatBytes(config.upload.maxBytes)}`;

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files[0]) onSelect(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`border border-dashed p-8 text-center transition-colors ${
          over ? "border-ink bg-neutral-soft" : error ? "border-error bg-surface" : "border-line bg-canvas"
        }`}
      >
        <input
          ref={input}
          id={id}
          type="file"
          className="sr-only"
          accept={config.upload.mimeTypes.join(",")}
          disabled={disabled}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          onChange={(e) => {
            onSelect(e.target.files?.[0] ?? null);
            e.target.value = ""; // choosing the same file again must still fire
          }}
        />
        {file ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:text-left">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-8 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{file.name}</p>
                <p className="text-[14px] text-muted">{formatBytes(file.size)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
                Replace
              </Button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(null)}
                className="inline-flex size-11 items-center justify-center border border-line-strong bg-surface hover:bg-neutral-soft disabled:opacity-50"
                aria-label="Remove document"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <>
            <FileText className="mx-auto size-9 text-muted" aria-hidden />
            <p className="mt-4 text-lg font-semibold">Drop your document here</p>
            <p id={`${id}-help`} className="mt-1 text-[14px] text-muted">
              {limits}
            </p>
            <Button type="button" className="mt-6 w-full sm:w-auto" disabled={disabled} onClick={() => input.current?.click()}>
              Choose document
            </Button>
          </>
        )}
      </div>
      {file && (
        <p id={`${id}-help`} className="mt-2 text-[14px] text-muted">
          {limits}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[14px] font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}
