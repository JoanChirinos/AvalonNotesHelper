import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container-fluid">
      <div className="accordion my-2" id="changelogAccordion">
        <div className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button bg-success text-light collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#changelog" aria-expanded="false" aria-controls="changelog">
              Avalon Notes Helper 2.2.1 out now!
            </button>
          </h2>
          <div id="changelog" className="accordion-collapse collapse bg-body border-start border-end border-bottom" data-bs-parent="#changelogAccordion">
            <div className="accordion-body">
              <span className="fw-bold">Added support for dark mode</span>
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
