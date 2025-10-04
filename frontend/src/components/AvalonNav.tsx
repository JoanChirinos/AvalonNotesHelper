import { Link } from "react-router-dom";
import { useTheme } from "../ThemeContext";

import { BiSolidCog } from "react-icons/bi";


interface AvalonNavProps {
  title?: string;
  useModal?: boolean;
  showDarkModeToggle?: boolean;
  showDebugButtons?: boolean;
  onForceArchive?: () => void;
  onAttemptArchival?: () => void;
  onAgain?: () => void;
  onToggleDetailedView?: () => void;
  detailedView?: boolean;
}

export default function AvalonNav({
  title = "Avalon Notes Helper",
  useModal = false,
  showDarkModeToggle = true,
  showDebugButtons = false,
  onForceArchive,
  onAttemptArchival,
  onAgain,
  onToggleDetailedView,
  detailedView,
}: AvalonNavProps) {
  const { theme, toggleTheme, notTheme } = useTheme();

  if (useModal) {
    return (
      <>
        <nav className="navbar navbar-expand-md border-bottom" data-bs-theme={theme}>
          <div className="container-fluid d-flex justify-content-between">
            <Link className="navbar-brand" to="/avalon">{title}</Link>
            <button className={`btn btn-outline-${notTheme()}`} data-bs-toggle="modal" data-bs-target="#gameSettingsModal">
              <BiSolidCog size={20} />
            </button>
          </div>
        </nav>
        <div className="modal fade" id="gameSettingsModal" tabIndex={-1} aria-labelledby="gameSettingsModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" data-bs-theme={theme}>
              <div className="modal-header">
                <h5 className="modal-title" id="gameSettingsModalLabel">Game Settings</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body d-flex flex-column gap-2">
                {showDebugButtons && (
                  <>
                    <button className="btn btn-outline-danger" onClick={onForceArchive}>Force Archive</button>
                    <button className={`btn btn-outline-${notTheme()}`} onClick={onAttemptArchival}>Attempt to Archive</button>
                  </>
                )}
                {onAgain && (
                  <button className={`btn btn-outline-${notTheme()}`} onClick={onAgain}>
                    Again!
                  </button>
                )}
                {onToggleDetailedView && (
                  <button className={`btn btn-outline-${notTheme()}`} onClick={onToggleDetailedView}>
                    {detailedView ? "Hide Non-terminal Rounds" : "Show Non-terminal Rounds"}
                  </button>
                )}
                {showDarkModeToggle && (
                  <button className={`btn btn-outline-${notTheme()}`} onClick={toggleTheme}>
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </button>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <nav className="navbar navbar-expand-md border-bottom" data-bs-theme={theme}>
      <div className="container-fluid d-flex justify-content-between">
        <Link className="navbar-brand" to="/avalon">{title}</Link>
        <div className="d-flex align-items-center gap-3">
          {showDebugButtons && (
            <>
              <button className="btn btn-outline-danger" onClick={onForceArchive}>Force Archive</button>
              <button className={`btn btn-outline-${notTheme()}`} onClick={onAttemptArchival}>Attempt to Archive</button>
            </>
          )}
          {onAgain && (
            <button className={`btn btn-outline-${notTheme()}`} onClick={onAgain}>
              Again!
            </button>
          )}
          {onToggleDetailedView && (
            <button className={`btn btn-outline-${notTheme()}`} onClick={onToggleDetailedView}>
              {detailedView ? "Hide Non-terminal Rounds" : "Show Non-terminal Rounds"}
            </button>
          )}
          {showDarkModeToggle && (
            <button className={`btn btn-outline-${notTheme()}`} onClick={toggleTheme}>
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}