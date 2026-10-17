/** Drawn platform glyphs: one consistent 1.8px stroke set, no emoji. */
export function PlatformMark({ name, size = 20 }: { name: string; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "youtube":
      return (
        <svg {...props}>
          <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
          <path d="M10.5 9.8v4.4L14.5 12l-4-2.2Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...props}>
          <path d="M9.5 4v10.5a3.7 3.7 0 1 0 3.7-3.7" />
          <path d="M9.5 7.5A5.5 5.5 0 0 0 15 9V6.2A5.6 5.6 0 0 0 9.5 7.5Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...props}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...props}>
          <path d="M14.5 8.5V7.2c0-.8.5-1 1-1h1.7V3.5h-2.6c-2.3 0-3.4 1.6-3.4 3.6v1.4H9.5V12h1.7v8.5h3.3V12h2.3l.4-3.5h-2.7Z" />
        </svg>
      );
    case "x":
      return (
        <svg {...props}>
          <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />
        </svg>
      );
    case "reddit":
      return (
        <svg {...props}>
          <ellipse cx="12" cy="14" rx="7" ry="4.4" />
          <circle cx="9" cy="13.4" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13.4" r="1" fill="currentColor" stroke="none" />
          <path d="M12 9.6V7.4l5-1 1 2.6" />
          <circle cx="18.5" cy="9.5" r="1.4" />
        </svg>
      );
    case "vimeo":
      return (
        <svg {...props}>
          <path d="M4 6.5c4 1.6 6.6 5.4 8.4 9.5l2.6.3c-.3-2.3-.2-5 1.5-6.8 1-1 2.6-1.2 3.5-.4-1.2 3.9-4 8.4-7.4 10.4-2.6 1.5-6.4-.6-8.6-5.5C2.9 11.4 3 8 4 6.5Z" />
        </svg>
      );
    case "twitch":
      return (
        <svg {...props}>
          <path d="M4 3.5h16v10l-3.5 3.5H12l-2.5 2.5H7.5V16.5H4V3.5Z" />
          <path d="M10.5 7.5v4M14.5 7.5v4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M10 8.8v6.4L15 12l-5-3.2Z" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
