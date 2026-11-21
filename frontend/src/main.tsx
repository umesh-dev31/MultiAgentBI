/**
 * Frontend Entry Point
 * -------------------
 * Ye React application ka main entry point hai:
 * 1. React 19 createRoot se '#root' DOM node ko mount karta hai.
 * 2. StrictMode development time par extra rendering checks lagata hai.
 * 3. ThemeProvider poore app ko Dark/Light mode theme state provide karta hai.
 * 4. App component poore routing aur global dashboard state ko render karta hai.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
