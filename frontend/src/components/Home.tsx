import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container-fluid">
      <div className="accordion my-2" id="changelogAccordion">
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button bg-success text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#changelog" aria-expanded="false" aria-controls="changelog">
              Avalon Notes Helper 2.1.0 out now!
            </button>
          </h2>
          <div id="changelog" className="accordion-collapse collapse" data-bs-parent="#changelogAccordion">
            <div className="accordion-body">
              <span className="fw-bold">Improved Avalon Game UI, round logic, and added a draggable timer.</span>
              <span className="text-muted">
                <ul>
                  <li>Added draggable timer with alarm sound when timer ends</li>
                  <li>Add detailed view toggle to game to show/hide non-terminal rounds</li>
                  <li>Updated UI to use flexbox-based quest layout</li>
                  <ul>
                    <li>This should take advantage of horizontal screen space, especially in smaller games</li>
                  </ul>
                  <br/>
                  <li>Minor code cleanup</li>
                  <li>Fixed bug where we needed 1 more than majority to go on quest
                  <ul>
                    <li>For games with odd number of players; even worked fine</li>
                  </ul>
                  </li>
                  <li>Fixed bug where we don't display enough failure possibilities in quest</li>
                  <li>Fixed bug where failure count reset to 0 prematurely</li>
                </ul>
              </span>
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
