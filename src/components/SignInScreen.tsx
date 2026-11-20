import { HardHat } from 'lucide-react';

interface SignInScreenProps {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
}

export function SignInScreen({ onSignIn, loading, error }: SignInScreenProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-xl mx-auto bg-white border border-[#CFD4D8] rounded-sm p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-[#1B2023] text-[#F2C200] rounded-sm flex items-center justify-center shrink-0">
            <HardHat className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
              Site procurement sign in
            </h1>
          </div>
        </div>

        <p className="text-sm sm:text-base text-[#4A5258] leading-relaxed mb-6">
          Submit material and equipment requests from any site, or review requisitions, team access, and procurement totals. Sign in with your Google account to continue.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onSignIn}
          disabled={loading}
          className="w-full min-h-[48px] px-5 py-3 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] font-bold text-base rounded-sm transition-colors flex items-center justify-center gap-3 cursor-pointer"
        >
          <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <p className="mt-4 text-xs text-[#646D74]">
          New site workers will be asked once for the company access code after signing in.
        </p>
      </div>
    </main>
  );
}
