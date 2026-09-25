import App from "../app.jsx";
import { useAuth } from "./useAuth.js";

export default function AuthApp() {
  return <App auth={useAuth()} />;
}
