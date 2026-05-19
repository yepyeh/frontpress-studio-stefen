import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button, Field, Input } from '../components/ui/index.js';

const DEFAULT_TITLE = 'Sign in — FrontPress Admin';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const summaryRef = useRef(null);

  // Reflect error state in <title> so screen-reader users (and tab-strip
  // scanners) hear/see the change without inspecting the form. Reset on
  // unmount in case the user navigates away mid-error.
  useEffect(() => {
    document.title = error ? `(1 problem) ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    return () => { document.title = DEFAULT_TITLE; };
  }, [error]);

  // On error, move focus into the summary so screen-reader users land on
  // the announcement and sighted users see it before reaching the form.
  useEffect(() => {
    if (error) summaryRef.current?.focus();
  }, [error]);

  const from = location.state?.from;
  const redirectTo = from ? `${from.pathname || '/'}${from.search || ''}${from.hash || ''}` : '/';

  if (user) return <Navigate to={redirectTo} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    // Prevent double-submit while a request is in flight without disabling
    // the button (which would lose the focus ring and confuse SR users).
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      // Server returns a user-perspective string already; this fallback
      // covers network failures and unexpected shapes.
      setError(err.message || "Something went wrong. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <form
        onSubmit={onSubmit}
        noValidate
        aria-describedby={error ? 'login-error-summary' : undefined}
        className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-card"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">M</span>
          <h1 className="text-base font-semibold">FrontPress Admin</h1>
        </div>

        {error && (
          <div
            id="login-error-summary"
            ref={summaryRef}
            tabIndex={-1}
            role="alert"
            aria-live="polite"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
            <p className="font-semibold">There's a problem with your sign-in</p>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        )}

        <Field label="Username">
          <Input
            id="login-username"
            autoFocus
            required
            autoComplete="username"
            aria-invalid={!!error}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>

        <Field label="Password">
          <Input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={!!error}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" aria-busy={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
