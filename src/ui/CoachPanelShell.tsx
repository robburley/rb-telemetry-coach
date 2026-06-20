import type { ReactNode } from "react";
import rbTelemetryCoachLogo from "../../assets/rb-telemetry-coach-logo.webp";

interface CoachPanelShellProps {
  isExpanded: boolean;
  isBusy?: boolean;
  onExpand: () => void;
  onMinimize: () => void;
  children: ReactNode;
}

export function CoachPanelShell({
  isExpanded,
  isBusy = false,
  onExpand,
  onMinimize,
  children,
}: CoachPanelShellProps): JSX.Element {
  if (!isExpanded) {
    return (
      <button
        className={`coach-launcher${isBusy ? " coach-launcher-busy" : ""}`}
        type="button"
        aria-label="Open RB Telemetry Coach"
        title="Open RB Telemetry Coach"
        onClick={onExpand}
      >
        <img src={rbTelemetryCoachLogo} alt="" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="coach-panel-frame">
      <div className="coach-panel-chrome">
        <span className="coach-panel-title"></span>
        <button
          className="coach-minimize-button"
          type="button"
          aria-label="Minimize RB Telemetry Coach"
          title="Minimize RB Telemetry Coach"
          onClick={onMinimize}
        >
          <span aria-hidden="true">-</span>
        </button>
      </div>
      <div className="coach-panel-scroll">{children}</div>
    </div>
  );
}
