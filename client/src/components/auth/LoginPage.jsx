import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const COPY = {
  signin: { subtitle: 'Sign in to your account', button: 'Sign In' },
  signup: { subtitle: 'Create your account', button: 'Create Account' },
  reset: { subtitle: 'Reset your password', button: 'Send Reset Link' },
};

export default function LoginPage({ initialMode = 'signin', embedded = false }) {
  const { login, signup, resetPassword, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState(initialMode); // signin | signup | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const [notice, setNotice] = useState(null);

  function switchMode(next) {
    setMode(next);
    setLocalError(null);
    setNotice(null);
    clearError();
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setNotice(null);

    if (mode !== 'reset' && password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await signup(email, password);
        if (needsConfirmation) {
          setNotice(`Almost there — check ${email} for a confirmation link, then sign in.`);
          setMode('signin');
        }
      } else if (mode === 'reset') {
        await resetPassword(email);
        setNotice(`If an account exists for ${email}, a reset link is on its way.`);
        setMode('signin');
      } else {
        await login(email, password);
      }
    } catch {
      // error is set in context
    }
  };

  const displayError = localError || error;

  const containerClass = embedded
    ? 'w-full flex items-center justify-center px-4'
    : 'min-h-screen flex items-center justify-center bg-gray-50 px-4';

  return (
    <div className={containerClass}>
      <div className="w-full max-w-sm">
        {!embedded && (
          <>
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Digvy</h1>
            <p className="text-sm text-center text-gray-500 mb-6">{COPY[mode].subtitle}</p>
          </>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {displayError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {displayError}
            </div>
          )}
          {notice && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {notice}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : COPY[mode].button}
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="w-full text-xs text-center text-slate-500 hover:underline"
            >
              Forgot password?
            </button>
          )}
        </form>

        <p className="text-sm text-center text-gray-500 mt-4">
          {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
            className="text-blue-600 font-medium hover:underline"
          >
            {mode === 'signup' ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
        {mode === 'reset' && (
          <p className="text-sm text-center text-gray-500 mt-2">
            <button type="button" onClick={() => switchMode('signin')} className="text-blue-600 font-medium hover:underline">
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
