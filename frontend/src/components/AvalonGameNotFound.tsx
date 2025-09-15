import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";


export default function AvalonGameNotFound() {
  const { game_id } = useParams();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/avalon";
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <Link className="navbar-brand" to="/avalon">Avalon Notes Helper</Link>
        </div>
      </nav>
      <main className="container-fluid mt-3" style={{ maxWidth: "80%" }}>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Game Not Found</h4>
          <p>The game with ID <strong>{game_id}</strong> was not found. It may have been deleted or the ID is incorrect.</p>
          <hr />
          <p className="mb-0">
            You will be redirected to the main Avalon page in 5 seconds. <Link to="/avalon" className="alert-link">Click here</Link> if you are not redirected.
          </p>
        </div>
      </main>
    </>
  );
}
