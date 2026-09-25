import NavBar from './components/NavBar.jsx'
import './App.css'

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <NavBar />
      <main id="main-content" className="page-container" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <p className="hero-eyebrow">Find your people. Play your game.</p>
          <h1 id="hero-title">Your next teammate<br />starts here.</h1>
          <p className="hero-description">
            Find your duo or round out your squad. FinDuo brings players
            together for better games.
          </p>
          <div className="hero-actions">
            <button type="button" className="button button-primary" disabled aria-describedby="hero-availability">
              Find Players
            </button>
            <button type="button" className="button button-secondary" disabled aria-describedby="hero-availability">
              Create Profile
            </button>
          </div>
          <p id="hero-availability" className="hero-note">Player discovery and profiles are coming soon.</p>
        </section>
      </main>
    </>
  )
}

export default App
