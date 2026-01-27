import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "admin-lte/dist/css/adminlte.min.css";
import "./styles/custom.css";

// ✅ make jQuery global for AdminLTE
import jQuery from "jquery";
window.$ = window.jQuery = jQuery;

// ✅ bootstrap 4 JS + AdminLTE JS
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "admin-lte/dist/js/adminlte.min.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
