import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="hold-transition layout-top-nav">
      <div className="wrapper">
        <div className="content-wrapper">
          <div className="content-header">
            <div className="container">
              <h1 className="m-0">OnlineLearningPlatform UI Prototype</h1>
            </div>
          </div>

          <section className="content">
            <div className="container">
              <div className="card">
                <div className="card-body">
                  <p>Choose a page to preview:</p>
                  <Link className="btn btn-primary mr-2" to="/login">Login</Link>
                  <Link className="btn btn-outline-primary mr-2" to="/register">Register</Link>
                  <hr />
                  <Link className="btn btn-success mr-2" to="/student/dashboard">Student Dashboard</Link>
                  <Link className="btn btn-info mr-2" to="/instructor/dashboard">Instructor Dashboard</Link>
                  <Link className="btn btn-dark mr-2" to="/admin/dashboard">Admin Dashboard</Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
