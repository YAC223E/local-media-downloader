import { cn } from "../lib/utils";
import { errorDetails, plainError } from "../lib/format";

/** The friendly failure sentence, with raw engine text tucked behind Details. */
export function ErrorNote({
  error,
  platform = "",
  url = "",
  className,
}: {
  error: string;
  platform?: string;
  url?: string;
  className?: string;
}) {
  const message = plainError(error, platform, url);
  const detail = errorDetails(error, platform, url);
  return (
    <div className={cn("text-[13px] leading-snug text-stop", className)}>
      <p>{message}</p>
      {detail ? <ErrorDetails error={error} platform={platform} url={url} /> : null}
    </div>
  );
}

export function ErrorDetails({
  error,
  platform = "",
  url = "",
  className,
}: {
  error: string;
  platform?: string;
  url?: string;
  className?: string;
}) {
  const detail = errorDetails(error, platform, url);
  if (!detail) return null;
  return (
    <details className={cn("mt-1 text-muted", className)}>
      <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-[12px] font-semibold hover:text-ink">
        Details
      </summary>
      <p className="mono max-w-[70ch] whitespace-pre-wrap break-words pb-1 text-[12px] leading-relaxed">{detail}</p>
    </details>
  );
}
