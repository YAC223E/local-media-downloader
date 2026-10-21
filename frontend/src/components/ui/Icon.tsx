import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "download"
  | "library"
  | "settings"
  | "link"
  | "paste"
  | "search"
  | "close"
  | "check"
  | "alert"
  | "trash"
  | "refresh"
  | "chevronDown"
  | "chevronRight"
  | "sun"
  | "moon"
  | "monitor"
  | "wifi"
  | "copy"
  | "arrowRight"
  | "arrowLeft"
  | "clock"
  | "info"
  | "file"
  | "plus"
  | "play"
  | "save"
  | "laptop"
  | "phone";

const paths: Record<IconName, ReactNode> = {
  home: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />,
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16" />,
  library: (
    <>
      <path d="M4 5.5h4v14H4zM10 4h4v15.5h-4zM16 7h4v12.5h-4z" />
      <path d="M4 9.5h4M10 8h4M16 11h4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  link: (
    <>
      <path d="M10.5 13.5l3-3" />
      <path d="M8.5 15.5l-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" />
      <path d="M15.5 8.5l1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
    </>
  ),
  paste: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5L5 19" />,
  check: <path d="M4.5 12.5l5 5L20 6.5" />,
  alert: (
    <>
      <path d="M12 3.5L21 20H3L12 3.5z" />
      <path d="M12 9v5M12 17.2v.1" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  chevronDown: <path d="M5 9l7 7 7-7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4L19 19M19 5l-1.6 1.6M6.6 17.4L5 19" />
    </>
  ),
  moon: <path d="M20 13.4A8.4 8.4 0 0 1 10.6 4 8.4 8.4 0 1 0 20 13.4Z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  wifi: (
    <>
      <path d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.5 8.5 0 0 1 11 0M9.5 16.5a4 4 0 0 1 5 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  arrowRight: <path d="M4 12h15m0 0l-5-5m5 5l-5 5" />,
  arrowLeft: <path d="M20 12H5m0 0l5-5m-5 5l5 5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8v.1" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5v4h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.8v6.4L15 12l-5-3.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  save: (
    <>
      <path d="M12 3.5v11m0 0l-4-4m4 4l4-4" />
      <path d="M5 15.5v4h14v-4" />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M2.5 19h19l-1.5-4H4l-1.5 4Z" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10.5 5h3M11 19h2" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
  ...props
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" opacity="0.22" />
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
