import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_CURRENCY_SYMBOL,
  HEARTBEAT_INTERVAL_MS,
} from './config/constants';
import { createPreviewSeedState, getDevPreviewRole, type PreviewRole } from './data/demoStore';
import { auth } from './firebase/client';
import {
  activateWorkerWithCode,
  ensureUserProfileAndLogSignIn,
  saveAdminSettings,
  sendHeartbeatPing,
  setWorkerRemoved,
  signInWithGoogle,
  signOutUser,
  submitSiteRequest,
  subscribeAllRequests,
  subscribeAllUsers,
  subscribeMyRequests,
  subscribePublicConfig,
  subscribeSecurityConfig,
  subscribeSignInLogs,
  subscribeUserProfile,
  updateRequestStatusAndPrices,
} from './firebase/service';
import type {
  PublicConfig,
  RequestFilters,
  RequestItem,
  RequestStatus,
  SecurityConfig,
  SignInLog,
  SiteRequest,
  UnitType,
  UserProfile,
} from './types';
import { filterRequests, formatRequestNumber } from './utils/requests';
import { formatFriendlyFirebaseError } from './utils/errors';
import { AccessCodeGate } from './components/AccessCodeGate';
import { AdminPrintableRequirements } from './components/AdminPrintableRequirements';
import { AdminReportView } from './components/AdminReportView';
import { AdminRequestDetail } from './components/AdminRequestDetail';
import { AdminRequestsView } from './components/AdminRequestsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { AdminWorkersView } from './components/AdminWorkersView';
import { AppHeader, type AdminTab } from './components/AppHeader';
import { SignInScreen } from './components/SignInScreen';
import { WorkerWorkspace } from './components/WorkerWorkspace';

