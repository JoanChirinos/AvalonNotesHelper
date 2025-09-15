import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container-fluid">
      <div className="accordion my-2" id="changelogAccordion">
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button bg-success text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#changelog" aria-expanded="false" aria-controls="changelog">
              Avalon Notes Helper 2.2.0 out now!
            </button>
          </h2>
          <div id="changelog" className="accordion-collapse collapse bg-body border-start border-end border-bottom" data-bs-parent="#changelogAccordion">
            <div className="accordion-body">
              <span className="fw-bold">Implemented game archival; UI and game state management improvements</span>
              <ul className="list-group list-group-flush">
                <li className="list-group-item text-secondary">Games are now archived when completed, and can be viewed in read-only mode</li>
                <li className="list-group-item text-secondary">Added "Again!" button to quickly start a new game with the same players</li>
                <li className="list-group-item text-secondary">Each round's king is now the next player in the rotation; the first king is still random</li>
                <li className="list-group-item text-secondary">Improved UI feedback for quest approvals/rejections with icons</li>
                <li className="list-group-item text-secondary">Existing players are now auto-added when selected during game setup</li>
                <li className="list-group-item text-secondary">Miscellaneous bug fixes and improvements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <h1 className="d1 text-center">Joan's Personal Website!</h1>
      <div className="container">
        <h1>Purpose</h1>
        <p>
          This will almost certainly just hold whatever I want it to. With any luck, this index site will keep any
          relevant links and directory structure for quick access to whatever you're here for!
        </p>
      </div>
      <div className="container mt-4">
        <h2>Table of Contents</h2>
        <ul className="list-group">
          <li className="list-group-item">
            <Link to="/avalon">Avalon Game Helper</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
