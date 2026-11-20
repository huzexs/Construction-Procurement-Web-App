import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  BLUEPRINT_LIMITS,
  DEFAULT_COMPANY_NAME,
  DEFAULT_CURRENCY_SYMBOL,
} from '../config/constants';
import type {
  PublicConfig,
  RequestItem,
  RequestStatus,
  SecurityConfig,
  SignInLog,
  SiteRequest,
  UnitType,
  UserProfile,
} from '../types';
import {
  formatRequestNumber,
  generateAccessCode,
  validateAccessCode,
} from '../utils/requests';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './client';

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function toNullableMillis(val: unknown): number | null {
  if (val == null) return null;
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return null;
}

function sanitizeDisplayName(user: User): string {
  const raw = (user.displayName || user.email?.split('@')[0] || 'Site User').trim();
  return raw.slice(0, BLUEPRINT_LIMITS.displayNameMax) || 'Site User';
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function mapUserProfile(data: Record<string, unknown>, id: string): UserProfile {
  return {
    uid: String(data.uid ?? id),
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? 'Site User'),
    role: data.role === 'admin' ? 'admin' : 'worker',
    active: Boolean(data.active),
    removed: Boolean(data.removed),
    createdAtMs: toMillis(data.createdAt),
    lastSeenAtMs: toMillis(data.lastSeenAt),
    joinedAtMs: toNullableMillis(data.joinedAt),
  };
}

function mapSiteRequest(data: Record<string, unknown>, id: string): SiteRequest {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: RequestItem[] = rawItems.map((raw, idx) => {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
      id: String(item.id ?? `item-${idx}`),
      name: String(item.name ?? ''),
      quantity: Number(item.quantity ?? 0),
      unit: (item.unit as UnitType) ?? 'pcs',
      unitPrice: item.unitPrice == null ? null : Number(item.unitPrice),
    };
  });

  return {
    id: String(data.id ?? id),
    requestNumberNum: Number(data.requestNumberNum ?? 1),
    requestNumber: String(data.requestNumber ?? 'REQ-0001'),
    workerId: String(data.workerId ?? ''),
    workerName: String(data.workerName ?? ''),
    workerEmail: String(data.workerEmail ?? ''),
    site: String(data.site ?? ''),
    purpose: String(data.purpose ?? ''),
    notes: String(data.notes ?? ''),
    items,
    status: (data.status as RequestStatus) ?? 'pending',
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (auth.currentUser) {
    try {
      sessionStorage.removeItem(`sr_signin_${auth.currentUser.uid}`);
    } catch {
      // ignore storage errors
    }
  }
  await signOut(auth);
}