export default function App() {
  const [previewRole, setPreviewRole] = useState<PreviewRole>(() => getDevPreviewRole());
  const [authReady, setAuthReady] = useState<boolean>(() => getDevPreviewRole() !== null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [publicConfig, setPublicConfig] = useState<PublicConfig>({
    companyName: DEFAULT_COMPANY_NAME,
    currencySymbol: DEFAULT_CURRENCY_SYMBOL,
    initialized: false,
    updatedAtMs: Date.now(),
  });
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig | null>(null);

  const [myRequests, setMyRequests] = useState<SiteRequest[]>([]);
  const [allRequests, setAllRequests] = useState<SiteRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [signInLogs, setSignInLogs] = useState<SignInLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [adminTab, setAdminTab] = useState<AdminTab>('requests');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [printingRequirements, setPrintingRequirements] = useState(false);
  const [filters, setFilters] = useState<RequestFilters>({
    workerId: 'all',
    status: 'all',
    fromDate: '',
    toDate: '',
  });

  // Initialize DEV preview seed if ?previewRole is set in dev mode
  useEffect(() => {
    if (!previewRole) return;
    const seed = createPreviewSeedState(previewRole);
    setCurrentUser(seed.currentUser);
    setAllUsers(seed.users);
    setAllRequests(seed.requests);
    setMyRequests(seed.requests.filter((r) => r.workerId === seed.currentUser.uid));
    setSignInLogs(seed.signInLogs);
    setPublicConfig(seed.publicConfig);
    setSecurityConfig(seed.securityConfig);
    setAuthReady(true);
    setDataLoading(false);
  }, [previewRole]);

  // Real Firebase Auth listener
  useEffect(() => {
    if (previewRole) return;

    let profileUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = undefined;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setMyRequests([]);
        setAllRequests([]);
        setAllUsers([]);
        setSignInLogs([]);
        setSecurityConfig(null);
        setAuthReady(true);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);
      try {
        const profile = await ensureUserProfileAndLogSignIn(firebaseUser);
        setCurrentUser(profile);
        profileUnsub = subscribeUserProfile(firebaseUser.uid, (nextProfile) => {
          setCurrentUser(nextProfile);
        });
      } catch (err) {
        setAuthError(formatFriendlyFirebaseError(err));
      } finally {
        setAuthLoading(false);
        setAuthReady(true);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, [previewRole]);

  // Subscribe to public company settings when signed in
  useEffect(() => {
    if (previewRole || !currentUser) return;
    return subscribePublicConfig(setPublicConfig);
  }, [previewRole, currentUser?.uid]);

  // Subscribe to role-appropriate Firestore data
  useEffect(() => {
    if (previewRole || !currentUser) return;

    if (currentUser.role === 'admin') {
      setDataLoading(true);
      const unsubReq = subscribeAllRequests((rows) => {
        setAllRequests(rows);
        setDataLoading(false);
      });
      const unsubUsers = subscribeAllUsers(setAllUsers);
      const unsubLogs = subscribeSignInLogs(setSignInLogs);
      const unsubSec = subscribeSecurityConfig(setSecurityConfig);
      return () => {
        unsubReq();
        unsubUsers();
        unsubLogs();
        unsubSec();
      };
    }

    if (currentUser.active && !currentUser.removed) {
      setDataLoading(true);
      const unsubMy = subscribeMyRequests(currentUser.uid, (rows) => {
        setMyRequests(rows);
        setDataLoading(false);
      });
      return () => {
        unsubMy();
      };
    }

    setMyRequests([]);
    setDataLoading(false);
    return undefined;
  }, [previewRole, currentUser?.uid, currentUser?.role, currentUser?.active, currentUser?.removed]);

  // Heartbeat ping every 2 minutes while app is open
  useEffect(() => {
    if (previewRole || !currentUser || currentUser.removed) return;

    const timer = window.setInterval(() => {
      void sendHeartbeatPing(currentUser.uid).catch((err) => {
        console.error('Heartbeat ping failed:', err);
      });
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [previewRole, currentUser?.uid, currentUser?.removed]);

  const filteredAdminRequests = useMemo(
    () => filterRequests(allRequests, filters),
    [allRequests, filters]
  );

  const selectedRequest = useMemo(
    () => allRequests.find((r) => r.id === selectedRequestId) ?? null,
    [allRequests, selectedRequestId]
  );

  async function handleGoogleSignIn() {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(formatFriendlyFirebaseError(err));
      }
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (previewRole) {
      setPreviewRole(null);
      setCurrentUser(null);
      return;
    }
    await signOutUser();
  }

  async function handleActivateWorker(code: string) {
    if (!currentUser) return;
    if (previewRole) {
      if (code.trim().toUpperCase() !== (securityConfig?.accessCode ?? 'SITE2026')) {
        throw new Error('Incorrect company access code.');
      }
      const updated: UserProfile = {
        ...currentUser,
        active: true,
        joinedAtMs: Date.now(),
        lastSeenAtMs: Date.now(),
      };
      setCurrentUser(updated);
      setAllUsers((prev) => prev.map((u) => (u.uid === updated.uid ? updated : u)));
      setMyRequests(allRequests.filter((r) => r.workerId === updated.uid));
      return;
    }
    await activateWorkerWithCode(currentUser.uid, currentUser.displayName, code);
  }

  async function handleSubmitWorkerRequest(input: {
    site: string;
    purpose: string;
    notes: string;
    items: { name: string; quantity: number; unit: UnitType }[];
  }): Promise<string> {
    if (!currentUser) throw new Error('Not signed in.');
    if (previewRole) {
      const maxNum = allRequests.reduce((m, r) => Math.max(m, r.requestNumberNum), 0);
      const nextNum = maxNum + 1;
      const reqNum = formatRequestNumber(nextNum);
      const now = Date.now();
      const newReq: SiteRequest = {
        id: `req_preview_${now}`,
        requestNumberNum: nextNum,
        requestNumber: reqNum,
        workerId: currentUser.uid,
        workerName: currentUser.displayName,
        workerEmail: currentUser.email,
        site: input.site,
        purpose: input.purpose,
        notes: input.notes,
        items: input.items.map((it, idx) => ({
          id: `item_${now}_${idx}`,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: null,
        })),
        status: 'pending',
        createdAtMs: now,
        updatedAtMs: now,
      };
      setAllRequests((prev) => [newReq, ...prev]);
      setMyRequests((prev) => [newReq, ...prev]);
      return reqNum;
    }
    return submitSiteRequest(currentUser, input);
  }

  async function handleSaveRequestDetail(
    requestId: string,
    status: RequestStatus,
    items: RequestItem[]
  ) {
    if (previewRole) {
      setAllRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status, items, updatedAtMs: Date.now() } : r
        )
      );
      return;
    }
    await updateRequestStatusAndPrices(requestId, status, items);
  }

  async function handleToggleWorkerRemoved(workerUid: string, nextRemoved: boolean) {
    if (previewRole) {
      setAllUsers((prev) =>
        prev.map((u) => (u.uid === workerUid ? { ...u, removed: nextRemoved } : u))
      );
      return;
    }
    await setWorkerRemoved(workerUid, nextRemoved);
  }

  async function handleSaveSettings(params: {
    accessCode: string;
    companyName: string;
    currencySymbol: string;
  }) {
    if (!currentUser) return;
    if (previewRole) {
      setSecurityConfig({
        accessCode: params.accessCode,
        updatedAtMs: Date.now(),
        updatedBy: currentUser.uid,
      });
      setPublicConfig({
        companyName: params.companyName,
        currencySymbol: params.currencySymbol,
        initialized: true,
        updatedAtMs: Date.now(),
      });
      return;
    }
    await saveAdminSettings({
      adminUid: currentUser.uid,
      ...params,
    });
  }

  function handleSelectAdminTab(tab: AdminTab) {
    setAdminTab(tab);
    setSelectedRequestId(null);
    setPrintingRequirements(false);
  }

  return (
    <div className="min-h-screen bg-[#E8EAEB] text-[#1B2023]">
      <AppHeader
        user={currentUser}
        activeTab={currentUser?.role === 'admin' ? adminTab : undefined}
        onSelectTab={currentUser?.role === 'admin' ? handleSelectAdminTab : undefined}
        onSignOut={handleSignOut}
      />

      {!authReady ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-md mx-auto bg-white border border-[#CFD4D8] rounded-sm p-8 text-center">
            <p className="text-sm font-semibold text-[#4A5258]">Loading Site Requests...</p>
          </div>
        </main>
      ) : !currentUser ? (
        <SignInScreen
          onSignIn={handleGoogleSignIn}
          loading={authLoading}
          error={authError}
        />
      ) : currentUser.role === 'worker' ? (
        !currentUser.active || currentUser.removed ? (
          <AccessCodeGate
            user={currentUser}
            onActivate={handleActivateWorker}
            onSignOut={handleSignOut}
          />
        ) : (
          <WorkerWorkspace
            user={currentUser}
            requests={myRequests}
            loadingRequests={dataLoading}
            onSubmitRequest={handleSubmitWorkerRequest}
          />
        )
      ) : adminTab === 'requests' && selectedRequest ? (
        <AdminRequestDetail
          request={selectedRequest}
          publicConfig={publicConfig}
          onBack={() => setSelectedRequestId(null)}
          onSave={handleSaveRequestDetail}
        />
      ) : adminTab === 'requests' && printingRequirements ? (
        <AdminPrintableRequirements
          requests={filteredAdminRequests}
          workers={allUsers}
          filters={filters}
          publicConfig={publicConfig}
          onBack={() => setPrintingRequirements(false)}
        />
      ) : adminTab === 'requests' ? (
        <AdminRequestsView
          requests={allRequests}
          filteredRequests={filteredAdminRequests}
          workers={allUsers}
          filters={filters}
          loading={dataLoading}
          onChangeFilters={setFilters}
          onOpenRequest={(id) => setSelectedRequestId(id)}
          onOpenPrintableRequirements={() => setPrintingRequirements(true)}
        />
      ) : adminTab === 'workers' ? (
        <AdminWorkersView
          users={allUsers}
          signInLogs={signInLogs}
          loading={dataLoading}
          onToggleRemoved={handleToggleWorkerRemoved}
        />
      ) : adminTab === 'report' ? (
        <AdminReportView
          requests={allRequests}
          workers={allUsers}
          publicConfig={publicConfig}
        />
      ) : (
        <AdminSettingsView
          publicConfig={publicConfig}
          securityConfig={securityConfig}
          onSaveSettings={handleSaveSettings}
        />
      )}
    </div>
  );
}
