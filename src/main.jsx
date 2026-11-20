import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { StatsPage } from './components/StatsPage.jsx'

// Two pages: search at "/" and collection stats at "/stats".
const isStats = window.location.pathname.replace(/\/$/, '') === '/stats'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isStats ? <StatsPage /> : <App />}
  </StrictMode>,
)
