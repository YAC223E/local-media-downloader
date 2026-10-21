/** Plain words for engine states, one voice across Home, Downloads and Library. */
export const STATUS_WORDS: Record<string, string> = {
  queued: "Waiting",
  active: "Working",
  extracting: "Reading link",
  downloading: "Downloading",
  merging: "Finishing",
  finished: "Ready",
  error: "Failed",
  cancelled: "Cancelled",
  transferred: "On your phone",
};

export const statusWord = (status: string): string => STATUS_WORDS[status] ?? status;
