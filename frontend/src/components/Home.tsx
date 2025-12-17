import { Link } from "react-router-dom";

import { useTheme } from "../ThemeContext";

export default function Home() {
  const { theme, toggleTheme, notTheme } = useTheme();

  return (
    <div className="container-fluid">
      <div className="accordion my-2" id="changelogAccordion">
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button bg-success text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#changelog" aria-expanded="false" aria-controls="changelog">
              Avalon Notes Helper 2.4.1 out now!
            </button>
          </h2>
          <div id="changelog" className="accordion-collapse collapse bg-body border-start border-end border-bottom" data-bs-parent="#changelogAccordion">
            <div className="accordion-body">
              <span className="fw-bold">The Roles Update pt.2!</span>
              <ul>
                <li>Added role selection in the game setup</li>
                <li>Added post-game role assignment</li>
                <li>Added post-game snipe'ing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h1 className="d1 text-center">Joan's Stuff</h1>
      <div className="container">
        <div className="d-flex justify-content-end align-items-center">
          <button className={`btn btn-outline-${notTheme()}`} onClick={toggleTheme}>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </div>
      <div className="container mt-4">
        <h2>Table of Contents</h2>
        <ul className="list-group">
          <li className="list-group-item">
            <Link to="/avalon">Avalon Notes Helper</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
