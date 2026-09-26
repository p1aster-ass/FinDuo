import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AuthApp from "./auth/AuthApp.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <AuthApp />
    </AuthProvider>
  </StrictMode>,
);
