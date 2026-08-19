import { S3Client } from '@aws-sdk/client-s3';

const required = [
  'R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_ENDPOINT','R2_BUCKET',
  'R2_PUBLIC_URL','FIREBASE_API_KEY','FIREBASE_PROJECT_ID','FIREBASE_MAIN_ADMIN'
];

export function assertEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Variaveis ausentes: ${missing.join(', ')}`);
}

export function getS3() {
  assertEnv();
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
  });
}

export async function lookupFirebaseUser(idToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const data = await response.json();
  if (!response.ok || !data.users?.[0]) {
    const error = new Error('Token Firebase invalido.');
    error.status = 401;
    throw error;
  }
  return data.users[0];
}

async function loadProfile(uid, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!response.ok) return null;
  const doc = await response.json();
  const fields = doc.fields || {};
  return {
    active: fields.active?.booleanValue === true,
    role: fields.role?.stringValue || ''
  };
}

export async function getCaller(req) {
  assertEnv();
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) {
    const error = new Error('Autenticacao obrigatoria.');
    error.status = 401;
    throw error;
  }
  const idToken = auth.slice(7);
  const user = await lookupFirebaseUser(idToken);
  const email = String(user.email || '').toLowerCase();
  const mainAdmin = String(process.env.FIREBASE_MAIN_ADMIN || '').toLowerCase();
  if (email === mainAdmin) return { user, idToken, role: 'admin', isMainAdmin: true };
  const profile = await loadProfile(user.localId, idToken);
  return { user, idToken, role: profile?.active ? profile.role : null, isMainAdmin: false };
}

export async function requireEditor(req) {
  const caller = await getCaller(req);
  if (!caller.isMainAdmin && caller.role !== 'editor') {
    const error = new Error('Usuario sem permissao de edicao.');
    error.status = 403;
    throw error;
  }
  return caller;
}

export async function requireMainAdmin(req) {
  const caller = await getCaller(req);
  if (!caller.isMainAdmin) {
    const error = new Error('Somente o administrador principal pode executar esta acao.');
    error.status = 403;
    throw error;
  }
  return caller;
}

export function sendError(res, error) {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || 'Erro interno.' });
}

export function safeSlug(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 100);
}

export function extension(name = '') {
  const index = name.lastIndexOf('.');
  return index < 0 ? '' : name.slice(index).toLowerCase().replace(/[^.a-z0-9]/g, '');
}
