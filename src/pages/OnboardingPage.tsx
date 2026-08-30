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
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-5 py-6 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary-300/25 blur-3xl dark:bg-primary-900/25" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-900/15" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/25"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 4.75h8.5A2.5 2.5 0 0 1 18 7.25v9.5a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.8" d="M9 9h5M9 12.5h5M9 16h3" /></svg></div><span className="text-sm font-bold tracking-tight text-[var(--ink)]">My Notes</span></div>
          <span className="hidden items-center gap-2 text-xs font-medium text-[var(--muted)] sm:flex"><svg className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10m-8 0h9a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z" /></svg>Private by default</span>
        </header>

        <div className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-[.88fr_1.12fr] lg:gap-20 lg:py-16">
          <section className="mx-auto max-w-xl lg:mx-0">
            <p className="eyebrow mb-5">A calmer place to think</p>
            <h1 className="text-[clamp(2.8rem,6vw,5.4rem)] font-bold leading-[.98] tracking-[-.065em] text-[var(--ink)]">Your notes,<br /><span className="text-primary-600 dark:text-primary-400">always yours.</span></h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">Capture ideas, shape plans, and keep the details that matter. Everything works offline, and you decide exactly when each note is saved.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={startOffline} className="pressable flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-lg shadow-primary-600/15 hover:bg-primary-700"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M5 12h14m-6-6 6 6-6 6" /></svg>Start writing — free</button>
              <button onClick={connectDrive} disabled={connecting} className="pressable flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-5 text-sm font-semibold text-[var(--ink)] hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20"><GoogleIcon />{connecting ? 'Connecting…' : 'Connect Google Drive'}</button>
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)]"><Feature icon="cloud-off" label="Works offline" /><Feature icon="spark" label="Rich text" /><Feature icon="lock" label="Optional encryption" /></div>
          </section>

          <section className="relative mx-auto w-full max-w-3xl" aria-label="Product preview">
            <div className="app-panel relative overflow-hidden rounded-[26px] bg-[var(--panel)] shadow-[0_35px_100px_rgb(0_0_0/.13)] dark:shadow-[0_35px_100px_rgb(0_0_0/.35)]">
              <div className="flex h-12 items-center gap-2 border-b border-[var(--line)] px-4"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><div className="mx-auto h-6 w-48 rounded-lg bg-[var(--panel-soft)]" /></div>
              <div className="grid min-h-[430px] grid-cols-[150px_1fr] sm:grid-cols-[190px_1fr]">
                <div className="border-r border-[var(--line)] bg-[var(--panel-soft)]/60 p-4"><div className="mb-7 flex items-center gap-2"><div className="h-7 w-7 rounded-lg bg-primary-600" /><div className="h-2.5 w-16 rounded-full bg-[var(--line)]" /></div><div className="h-8 rounded-lg bg-primary-600" /><div className="mt-6 space-y-2">{['All notes','Starred','Archive'].map((item, index) => <div key={item} className={`flex h-8 items-center gap-2 rounded-lg px-2 ${index === 0 ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}><div className={`h-3 w-3 rounded ${index === 0 ? 'bg-primary-400' : 'bg-[var(--line)]'}`} /><span className="text-[9px] font-semibold text-[var(--muted)]">{item}</span></div>)}</div></div>
                <div className="p-5 sm:p-7"><div className="flex items-center justify-between"><div><div className="h-2.5 w-16 rounded-full bg-primary-300" /><div className="mt-3 h-6 w-32 rounded-md bg-[var(--ink)]/85" /></div><div className="h-8 w-20 rounded-lg bg-primary-600" /></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><PreviewNote title="Ideas for the studio" lines={[85,65,72]} color="#f4c05f" /><PreviewNote title="Weekend in Kyoto" lines={[76,88,54]} color="#7cc3a7" /><PreviewNote title="Books to revisit" lines={[70,56,82]} color="#a79cff" /><PreviewNote title="Product principles" lines={[90,75,61]} color="#ef9a8c" /></div></div>
              </div>
            </div>
            <div className="app-panel absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl px-4 py-3 shadow-lg sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="m5 12 4 4L19 6" /></svg></span><div><p className="text-xs font-bold text-[var(--ink)]">You control saving</p><p className="text-[10px] text-[var(--muted)]">No account required</p></div></div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Feature({ label, icon }: { label: string; icon: 'cloud-off' | 'spark' | 'lock' }) { const paths = { 'cloud-off': 'M4 4l16 16M6.7 6.7A5.5 5.5 0 0 1 16 9a4 4 0 0 1 2.6 7M6 16a4 4 0 0 1-1-7.87', spark: 'm12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z', lock: 'M8 10V7.5a4 4 0 0 1 8 0V10m-9 0h10a2 2 0 0 1 2 2v7H5v-7a2 2 0 0 1 2-2Z' }; return <div className="flex items-center gap-2"><svg className="h-4 w-4 flex-none text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d={paths[icon]} /></svg><span>{label}</span></div>; }
function PreviewNote({ title, lines, color }: { title: string; lines: number[]; color: string }) { return <div className="relative min-h-[135px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm"><span className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ background: color }} /><p className="text-[10px] font-bold text-[var(--ink)]">{title}</p><div className="mt-4 space-y-2">{lines.map((width, i) => <div key={i} className="h-1.5 rounded-full bg-[var(--line)]" style={{ width: `${width}%` }} />)}</div><div className="absolute bottom-3 left-4 h-4 w-12 rounded bg-[var(--panel-soft)]" /></div>; }
const GoogleIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.86A6.01 6.01 0 0 1 6.07 12c0-.65.11-1.28.32-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.62Z"/><path fill="#EA4335" d="M12 6.01c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"/></svg>;

export default OnboardingPage;
