import { useEffect, useState } from "react";

/**
 * The backend tracks a transfer globally because a file is removed after the
 * first LAN save. This local marker lets the device that actually saved say
 * "On your phone"; every other device says "Saved to a phone" instead.
 */
const SAVED_KEY = "lmd:saved-devices:v1";

type SavedMap = Record<string, true>;

function readMarkers(): SavedMap {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as SavedMap) : {};
  } catch {
    return {};
  }
}

function writeMarkers(markers: SavedMap): void {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(markers));
  } catch {
    /* Private mode or storage disabled: the copy stays honest without a marker. */
  }
}

export function markSavedOnDevice(jobId: string): void {
  if (!jobId) return;
  const markers = readMarkers();
  if (markers[jobId]) return;
  markers[jobId] = true;
  writeMarkers(markers);
  window.dispatchEvent(new Event("lmd:saved"));
}

export function savedOnThisDevice(jobId: string | undefined): boolean {
  if (!jobId) return false;
  return !!readMarkers()[jobId];
}

export function useSavedOnDevice(jobId: string | undefined): boolean {
  const [saved, setSaved] = useState(() => savedOnThisDevice(jobId));
  useEffect(() => {
    const update = () => setSaved(savedOnThisDevice(jobId));
    update();
    window.addEventListener("lmd:saved", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("lmd:saved", update);
      window.removeEventListener("storage", update);
    };
  }, [jobId]);
  return saved;
}

export function transferLabel(savedHere: boolean): string {
  return savedHere ? "On your phone" : "Saved to a phone";
}

/** Distinguish a missing server copy from a transient network failure. */
export function isFileGoneError(detail: string): boolean {
  const low = detail.toLowerCase();
  return (
    low.includes("already saved") ||
    low.includes("no file recorded") ||
    low.includes("no longer exists") ||
    low.includes("unknown download")
  );
}
