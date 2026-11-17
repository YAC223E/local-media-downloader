import { cn } from "../lib/utils";
import { Icon } from "./ui/Icon";

export type HandoffState = "idle" | "fetching" | "ready" | "saving" | "arrived" | "failed";

const LABELS: Record<HandoffState, string> = {
  idle: "Waiting to start. The laptop fetches the file, then this phone saves it.",
  fetching: "The laptop is fetching this file. The phone is waiting.",
  ready: "Ready on this laptop. Save it to this phone.",
  saving: "The file is moving to this phone.",
  arrived: "The file has arrived on this phone.",
  failed: "The handoff stopped before the file was ready.",
};

const LAPTOP_WORD: Record<HandoffState, string> = {
  idle: "Waiting",
  fetching: "Fetching",
  ready: "Ready",
  saving: "Ready",
  arrived: "Ready",
  failed: "Stopped",
};

const PHONE_WORD: Record<HandoffState, string> = {
  idle: "Waiting",
  fetching: "Waiting",
  ready: "Save now",
  saving: "Receiving",
  arrived: "Arrived",
  failed: "Waiting",
};

/** The signature handoff instrument: a laptop port, a track, a phone port.
 *  The laptop pulses while it fetches; the phone pulses only when it is the
 *  next step or is receiving; a packet travels only during a real transfer. */
export function HandoffRail({
  state,
  size = "md",
  className,
}: {
  state: HandoffState;
  size?: "sm" | "md";
  className?: string;
}) {
  const small = size === "sm";
  const phoneActive = state === "ready" || state === "saving" || state === "arrived";
  const laptopTone =
    state === "fetching"
      ? "border-accent bg-accentwash text-brand"
      : state === "failed"
        ? "border-stop/40 bg-stopwash text-stop"
        : state === "ready" || state === "saving" || state === "arrived"
          ? "border-go/40 bg-gowash text-go"
          : "border-line bg-surface2 text-muted";
  const phoneTone =
    state === "arrived"
      ? "border-go/40 bg-gowash text-go"
      : state === "saving"
        ? "border-info bg-info text-white"
        : state === "ready"
          ? "border-info/45 bg-infowash text-info"
          : state === "failed"
            ? "border-line bg-surface2 text-muted"
            : "border-line bg-surface2 text-muted";

  const trackStyle =
    state === "arrived"
      ? { backgroundColor: "var(--go)" }
      : {
          backgroundImage:
            state === "ready" || state === "saving"
              ? "repeating-linear-gradient(90deg, var(--info) 0 3px, transparent 3px 7px)"
              : "repeating-linear-gradient(90deg, var(--line-strong) 0 3px, transparent 3px 7px)",
          opacity: state === "idle" ? 0.45 : 0.8,
        };

  return (
    <div role="img" aria-label={LABELS[state]} className={cn("flex w-full items-start", small ? "gap-1.5" : "gap-3", className)}>
      <Port
        kind="laptop"
        word="Laptop"
        sub={LAPTOP_WORD[state]}
        tone={laptopTone}
        active={state === "fetching"}
        small={small}
      />

      <div
        aria-hidden="true"
        className={cn("relative h-0.5 shrink-0 rounded-full", small ? "mt-[13px]" : "mt-[19px]")}
        style={{ flex: "1 1 0%", ...trackStyle }}
      >
        {state === "saving" ? (
          <span className="handoff-packet absolute -top-[2px] h-[6px] w-[6px] rounded-full bg-info" />
        ) : null}
      </div>

      <Port
        kind="phone"
        word="Phone"
        sub={PHONE_WORD[state]}
        tone={phoneTone}
        active={state === "ready" || state === "saving"}
        arrived={state === "arrived"}
        small={small}
        dim={!phoneActive}
      />
    </div>
  );
}

function Port({
  kind,
  word,
  sub,
  tone,
  active = false,
  arrived = false,
  small,
  dim = false,
}: {
  kind: "laptop" | "phone";
  word: string;
  sub: string;
  tone: string;
  active?: boolean;
  arrived?: boolean;
  small: boolean;
  dim?: boolean;
}) {
  return (
    <div className={cn("flex shrink-0 flex-col items-center", small ? "w-7 gap-0" : "w-[84px] gap-1.5")}>
      <span
        className={cn(
          "relative grid place-items-center border",
          small ? "h-7 w-7 rounded-[7px]" : "h-10 w-10 rounded-[10px]",
          tone,
          dim && "opacity-70",
        )}
      >
        {active ? <span aria-hidden="true" className="port-pulse absolute inset-0 rounded-[inherit] border-2 border-current" /> : null}
        <Icon name={kind} size={small ? 15 : 20} strokeWidth={1.8} />
        {arrived ? (
          <span className="arrive-in absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-go px-0.5 text-white">
            <Icon name="check" size={10} strokeWidth={3} />
          </span>
        ) : null}
      </span>
      {small ? (
        <span className="sr-only">{word}: {sub}</span>
      ) : (
        <>
          <span className="text-[12px] font-semibold leading-4 text-ink">{word}</span>
          <span className="text-[11px] leading-4 text-muted">{sub}</span>
        </>
      )}
    </div>
  );
}
