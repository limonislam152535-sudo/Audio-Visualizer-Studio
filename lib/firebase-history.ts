import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { VISUALIZER_TEMPLATES } from './constants';
import { db, handleFirestoreError, OperationType } from './firebase';
import { clampVisualizerOffset } from './studio-math';
import {
  AspectRatioId,
  BackgroundType,
  ExportFps,
  ExportQuality,
  ExportResolutionId,
  UserHistoryEntry,
  VisualizerConfig,
} from './types';

function resolveProvider(user: User): 'password' | 'google.com' | 'other' {
  const providerId = user.providerData?.[0]?.providerId;
  if (providerId === 'google.com') return 'google.com';
  if (providerId === 'password') return 'password';
  return 'other';
}

function sanitizeString(value: string | null | undefined, maxLen: number, fallback: string): string {
  const trimmed = (value ?? '').trim();
  const safe = trimmed.length > 0 ? trimmed : fallback;
  return safe.slice(0, maxLen);
}

const ensuredProfileUids = new Set<string>();

export async function upsertUserProfile(user: User): Promise<void> {
  const profilePath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const email = (user.email ?? '').trim().slice(0, 256);
  const displayName = sanitizeString(
    user.displayName || email.split('@')[0],
    120,
    'Studio Creator'
  );
  const provider = resolveProvider(user);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        provider,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        email,
        displayName,
        provider,
        updatedAt: serverTimestamp(),
      });
    }
    ensuredProfileUids.add(user.uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }
}

export interface SaveExportHistoryInput {
  audioFileName: string;
  audioDurationSec: number;
  audioSampleRate: number;
  aspectRatio: AspectRatioId;
  resolution: ExportResolutionId;
  fps: ExportFps;
  quality: ExportQuality;
  outputWidth: number;
  outputHeight: number;
  outputSizeBytes: number;
  codecLabel: string;
  visualizer: VisualizerConfig;
  backgroundType: BackgroundType;
}

export async function saveExportHistoryEntry(
  user: User,
  input: SaveExportHistoryInput
): Promise<void> {
  if (!ensuredProfileUids.has(user.uid)) {
    await upsertUserProfile(user);
  }

  const historyPath = `users/${user.uid}/history`;
  const templateMeta = VISUALIZER_TEMPLATES.find(
    (t) => t.id === input.visualizer.templateId
  );

  const payload = {
    uid: user.uid,
    audioFileName: sanitizeString(input.audioFileName, 200, 'audio-track'),
    audioDurationSec: Math.max(0, Math.min(86400, Number(input.audioDurationSec) || 0)),
    audioSampleRate: Math.max(8000, Math.min(384000, Math.round(input.audioSampleRate) || 48000)),
    templateId: sanitizeString(input.visualizer.templateId, 64, 'liquid-wave-ring'),
    templateName: sanitizeString(templateMeta?.name, 80, 'Visualizer'),
    aspectRatio: input.aspectRatio,
    resolution: input.resolution,
    fps: input.fps,
    quality: input.quality,
    outputWidth: Math.max(100, Math.min(8192, Math.round(input.outputWidth) || 1920)),
    outputHeight: Math.max(100, Math.min(8192, Math.round(input.outputHeight) || 1080)),
    outputSizeBytes: Math.max(0, Math.min(10737418240, Math.round(input.outputSizeBytes) || 0)),
    codecLabel: sanitizeString(input.codecLabel, 80, 'H.264 / MP4'),
    offsetX: clampVisualizerOffset(input.visualizer.offsetX ?? 0),
    offsetY: clampVisualizerOffset(input.visualizer.offsetY ?? 0),
    primaryColor: sanitizeString(input.visualizer.primaryColor, 20, '#38BDF8'),
    secondaryColor: sanitizeString(input.visualizer.secondaryColor, 20, '#818CF8'),
    accentColor: sanitizeString(input.visualizer.accentColor, 20, '#E0F2FE'),
    backgroundType: input.backgroundType,
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, 'users', user.uid, 'history'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, historyPath);
  }
}

export function subscribeToUserHistory(
  uid: string,
  onItems: (items: UserHistoryEntry[]) => void,
  onError: (err: Error) => void
): () => void {
  const historyPath = `users/${uid}/history`;
  const q = query(
    collection(db, 'users', uid, 'history'),
    where('uid', '==', uid),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const parsed: UserHistoryEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        const createdAtVal = data.createdAt;
        let createdAtMs = Date.now();
        if (createdAtVal instanceof Timestamp) {
          createdAtMs = createdAtVal.toMillis();
        } else if (
          createdAtVal &&
          typeof createdAtVal === 'object' &&
          'toMillis' in createdAtVal &&
          typeof (createdAtVal as { toMillis: () => number }).toMillis === 'function'
        ) {
          createdAtMs = (createdAtVal as { toMillis: () => number }).toMillis();
        }
        return {
          id: d.id,
          uid: String(data.uid ?? uid),
          audioFileName: String(data.audioFileName ?? 'Audio track'),
          audioDurationSec: Number(data.audioDurationSec ?? 0),
          audioSampleRate: Number(data.audioSampleRate ?? 48000),
          templateId: data.templateId,
          templateName: String(data.templateName ?? 'Visualizer'),
          aspectRatio: data.aspectRatio,
          resolution: data.resolution,
          fps: Number(data.fps ?? 30) as ExportFps,
          quality: data.quality,
          outputWidth: Number(data.outputWidth ?? 1920),
          outputHeight: Number(data.outputHeight ?? 1080),
          outputSizeBytes: Number(data.outputSizeBytes ?? 0),
          codecLabel: String(data.codecLabel ?? 'H.264 / MP4'),
          offsetX: Number(data.offsetX ?? 0),
          offsetY: Number(data.offsetY ?? 0),
          primaryColor: String(data.primaryColor ?? '#38BDF8'),
          secondaryColor: String(data.secondaryColor ?? '#818CF8'),
          accentColor: String(data.accentColor ?? '#E0F2FE'),
          backgroundType: data.backgroundType ?? 'black',
          createdAtMs,
        };
      });
      parsed.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onItems(parsed);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, historyPath);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function deleteExportHistoryEntry(
  uid: string,
  historyId: string
): Promise<void> {
  const path = `users/${uid}/history/${historyId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'history', historyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
