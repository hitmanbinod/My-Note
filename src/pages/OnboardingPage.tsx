import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiateGoogleAuth } from '@/lib/auth/google-auth';
import { db } from '@/lib/db/database';

function OnboardingPage() {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const startOffline = async () => { await db.settings.update('singleton', { onboardingCompleted: true }); navigate('/notes'); };
  const connectDrive = async () => {
    try {
      setConnecting(true);
      await initiateGoogleAuth();
      // Web flow navigates away to Google immediately; only the Electron flow resolves in-place.
      navigate('/notes', { replace: true });
    } catch (error) {
      setConnecting(false);
      alert(error instanceof Error ? error.message : 'Could not start Google sign in.');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-5 py-8 sm:px-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-primary-600 text-[var(--on-brand)]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 4.75h8.5A2.5 2.5 0 0 1 18 7.25v9.5a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.8" d="M9 9h5M9 12.5h5M9 16h3" /></svg></span>
          <span className="text-sm font-semibold tracking-tight text-[var(--ink)]">Tipot</span>
        </div>
        <span className="text-xs text-[var(--muted)]">Private by default</span>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col justify-center py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--muted)]">A quiet place to think</p>
        <h1 className="mt-4 max-w-2xl font-serif text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.08] tracking-tight text-[var(--ink)]">
          Your notes, always yours.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
          Capture ideas, shape plans, and keep the details that matter. Everything works offline,
          and you decide exactly when each note is saved.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button onClick={startOffline} className="pressable flex h-11 items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-[var(--on-brand)] hover:bg-primary-700">Start writing — free</button>
          <button onClick={connectDrive} disabled={connecting} className="pressable flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--line)] px-5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--panel-soft)] disabled:opacity-60"><GoogleIcon />{connecting ? 'Connecting…' : 'Connect Google Drive'}</button>
        </div>

        <div className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-[var(--line)] pt-6 text-[13px] text-[var(--muted)]">
          <Feature icon="cloud-off" label="Works offline" />
          <Feature icon="spark" label="Rich text" />
          <Feature icon="lock" label="Optional encryption" />
        </div>
      </div>
    </main>
  );
}

function Feature({ label, icon }: { label: string; icon: 'cloud-off' | 'spark' | 'lock' }) { const paths = { 'cloud-off': 'M4 4l16 16M6.7 6.7A5.5 5.5 0 0 1 16 9a4 4 0 0 1 2.6 7M6 16a4 4 0 0 1-1-7.87', spark: 'm12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z', lock: 'M8 10V7.5a4 4 0 0 1 8 0V10m-9 0h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z' }; return <div className="flex items-center gap-2"><svg className="h-4 w-4 flex-none text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d={paths[icon]} /></svg><span>{label}</span></div>; }
const GoogleIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.86A6.01 6.01 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z"/><path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"/></svg>;

export default OnboardingPage;