export async function initializeAdminWorkspace(adminUid: string): Promise<void> {
  const securityRef = doc(db, 'appConfig', 'security');
  const publicRef = doc(db, 'appConfig', 'public');
  const counterRef = doc(db, 'counters', 'requests');

  try {
    const [secSnap, pubSnap, cntSnap] = await Promise.all([
      getDoc(securityRef),
      getDoc(publicRef),
      getDoc(counterRef),
    ]);

    const batch = writeBatch(db);
    let hasWrites = false;

    if (!secSnap.exists()) {
      batch.set(securityRef, {
        accessCode: generateAccessCode(8),
        updatedAt: serverTimestamp(),
        updatedBy: adminUid,
      });
      hasWrites = true;
    }

    if (!pubSnap.exists()) {
      batch.set(publicRef, {
        companyName: DEFAULT_COMPANY_NAME,
        currencySymbol: DEFAULT_CURRENCY_SYMBOL,
        initialized: true,
        updatedAt: serverTimestamp(),
      });
      hasWrites = true;
    }

    if (!cntSnap.exists()) {
      batch.set(counterRef, {
        count: 0,
        lastRequestId: 'INIT',
        updatedAt: serverTimestamp(),
      });
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/security');
  }
}

export async function ensureUserProfileAndLogSignIn(firebaseUser: User): Promise<UserProfile> {
  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);
  const displayName = sanitizeDisplayName(firebaseUser);
  const email = firebaseUser.email ?? '';
  const admin = isAdminEmail(email);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!existingSnap.exists()) {
    const payload = {
      uid: firebaseUser.uid,
      email,
      displayName,
      role: admin ? 'admin' : 'worker',
      active: admin,
      removed: false,
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      joinedAt: admin ? serverTimestamp() : null,
    };

    try {
      await setDoc(userRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  } else {
    const current = mapUserProfile(existingSnap.data(), existingSnap.id);
    if (!current.removed) {
      try {
        await updateDoc(userRef, {
          lastSeenAt: serverTimestamp(),
          displayName,
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
    }
  }

  // Record sign-in log once per browser session
  const sessionKey = `sr_signin_${firebaseUser.uid}`;
  let alreadyLogged = false;
  try {
    alreadyLogged = sessionStorage.getItem(sessionKey) === '1';
  } catch {
    alreadyLogged = false;
  }

  if (!alreadyLogged) {
    const logRef = doc(collection(db, 'signInLogs'));
    try {
      await setDoc(logRef, {
        id: logRef.id,
        uid: firebaseUser.uid,
        email,
        displayName,
        role: admin ? 'admin' : 'worker',
        timestamp: serverTimestamp(),
      });
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `signInLogs/${logRef.id}`);
    }
  }

  if (admin) {
    await initializeAdminWorkspace(firebaseUser.uid);
  }

  try {
    const fresh = await getDoc(userRef);
    return mapUserProfile(fresh.data() ?? {}, fresh.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapUserProfile(snap.data(), snap.id));
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribePublicConfig(onData: (config: PublicConfig) => void): Unsubscribe {
  const path = 'appConfig/public';
  return onSnapshot(
    doc(db, 'appConfig', 'public'),
    (snap) => {
      if (!snap.exists()) {
        onData({
          companyName: DEFAULT_COMPANY_NAME,
          currencySymbol: DEFAULT_CURRENCY_SYMBOL,
          initialized: false,
          updatedAtMs: Date.now(),
        });
        return;
      }
      const d = snap.data();
      onData({
        companyName: String(d.companyName ?? DEFAULT_COMPANY_NAME),
        currencySymbol: String(d.currencySymbol ?? DEFAULT_CURRENCY_SYMBOL),
        initialized: Boolean(d.initialized),
        updatedAtMs: toMillis(d.updatedAt),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeSecurityConfig(onData: (config: SecurityConfig | null) => void): Unsubscribe {
  const path = 'appConfig/security';
  return onSnapshot(
    doc(db, 'appConfig', 'security'),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        accessCode: String(d.accessCode ?? ''),
        updatedAtMs: toMillis(d.updatedAt),
        updatedBy: String(d.updatedBy ?? ''),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function activateWorkerWithCode(
  uid: string,
  displayName: string,
  rawCode: string
): Promise<void> {
  const check = validateAccessCode(rawCode);
  if (!check.valid) {
    throw new Error(check.error || 'Enter a valid access code.');
  }

  const pubRef = doc(db, 'appConfig', 'public');
  let pubSnap;
  try {
    pubSnap = await getDoc(pubRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'appConfig/public');
  }

  if (!pubSnap.exists() || !pubSnap.data()?.initialized) {
    throw new Error('Company access code is not configured yet. Ask your administrator to sign in first.');
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'codeVerifications', uid), {
    uid,
    code: check.normalized,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, 'users', uid), {
    active: true,
    joinedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    displayName: displayName.slice(0, BLUEPRINT_LIMITS.displayNameMax) || 'Site User',
  });

  try {
    await batch.commit();
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (msg.includes('permission') || msg.includes('insufficient')) {
      throw new Error('Incorrect company access code, or your access has been removed.');
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function sendHeartbeatPing(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      lastSeenAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitSiteRequest(
  user: UserProfile,
  input: {
    site: string;
    purpose: string;
    notes: string;
    items: { name: string; quantity: number; unit: UnitType }[];
  }
): Promise<string> {
  const counterRef = doc(db, 'counters', 'requests');
  const newReqRef = doc(collection(db, 'requests'));

  const itemsPayload = input.items.map((item, idx) => ({
    id: `item_${Date.now()}_${idx}`,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: null,
  }));

  try {
    const requestNumber = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      if (!counterSnap.exists()) {
        throw new Error('Request counter is not initialized. Ask your administrator to sign in first.');
      }
      const currentCount = Number(counterSnap.data().count ?? 0);
      const nextNum = currentCount + 1;
      const reqNumStr = formatRequestNumber(nextNum);

      tx.update(counterRef, {
        count: nextNum,
        lastRequestId: newReqRef.id,
        updatedAt: serverTimestamp(),
      });

      tx.set(newReqRef, {
        id: newReqRef.id,
        requestNumberNum: nextNum,
        requestNumber: reqNumStr,
        workerId: user.uid,
        workerName: user.displayName,
        workerEmail: user.email,
        site: input.site,
        purpose: input.purpose,
        notes: input.notes,
        items: itemsPayload,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return reqNumStr;
    });

    return requestNumber;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Request counter is not initialized')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `requests/${newReqRef.id}`);
  }
}

export function subscribeMyRequests(
  uid: string,
  onData: (requests: SiteRequest[]) => void
): Unsubscribe {
  const path = 'requests';
  const q = query(collection(db, 'requests'), where('workerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => mapSiteRequest(d.data(), d.id))
        .sort((a, b) => b.requestNumberNum - a.requestNumberNum);
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllRequests(onData: (requests: SiteRequest[]) => void): Unsubscribe {
  const path = 'requests';
  const q = query(collection(db, 'requests'), orderBy('requestNumberNum', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapSiteRequest(d.data(), d.id)));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs
        .map((d) => mapUserProfile(d.data(), d.id))
        .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeSignInLogs(onData: (logs: SignInLog[]) => void): Unsubscribe {
  const path = 'signInLogs';
  const q = query(collection(db, 'signInLogs'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list: SignInLog[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: String(data.id ?? d.id),
          uid: String(data.uid ?? ''),
          email: String(data.email ?? ''),
          displayName: String(data.displayName ?? ''),
          role: data.role === 'admin' ? 'admin' : 'worker',
          timestampMs: toMillis(data.timestamp),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function updateRequestStatusAndPrices(
  requestId: string,
  status: RequestStatus,
  items: RequestItem[]
): Promise<void> {
  const path = `requests/${requestId}`;
  const cleanItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice:
      item.unitPrice == null || !Number.isFinite(item.unitPrice)
        ? null
        : Math.round(item.unitPrice * 100) / 100,
  }));

  try {
    await updateDoc(doc(db, 'requests', requestId), {
      status,
      items: cleanItems,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setWorkerRemoved(workerUid: string, removed: boolean): Promise<void> {
  const path = `users/${workerUid}`;
  try {
    await updateDoc(doc(db, 'users', workerUid), {
      removed,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveAdminSettings(params: {
  adminUid: string;
  accessCode: string;
  companyName: string;
  currencySymbol: string;
}): Promise<void> {
  const codeCheck = validateAccessCode(params.accessCode);
  if (!codeCheck.valid) {
    throw new Error(codeCheck.error || 'Invalid access code.');
  }
  const companyName = params.companyName.trim();
  if (!companyName || companyName.length > BLUEPRINT_LIMITS.companyNameMax) {
    throw new Error(`Company name must be 1 to ${BLUEPRINT_LIMITS.companyNameMax} characters.`);
  }
  const currencySymbol = params.currencySymbol.trim();
  if (!currencySymbol || currencySymbol.length > BLUEPRINT_LIMITS.currencySymbolMax) {
    throw new Error(`Currency symbol must be 1 to ${BLUEPRINT_LIMITS.currencySymbolMax} characters.`);
  }

  const batch = writeBatch(db);
  batch.set(doc(db, 'appConfig', 'security'), {
    accessCode: codeCheck.normalized,
    updatedAt: serverTimestamp(),
    updatedBy: params.adminUid,
  });
  batch.set(doc(db, 'appConfig', 'public'), {
    companyName,
    currencySymbol,
    initialized: true,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig');
  }
}
