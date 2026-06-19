import type { ReactNode } from "react";

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
        aria-label="Open Garage 61 coach"
        title="Open Garage 61 coach"
        onClick={onExpand}
      >
        <span aria-hidden="true">G61</span>
      </button>
    );
  }

  return (
    <div className="coach-panel-frame">
      <div className="coach-panel-chrome">
        <span className="coach-panel-title">Garage 61 coach</span>
        <button
          className="coach-minimize-button"
          type="button"
          aria-label="Minimize Garage 61 coach"
          title="Minimize Garage 61 coach"
          onClick={onMinimize}
        >
          <span aria-hidden="true">-</span>
        </button>
      </div>
      <div className="coach-panel-scroll">{children}</div>
    </div>
  );
}
