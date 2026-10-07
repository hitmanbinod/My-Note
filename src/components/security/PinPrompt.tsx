import { useEffect, useRef, useState } from 'react';
import { verifyPin, hasPin, savePin, type PinScope } from '@/lib/utils/pin';
import { unlockSession, lockSession, unlockVault, lockVault } from '@/lib/lock';

/**
 * Reusable 4-digit PIN input: auto-advancing boxes with paste support.
 * Calls onComplete with the joined PIN once all four digits are entered.
 */
export function PinInput({
  value,
  onChange,
  onComplete,
  autoFocus,
  compact,
  error
}: {
  value: string[];
  onChange: (values: string[]) => void;
  onComplete?: (pin: string, values: string[]) => void;
  autoFocus?: boolean;
  compact?: boolean;
  error?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    const next = [...value];
    if (clean.length > 1) {
      // Multi-character entry (paste, or typing into a filled box): lay the
      // digits down from this box onward — never past the fourth.
      const chars = clean.slice(0, 4 - index).split('');
      chars.forEach((ch, i) => { next[index + i] = ch; });
      onChange(next);
      inputs.current[Math.min(index + chars.length, 3)]?.focus();
      if (next.join('').length === 4 && !next.includes('')) onComplete?.(next.join(''), next);
      return;
    }
    next[index] = clean;
    onChange(next);
    if (clean && index < 3) inputs.current[index + 1]?.focus();
    if (next.join('').length === 4 && !next.includes('')) onComplete?.(next.join(''), next);
  };

  const sizeClass = compact ? 'h-9 w-8 text-sm' : 'h-12 w-11 text-lg';
  return (
    <div className="flex gap-2">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputs.current[index] = el; }}
          autoFocus={autoFocus && index === 0}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={digit}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !value[index] && index > 0) inputs.current[index - 1]?.focus();
          }}
          aria-label={`PIN digit ${index + 1}`}
          className={`${sizeClass} rounded-lg border bg-[var(--panel)] text-center font-semibold outline-none transition-colors ${error ? 'border-red-400' : 'border-[var(--line)] focus:border-[var(--brand)]'}`}
        />
      ))}
    </div>
  );
}

/**
 * Minimal 4-digit PIN gate. Unlocks the matching session on success; offers
 * inline setup when no PIN exists yet. scope 'app' protects locked folders,
 * scope 'vault' protects the password manager with its own PIN.
 */
export function PinPrompt({ onUnlocked, onSetup, scope = 'app' }: { onUnlocked?: () => void; onSetup?: () => void; scope?: PinScope }) {
  const [hasExisting, setHasExisting] = useState<boolean | null>(null);

  useEffect(() => {
    void hasPin(scope).then(setHasExisting);
  }, [scope]);

  if (hasExisting === null) return null;
  if (!hasExisting) return <PinSetup scope={scope} onDone={() => { if (scope === 'vault') unlockVault(); else unlockSession(); onSetup?.(); onUnlocked?.(); }} />;
  return <PinUnlock scope={scope} onUnlocked={onUnlocked} />;
}

function PinUnlock({ onUnlocked, scope }: { onUnlocked?: () => void; scope: PinScope }) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');

  const submit = async (pin: string) => {
    const ok = await verifyPin(pin, scope);
    if (ok) {
      if (scope === 'vault') unlockVault();
      else unlockSession();
      setDigits(['', '', '', '']);
      setError('');
      onUnlocked?.();
    } else {
      setError('Wrong PIN — try again');
      setDigits(['', '', '', '']);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <p className="text-[13px] font-medium text-[var(--ink)]">{scope === 'vault' ? 'Enter the password manager PIN' : 'Enter PIN'}</p>
      <PinInput value={digits} onChange={setDigits} onComplete={(pin) => void submit(pin)} autoFocus error={Boolean(error)} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="button" onClick={() => (scope === 'vault' ? lockVault() : lockSession())} className="text-xs text-[var(--muted)] hover:text-[var(--ink)]">
        Lock again
      </button>
    </div>
  );
}

function PinSetup({ onDone, scope }: { onDone: () => void; scope: PinScope }) {
  const [first, setFirst] = useState<string[]>(['', '', '', '']);
  const [second, setSecond] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');

  const pin = first.join('');
  const ready = pin.length === 4 && !first.includes('') && second.join('') === pin;

  // onComplete passes the freshly typed repeat-PIN — reading stale state here
  // is what caused the false "PINs do not match" error on setup.
  const save = async (secondOverride?: string) => {
    const secondPin = secondOverride ?? second.join('');
    if (first.join('') !== secondPin) return setError('PINs do not match');
    if (!/^\d{4}$/.test(pin)) return setError('Use exactly 4 digits');
    try {
      await savePin(pin, scope);
      onDone();
    } catch {
      setError('Could not save the PIN');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div>
        <p className="text-center text-[13px] font-medium text-[var(--ink)]">Create a 4-digit PIN</p>
        <p className="mt-1 max-w-[40ch] text-center text-[11.5px] leading-relaxed text-[var(--muted)]">
          Protects your password vault and locked folders. Type it into the notes search bar to reveal them.
        </p>
      </div>
      <PinInput value={first} onChange={setFirst} autoFocus />
      <p className="text-[11px] text-[var(--muted)]">Repeat PIN</p>
      <PinInput value={second} onChange={setSecond} onComplete={(_pin, values) => void save(values?.join(''))} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!ready}
        className="pressable rounded-md bg-primary-600 px-5 py-2 text-[13px] font-medium text-[var(--on-brand)] hover:bg-primary-700 disabled:opacity-40"
      >
        Save PIN
      </button>
    </div>
  );
}
