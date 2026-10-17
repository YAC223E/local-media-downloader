/** Plain words for engine states — one voice across DevelopingFrame, Downloads
 *  and History (was three divergent copies). Unknown states pass through. */
export const STATUS_WORDS: Record<string, string> = {
  queued: "Waiting",
  active: "Working",
  extracting: "Reading link…",
  downloading: "Downloading…",
  merging: "Finishing…",
  finished: "Done",
  error: "Failed",
  cancelled: "Cancelled",
};

export const statusWord = (status: string): string => STATUS_WORDS[status] ?? status;
