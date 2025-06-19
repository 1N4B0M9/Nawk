import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import HomePage from './components/HomePage';
import Room from './components/Room';

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
`;

const ThemeToggle = styled.button`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 200;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.2s;
  &:hover {
    background: var(--color-accent-hover);
  }
`;

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <Router>
      <AppContainer>
        <ThemeToggle onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </ThemeToggle>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </AppContainer>
    </Router>
  );
};

export default App;