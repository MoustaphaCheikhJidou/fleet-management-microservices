import { React } from './lib/react.js';
import { html } from './lib/html.js';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from '../vendor/react-router-dom.mjs';
import { isAdmin, isAuthed, setGuardBanner } from './services/session.js';

export { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation };

export function RequireAuth({ children }) {
  if (!isAuthed()) {
    setGuardBanner('Connectez-vous pour accéder à cette zone.');
    return html`<${Navigate} to="/login" replace=${true} />`;
  }
  return children;
}

export function RequireAdmin({ children }) {
  if (!isAdmin()) {
    setGuardBanner('Accès administrateur requis.');
    return html`<${Navigate} to="/dashboard" replace=${true} />`;
  }
  return children;
}
