import AuthGate from "./components/AuthGate.jsx";
import Dashboard from "./components/Dashboard.jsx";
import "./App.css";

// The auth provider owns the session. Resolving a callback never grants access.
function App({ auth }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {auth?.loading ? (
        <main id="main-content" className="session-loading" tabIndex={-1}>
          <p role="status">Getting your player hub ready…</p>
        </main>
      ) : auth?.user ? (
        <Dashboard auth={auth} />
      ) : (
        <AuthGate auth={auth} />
      )}
    </>
  );
}
export default App;
