import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container-fluid">
      <div className="alert alert-success my-2" role="alert">
        <Link to="/avalon" className="alert-link">Avalon Notes Helper</Link> 2.0.0 preview out now!
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
            <a href="/avalon">Avalon Notes Helper</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
