/**
 * Theme Context & Dark/Light Switcher
 * -----------------------------------
 * Poore UI me Dark mode aur Light mode switch karne ka React context:
 * 1. Default 'dark' theme rehta hai.
 * 2. User ki preference 'localStorage' me persist hoti hai ('app_theme').
 * 3. documentElement par 'dark' ya 'light' class aur 'data-theme' set karta hai,
 *    jisse index.css ke design tokens automatically react karte hain.
 */
import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage se saved theme read karo (default: 'dark')
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('app_theme') as Theme | null
      if (saved === 'dark' || saved === 'light') return saved
    } catch {}
    return 'dark' // default to pristine dark minimalism
  })

  // Theme change karke localStorage me save karo
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('app_theme', newTheme)
    } catch {}
  }

  // Dark <-> Light toggle helper
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // HTML root element par class & color-scheme attribute update karo
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
    root.style.colorScheme = theme
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Custom hook jo kisi bhi component me theme state aur toggle access karne deta hai */
export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
