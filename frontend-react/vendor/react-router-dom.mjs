// Minimal react-router-dom style router for vendor-only setup (no npm).
// Supports BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation.
// Paths match exactly ("*") matches any path. Hash URLs (#/path) are normalized.

const React = window.React;

function normalizePath() {
  const { pathname, hash } = window.location;
  if (hash && hash.startsWith('#/')) {
    return hash.slice(1) || '/';
  }
  return pathname || '/';
}

function updateHistory(path, replace) {
  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
}

function matchPath(routePath, locationPath) {
  if (routePath === '*') return true;
  const normalize = (p) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p);
  return normalize(routePath) === normalize(locationPath);
}

const RouterContext = React.createContext({
  location: '/',
  navigate: () => {},
});

export function BrowserRouter({ children }) {
  const [location, setLocation] = React.useState(normalizePath());

  React.useEffect(() => {
    const handler = () => setLocation(normalizePath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = React.useCallback((to, options = {}) => {
    const replace = options.replace ?? false;
    updateHistory(to, replace);
    setLocation(normalizePath());
  }, []);

  const contextValue = React.useMemo(() => ({ location, navigate }), [location, navigate]);

  return React.createElement(RouterContext.Provider, { value: contextValue }, children);
}

export function Routes({ children }) {
  const { location } = React.useContext(RouterContext);
  let element = null;
  React.Children.forEach(children, (child) => {
    if (element || !React.isValidElement(child)) return;
    if (matchPath(child.props.path, location)) {
      element = child;
    }
  });
  return element;
}

export function Route({ element }) {
  return element ?? null;
}

export function Navigate({ to, replace = false }) {
  const { navigate } = React.useContext(RouterContext);
  React.useEffect(() => {
    navigate(to, { replace });
  }, [to, replace, navigate]);
  return null;
}

export function useNavigate() {
  const { navigate } = React.useContext(RouterContext);
  return navigate;
}

export function useLocation() {
  const { location } = React.useContext(RouterContext);
  return { pathname: location };
}

export function Link({ to, children, replace = false, ...rest }) {
  const navigate = useNavigate();
  const onClick = (event) => {
    event.preventDefault();
    navigate(to, { replace });
  };
  return React.createElement('a', { href: to, onClick, ...rest }, children);
}
