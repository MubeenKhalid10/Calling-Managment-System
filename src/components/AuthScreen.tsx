import React, { FormEvent, useState } from 'react';
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '../firebase';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthenticated();
    } catch (authError) {
      const code = authError instanceof Error ? authError.message : '';
      if (code.includes('auth/invalid-credential')) {
        setError('The email or password is incorrect.');
      } else if (code.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (code.includes('auth/weak-password')) {
        setError('Use a password with at least 6 characters.');
      } else if (code.includes('auth/invalid-email')) {
        setError('Enter a valid email address.');
      } else {
        setError('Authentication failed. Check Firebase Auth settings and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 p-6 sm:p-8">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-blue-600 uppercase">
            Cold Call Manager
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {isRegistering ? 'Create your account' : 'Sign in to your workspace'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your Firebase account to access the calling database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={6}
              required
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Please wait...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Registration is temporarily disabled. Re-enable this link when account creation is available. */}
        {/*
        <button
          type="button"
          onClick={() => {
            setIsRegistering((current) => !current);
            setError('');
          }}
          className="mt-5 w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
        </button>
        */}
      </section>
    </main>
  );
};