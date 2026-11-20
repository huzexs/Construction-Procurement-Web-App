import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { BLUEPRINT_LIMITS } from '../config/constants';
import type { PublicConfig, SecurityConfig } from '../types';
import { generateAccessCode, validateAccessCode } from '../utils/requests';

interface AdminSettingsViewProps {
  publicConfig: PublicConfig;
  securityConfig: SecurityConfig | null;
  onSaveSettings: (params: {
    accessCode: string;
    companyName: string;
    currencySymbol: string;
  }) => Promise<void>;
}

export function AdminSettingsView({
  publicConfig,
  securityConfig,
  onSaveSettings,
}: AdminSettingsViewProps) {
  const [accessCode, setAccessCode] = useState(securityConfig?.accessCode ?? '');
  const [companyName, setCompanyName] = useState(publicConfig.companyName);
  const [currencySymbol, setCurrencySymbol] = useState(publicConfig.currencySymbol);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (securityConfig?.accessCode) {
      setAccessCode(securityConfig.accessCode);
    }
  }, [securityConfig?.accessCode]);

  useEffect(() => {
    setCompanyName(publicConfig.companyName);
    setCurrencySymbol(publicConfig.currencySymbol);
  }, [publicConfig.companyName, publicConfig.currencySymbol]);

  function handleGenerateRandom() {
    setAccessCode(generateAccessCode(8));
    setSavedMsg(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);

    const codeCheck = validateAccessCode(accessCode);
    if (!codeCheck.valid) {
      setError(codeCheck.error || 'Invalid access code.');
      return;
    }

    const trimmedCompany = companyName.trim();
    if (!trimmedCompany || trimmedCompany.length > BLUEPRINT_LIMITS.companyNameMax) {
      setError(`Company name must be 1 to ${BLUEPRINT_LIMITS.companyNameMax} characters.`);
      return;
    }

    const trimmedCurrency = currencySymbol.trim();
    if (!trimmedCurrency || trimmedCurrency.length > BLUEPRINT_LIMITS.currencySymbolMax) {
      setError(`Currency symbol must be 1 to ${BLUEPRINT_LIMITS.currencySymbolMax} characters.`);
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        accessCode: codeCheck.normalized,
        companyName: trimmedCompany,
        currencySymbol: trimmedCurrency,
      });
      setAccessCode(codeCheck.normalized);
      setSavedMsg('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-condensed text-3xl sm:text-4xl font-extrabold text-[#1B2023] leading-none">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#4A5258]">
          Configure the worker onboarding access code, company printout header, and currency symbol.
        </p>
      </div>

      <section className="bg-white border border-[#CFD4D8] rounded-sm p-5 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="settings-access-code"
              className="block text-sm font-semibold text-[#1B2023] mb-1.5"
            >
              Company access code
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="settings-access-code"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={BLUEPRINT_LIMITS.accessCodeMax}
                placeholder="Minimum 4 uppercase letters or digits"
                className="flex-1 min-h-[48px] px-3.5 py-2.5 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm font-mono text-base tracking-wider uppercase text-[#1B2023]"
              />
              <button
                type="button"
                onClick={handleGenerateRandom}
                className="min-h-[48px] px-4 py-2.5 bg-white hover:bg-[#F3F5F6] border border-[#1B2023] text-[#1B2023] text-sm font-semibold rounded-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Generate 8-char code</span>
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[#646D74]">
              Uppercase letters and digits only, minimum 4 characters. Stored privately for administrator access only.
            </p>
          </div>

          <div>
            <label
              htmlFor="settings-company-name"
              className="block text-sm font-semibold text-[#1B2023] mb-1.5"
            >
              Company name for printouts
            </label>
            <input
              id="settings-company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.companyNameMax}
              placeholder="e.g. SiteWorks Construction Ltd."
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm text-sm text-[#1B2023]"
            />
          </div>

          <div className="max-w-xs">
            <label
              htmlFor="settings-currency"
              className="block text-sm font-semibold text-[#1B2023] mb-1.5"
            >
              Currency symbol
            </label>
            <input
              id="settings-currency"
              type="text"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              maxLength={BLUEPRINT_LIMITS.currencySymbolMax}
              placeholder="₦"
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-[#F7F8F9] border border-[#B9C1C7] focus:border-[#1B2023] focus:outline-none rounded-sm font-mono text-base text-[#1B2023]"
            />
          </div>

          {error && (
            <div role="alert" className="p-3.5 bg-[#FCE8E8] border border-[#E5A3A3] text-[#881B1B] text-sm font-medium rounded-sm">
              {error}
            </div>
          )}

          {savedMsg && (
            <div role="status" className="p-3.5 bg-[#E2F3E8] border border-[#8AC9A2] text-[#14532D] text-sm font-medium rounded-sm">
              {savedMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[48px] px-6 py-3 bg-[#F2C200] hover:bg-[#DFB300] disabled:opacity-60 text-[#1B2023] font-bold text-base rounded-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{saving ? 'Saving settings...' : 'Save settings'}</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
