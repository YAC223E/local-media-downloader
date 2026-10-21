import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { api } from "../lib/api";
import { useJobs } from "../lib/jobs";
import { isFileGoneError, markSavedOnDevice } from "../lib/saves";
import { cn } from "../lib/utils";
import { useToast } from "./Toaster";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./ui/button";
import { Icon, Spinner } from "./ui/Icon";

/** True when this page is open from a phone/tablet on the LAN, not the laptop. */
function isRemoteView(): boolean {
  const host = window.location.hostname.replace(/^\[|\]$/g, "");
  return !(host === "localhost" || host === "::1" || host.startsWith("127."));
}

/**
 * "Save to this device" with a server-side existence check first.
 *
 * A plain <a download> will happily save a 404/410 JSON body as a file when
 * the server copy is already gone (e.g. auto-delete after the first phone
 * save). Ask first; only navigate to the real attachment when it exists.
 *
 * After a LAN save the server deletes its copy and marks the job transferred
 * once the download finishes. Poll for that moment so every screen can switch
 * from "Ready" to "On your phone" without a reload.
 */
export function SaveLink({
  jobId,
  className,
  children,
  variant = "primary",
  size = "md",
}: {
  jobId: string;
  className?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const toast = useToast();
  const { refresh } = useJobs();
  const [checking, setChecking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Check once when the control appears so a removed file never looks saveable.
  useEffect(() => {
    let cancelled = false;
    api
      .fileCheck(jobId)
      .then(() => {
        if (!cancelled) setUnavailable(false);
      })
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : "";
        if (!cancelled && isFileGoneError(detail)) setUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const stopWatching = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const finishTransfer = useCallback(async () => {
    stopWatching();
    await refresh();
    window.dispatchEvent(new Event("lmd:saved"));
  }, [refresh, stopWatching]);

  const watchTransfer = useCallback(() => {
    stopWatching();
    let tries = 0;
    pollRef.current = window.setInterval(async () => {
      tries += 1;
      try {
        const current = await api.job(jobId);
        if (current.transferred) {
          void finishTransfer();
          return;
        }
      } catch {
        // The job aged out of the live list; refresh Library anyway.
        void finishTransfer();
        return;
      }
      // A long phone transfer can take a while; give it 15 minutes.
      if (tries >= 450) stopWatching();
    }, 2000);
  }, [finishTransfer, jobId, stopWatching]);

  useEffect(() => stopWatching, [stopWatching]);

  const save = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (checking) return;
    setChecking(true);
    try {
      await api.fileCheck(jobId);
      if (isRemoteView()) {
        markSavedOnDevice(jobId);
        watchTransfer();
      }
      window.location.assign(api.fileUrl(jobId));
      // If the browser stays on the page (blocked download), let the control
      // return to its normal state rather than looking stuck forever.
      window.setTimeout(() => setChecking(false), 5000);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      const gone = isFileGoneError(detail);
      if (gone) setUnavailable(true);
      toast({
        title: gone ? "Already on your device" : "Can't save this one",
        body: gone
          ? "The laptop removed its copy after the first save — check your Downloads folder."
          : "The file isn't on the laptop anymore. Download it again from Library.",
        tone: gone ? "info" : "err",
      });
      setChecking(false);
    }
  };

  if (unavailable) {
    return (
      <span
        role="status"
        className={cn(
          buttonStyles({ variant: "secondary", size, className }),
          "cursor-default border-stop/40 bg-stopwash text-stop",
        )}
      >
        <Icon name="alert" size={16} />
        File removed from this laptop
      </span>
    );
  }

  return (
    <a
      href={api.fileUrl(jobId)}
      download
      onClick={save}
      aria-busy={checking}
      aria-disabled={checking}
      className={buttonStyles({ variant, size, className: checking ? `opacity-60 ${className ?? ""}` : className })}
    >
      {checking ? (
        <>
          <Spinner size={17} className="spin" />
          Checking file…
        </>
      ) : (
        children ?? "Save to this device"
      )}
    </a>
  );
}
