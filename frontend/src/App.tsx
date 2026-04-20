import './App.css'

function App() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Web Chess Platform</p>
        <h1>Frontend and backend are scaffolded and ready to extend.</h1>
        <p className="lead">
          React is running separately from Laravel, with the frontend already
          pointed at the API namespace we will use for the game platform.
        </p>
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h2>Backend</h2>
          <p>Laravel 13 API baseline in <code>backend/</code>.</p>
          <code>{'GET /api/v1/health'}</code>
        </article>

        <article className="panel">
          <h2>Frontend</h2>
          <p>React + TypeScript + Vite app in <code>frontend/</code>.</p>
          <code>{apiUrl}</code>
        </article>

        <article className="panel">
          <h2>Next Build Targets</h2>
          <p>Authentication, matchmaking, real-time games, and player profiles.</p>
        </article>
      </section>
    </main>
  )
}

export default App
