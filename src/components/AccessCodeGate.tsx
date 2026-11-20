import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldAlert } from 'lucide-react';
import type { UserProfile } from '../types';

interface AccessCodeGateProps {
  user: UserProfile;
  onActivate: (code: string) => Promise<void>;
  onSignOut: () => void;
}

export function AccessCodeGate({ user, onActivate, onSignOut }: AccessCodeGateProps) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.removed) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-lg mx-auto bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-[#FCE8E8] text-[#881B1B] border border-[#E5A3A3] rounded-sm flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-condensed text-3xl font-extrabold text-[#1B2023] leading-none">
              Access removed
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[#4A5258] mb-6">
            Access for <span className="font-semibold text-[#1B2023]">{user.email}</span> has been disabled by the administrator. Contact your site office if you need your access restored.
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[48px] px-5 py-3 bg-[#1B2023] hover:bg-[#2E353A] text-white font-semibold text-sm rounded-sm transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError('Enter the company access code (minimum 4 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await onActivate(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify access code.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-lg mx-auto bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#1B2023] text-[#F2C200] rounded-sm flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-condensed text-3xl font-extrabold text-[#1B2023] leading-none">
              Enter company access code
            </h1>
          </div>
        </div>

        <p className="text-sm text-[#4A5258] mb-6">
          Signed in as <span className="font-semibold text-[#1B2023]">{user.email}</span>. Enter your company access code once to activate your worker account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="company-access-code"
              className="block text-sm font-semibold text-[#1B2023] mb-1.5"
            >
              Company access code
            </label>
            <input
              id="company-access-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SITE2026"
              autoComplete="off"
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm font-mono text-base tracking-wider uppercase text-[#1B2023]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-5 py-3 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] font-bold text-base rounded-sm transition-colors cursor-pointer"
          >
            {submitting ? 'Verifying code...' : 'Activate account'}
          </button>
        </form>
      </div>
    </main>
  );
}
