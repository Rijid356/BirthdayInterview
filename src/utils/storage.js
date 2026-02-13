import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileSystem } from './native-modules';
import JSZip from 'jszip';

const CHILDREN_KEY = '@birthday_interview_children';
const INTERVIEWS_KEY = '@birthday_interview_sessions';
const BALLOON_RUNS_KEY = '@git-bigger_balloon_runs';
const BIRTHDAY_MEDIA_KEY = '@git-bigger_birthday_media';

// ─── Children ───

export async function getChildren() {
  const json = await AsyncStorage.getItem(CHILDREN_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveChild(child) {
  const children = await getChildren();
  const idx = children.findIndex((c) => c.id === child.id);
  if (idx >= 0) children[idx] = child;
  else children.push(child);
  await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  return children;
}

export async function deleteChild(childId) {
  // Delete profile photo if exists
  const allChildren = await getChildren();
  const targetChild = allChildren.find((c) => c.id === childId);
  if (targetChild?.photoUri && FileSystem) {
    try {
      const photoInfo = await FileSystem.getInfoAsync(targetChild.photoUri);
      if (photoInfo.exists) await FileSystem.deleteAsync(targetChild.photoUri);
    } catch (e) { console.warn('Could not delete profile photo:', e); }
  }
  const children = allChildren;
  await AsyncStorage.setItem(
    CHILDREN_KEY,
    JSON.stringify(children.filter((c) => c.id !== childId))
  );
  // Also remove their interviews
  const interviews = await getInterviews();
  await AsyncStorage.setItem(
    INTERVIEWS_KEY,
    JSON.stringify(interviews.filter((i) => i.childId !== childId))
  );
  // Also remove their balloon runs + video files
  const balloonRuns = await getBalloonRuns();
  const childRuns = balloonRuns.filter((r) => r.childId === childId);
  for (const run of childRuns) {
    if (run.videoUri && FileSystem) {
      try {
        const info = await FileSystem.getInfoAsync(run.videoUri);
        if (info.exists) await FileSystem.deleteAsync(run.videoUri);
      } catch (e) { console.warn('Could not delete balloon run video:', e); }
    }
  }
  await AsyncStorage.setItem(
    BALLOON_RUNS_KEY,
    JSON.stringify(balloonRuns.filter((r) => r.childId !== childId))
  );
  // Also remove their birthday media + files
  const allMedia = await getBirthdayMedia();
  const childMedia = allMedia.filter((m) => m.childId === childId);
  for (const item of childMedia) {
    if (item.uri && FileSystem) {
      try {
        const info = await FileSystem.getInfoAsync(item.uri);
        if (info.exists) await FileSystem.deleteAsync(item.uri);
      } catch (e) { console.warn('Could not delete birthday media file:', e); }
    }
  }
  await AsyncStorage.setItem(
    BIRTHDAY_MEDIA_KEY,
    JSON.stringify(allMedia.filter((m) => m.childId !== childId))
  );
}

// ─── Interviews ───

export async function getInterviews() {
  const json = await AsyncStorage.getItem(INTERVIEWS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function getInterviewsForChild(childId) {
  const all = await getInterviews();
  return all.filter((i) => i.childId === childId).sort((a, b) => b.year - a.year);
}

export async function saveInterview(interview) {
  const interviews = await getInterviews();
  const idx = interviews.findIndex((i) => i.id === interview.id);
  if (idx >= 0) interviews[idx] = interview;
  else interviews.push(interview);
  await AsyncStorage.setItem(INTERVIEWS_KEY, JSON.stringify(interviews));
  return interviews;
}

export async function deleteInterview(interviewId) {
  const interviews = await getInterviews();
  const target = interviews.find((i) => i.id === interviewId);
  if (target?.videoUri && FileSystem) {
    try {
      const info = await FileSystem.getInfoAsync(target.videoUri);
      if (info.exists) await FileSystem.deleteAsync(target.videoUri);
    } catch (e) { console.warn('Could not delete video:', e); }
  }
  await AsyncStorage.setItem(
    INTERVIEWS_KEY,
    JSON.stringify(interviews.filter((i) => i.id !== interviewId))
  );
}

// ─── Balloon Runs ───

export async function getBalloonRuns() {
  const json = await AsyncStorage.getItem(BALLOON_RUNS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function getBalloonRunsForChild(childId) {
  const all = await getBalloonRuns();
  return all.filter((r) => r.childId === childId).sort((a, b) => b.year - a.year);
}

export async function saveBalloonRun(run) {
  const runs = await getBalloonRuns();
  const idx = runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) runs[idx] = run;
  else runs.push(run);
  await AsyncStorage.setItem(BALLOON_RUNS_KEY, JSON.stringify(runs));
  return runs;
}

export async function updateBalloonRun(runId, updates) {
  const runs = await getBalloonRuns();
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx >= 0) {
    runs[idx] = { ...runs[idx], ...updates };
    await AsyncStorage.setItem(BALLOON_RUNS_KEY, JSON.stringify(runs));
  }
  return runs;
}

export async function deleteBalloonRun(runId) {
  const runs = await getBalloonRuns();
  const target = runs.find((r) => r.id === runId);
  if (target?.videoUri && FileSystem) {
    try {
      const info = await FileSystem.getInfoAsync(target.videoUri);
      if (info.exists) await FileSystem.deleteAsync(target.videoUri);
    } catch (e) { console.warn('Could not delete balloon run video:', e); }
  }
  await AsyncStorage.setItem(
    BALLOON_RUNS_KEY,
    JSON.stringify(runs.filter((r) => r.id !== runId))
  );
}

// ─── Birthday Media ───

export async function getBirthdayMedia() {
  const json = await AsyncStorage.getItem(BIRTHDAY_MEDIA_KEY);
  return json ? JSON.parse(json) : [];
}

export async function getBirthdayMediaForChild(childId) {
  const all = await getBirthdayMedia();
  return all.filter((m) => m.childId === childId).sort((a, b) => b.year - a.year);
}

export async function saveBirthdayMediaItems(items) {
  const existing = await getBirthdayMedia();
  const updated = [...existing, ...items];
  await AsyncStorage.setItem(BIRTHDAY_MEDIA_KEY, JSON.stringify(updated));
  return updated;
}

export async function deleteBirthdayMediaItem(mediaId) {
  const items = await getBirthdayMedia();
  const target = items.find((m) => m.id === mediaId);
  if (target?.uri && FileSystem) {
    try {
      const info = await FileSystem.getInfoAsync(target.uri);
      if (info.exists) await FileSystem.deleteAsync(target.uri);
    } catch (e) { console.warn('Could not delete birthday media file:', e); }
  }
  await AsyncStorage.setItem(
    BIRTHDAY_MEDIA_KEY,
    JSON.stringify(items.filter((m) => m.id !== mediaId))
  );
}

// ─── Video Storage ───

export const VIDEO_DIR = FileSystem
  ? `${FileSystem.documentDirectory}interview-videos/`
  : '';
export const BALLOON_VIDEO_DIR = FileSystem
  ? `${FileSystem.documentDirectory}balloon-run-videos/`
  : '';

export async function moveVideoToStorage(tempUri, filename) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  const dest = `${VIDEO_DIR}${filename}`;
  await FileSystem.moveAsync({ from: tempUri, to: dest });
  return dest;
}

export async function moveVideoToBalloonStorage(tempUri, filename) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(BALLOON_VIDEO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(BALLOON_VIDEO_DIR, { intermediates: true });
  const dest = `${BALLOON_VIDEO_DIR}${filename}`;
  await FileSystem.moveAsync({ from: tempUri, to: dest });
  return dest;
}

export const BIRTHDAY_MEDIA_DIR = FileSystem
  ? `${FileSystem.documentDirectory}birthday-media/`
  : '';

export async function moveToBirthdayMediaStorage(tempUri, filename) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(BIRTHDAY_MEDIA_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(BIRTHDAY_MEDIA_DIR, { intermediates: true });
  const dest = `${BIRTHDAY_MEDIA_DIR}${filename}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

// ─── Friendly Video Filenames ───

export function getOrdinalSuffix(n) {
  const num = Math.abs(Math.floor(n));
  if (num % 100 >= 11 && num % 100 <= 13) return `${num}th`;
  switch (num % 10) {
    case 1: return `${num}st`;
    case 2: return `${num}nd`;
    case 3: return `${num}rd`;
    default: return `${num}th`;
  }
}

export function getFriendlyVideoFilename(childName, age) {
  const sanitized = childName.replace(/[<>:"/\\|?*]/g, '');
  const ordinal = getOrdinalSuffix(age);
  return `${sanitized}'s ${ordinal} Birthday Interview.mp4`;
}

const SHARE_TEMP_DIR = FileSystem
  ? `${FileSystem.cacheDirectory}share-temp/`
  : '';

export async function copyVideoWithFriendlyName(sourceUri, childName, age) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(SHARE_TEMP_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(SHARE_TEMP_DIR, { intermediates: true });
  const filename = getFriendlyVideoFilename(childName, age);
  const dest = `${SHARE_TEMP_DIR}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function cleanupTempShareFiles() {
  if (!FileSystem) return;
  try {
    const info = await FileSystem.getInfoAsync(SHARE_TEMP_DIR);
    if (info.exists) await FileSystem.deleteAsync(SHARE_TEMP_DIR, { idempotent: true });
  } catch (e) {
    // Silent cleanup — not critical
  }
}

// ─── Profile Photos ───

export const PROFILE_PHOTO_DIR = FileSystem
  ? `${FileSystem.documentDirectory}profile-photos/`
  : '';

export async function saveProfilePhoto(childId, pickedUri) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(PROFILE_PHOTO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PROFILE_PHOTO_DIR, { intermediates: true });
  const dest = `${PROFILE_PHOTO_DIR}profile_${childId}.jpg`;
  await FileSystem.copyAsync({ from: pickedUri, to: dest });
  // Update child record with photoUri
  const children = await getChildren();
  const idx = children.findIndex((c) => c.id === childId);
  if (idx >= 0) {
    children[idx] = { ...children[idx], photoUri: dest };
    await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  }
  return dest;
}

export async function deleteProfilePhoto(childId) {
  if (!FileSystem) return;
  const dest = `${PROFILE_PHOTO_DIR}profile_${childId}.jpg`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) await FileSystem.deleteAsync(dest);
  } catch (e) { console.warn('Could not delete profile photo:', e); }
  // Remove photoUri from child record
  const children = await getChildren();
  const idx = children.findIndex((c) => c.id === childId);
  if (idx >= 0) {
    const { photoUri, ...rest } = children[idx];
    children[idx] = rest;
    await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  }
}

// ─── Backup ───

export async function exportAllData() {
  return {
    exportDate: new Date().toISOString(),
    children: await getChildren(),
    interviews: await getInterviews(),
    balloonRuns: await getBalloonRuns(),
    birthdayMedia: await getBirthdayMedia(),
  };
}

export async function importData(data) {
  if (data.children) await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(data.children));
  if (data.interviews) await AsyncStorage.setItem(INTERVIEWS_KEY, JSON.stringify(data.interviews));
  if (data.balloonRuns) await AsyncStorage.setItem(BALLOON_RUNS_KEY, JSON.stringify(data.balloonRuns));
  if (data.birthdayMedia) await AsyncStorage.setItem(BIRTHDAY_MEDIA_KEY, JSON.stringify(data.birthdayMedia));
}

// ─── Full Backup (with media) ───

export async function getMediaManifest() {
  if (!FileSystem) return [];
  const manifest = [];

  const interviews = await getInterviews();
  for (const interview of interviews) {
    if (interview.videoUri) {
      try {
        const info = await FileSystem.getInfoAsync(interview.videoUri);
        if (info.exists) {
          const filename = interview.videoUri.split('/').pop();
          manifest.push({ type: 'interview', relativePath: `media/${filename}`, absoluteUri: interview.videoUri });
        }
      } catch (e) { console.warn('Manifest scan skip:', e); }
    }
  }

  const balloonRuns = await getBalloonRuns();
  for (const run of balloonRuns) {
    if (run.videoUri) {
      try {
        const info = await FileSystem.getInfoAsync(run.videoUri);
        if (info.exists) {
          const filename = run.videoUri.split('/').pop();
          manifest.push({ type: 'balloon', relativePath: `media/${filename}`, absoluteUri: run.videoUri });
        }
      } catch (e) { console.warn('Manifest scan skip:', e); }
    }
  }

  const children = await getChildren();
  for (const child of children) {
    if (child.photoUri) {
      try {
        const info = await FileSystem.getInfoAsync(child.photoUri);
        if (info.exists) {
          const filename = child.photoUri.split('/').pop();
          manifest.push({ type: 'profile', relativePath: `media/${filename}`, absoluteUri: child.photoUri });
        }
      } catch (e) { console.warn('Manifest scan skip:', e); }
    }
  }

  const birthdayMedia = await getBirthdayMedia();
  for (const item of birthdayMedia) {
    if (item.uri) {
      try {
        const info = await FileSystem.getInfoAsync(item.uri);
        if (info.exists) {
          const filename = item.uri.split('/').pop();
          manifest.push({ type: 'birthday-media', relativePath: `media/${filename}`, absoluteUri: item.uri });
        }
      } catch (e) { console.warn('Manifest scan skip:', e); }
    }
  }

  return manifest;
}

export async function exportFullBackup(onProgress) {
  if (!FileSystem) throw new Error('File system not available on this platform');

  const metadata = await exportAllData();
  const manifest = await getMediaManifest();

  const zip = new JSZip();
  zip.file('metadata.json', JSON.stringify({ ...metadata, manifest }, null, 2));

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const filename = entry.relativePath.split('/').pop();
    if (onProgress) onProgress(i + 1, manifest.length, filename);
    try {
      const base64 = await FileSystem.readAsStringAsync(entry.absoluteUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file(entry.relativePath, base64, { base64: true });
    } catch (e) {
      console.warn(`Could not read ${filename}, skipping:`, e);
    }
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64' });
  const zipUri = FileSystem.documentDirectory + 'berfdayy-full-backup.zip';
  await FileSystem.writeAsStringAsync(zipUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return zipUri;
}

export async function importFullBackup(zipUri, onProgress) {
  if (!FileSystem) throw new Error('File system not available on this platform');

  const zipBase64 = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) throw new Error('Invalid backup: missing metadata.json');
  const metadataStr = await metadataFile.async('string');
  const metadata = JSON.parse(metadataStr);

  const { manifest = [], ...data } = metadata;

  // Ensure directories exist
  const dirs = [VIDEO_DIR, BALLOON_VIDEO_DIR, `${FileSystem.documentDirectory}profile-photos/`, BIRTHDAY_MEDIA_DIR];
  for (const dir of dirs) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  // Map old paths to new local paths
  const pathMap = {};

  for (let i = 0; i < manifest.length; i++) {
    const entry = manifest[i];
    const filename = entry.relativePath.split('/').pop();
    if (onProgress) onProgress(i + 1, manifest.length, filename);

    const zipFile = zip.file(entry.relativePath);
    if (!zipFile) continue;

    try {
      const base64 = await zipFile.async('base64');
      let destDir;
      if (entry.type === 'interview') destDir = VIDEO_DIR;
      else if (entry.type === 'balloon') destDir = BALLOON_VIDEO_DIR;
      else if (entry.type === 'profile') destDir = `${FileSystem.documentDirectory}profile-photos/`;
      else if (entry.type === 'birthday-media') destDir = BIRTHDAY_MEDIA_DIR;
      else continue;

      const destPath = destDir + filename;
      await FileSystem.writeAsStringAsync(destPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      pathMap[entry.absoluteUri] = destPath;
    } catch (e) {
      console.warn(`Could not restore ${filename}:`, e);
    }
  }

  // Remap URIs in metadata
  if (data.interviews) {
    for (const interview of data.interviews) {
      if (interview.videoUri && pathMap[interview.videoUri]) {
        interview.videoUri = pathMap[interview.videoUri];
      }
    }
  }
  if (data.balloonRuns) {
    for (const run of data.balloonRuns) {
      if (run.videoUri && pathMap[run.videoUri]) {
        run.videoUri = pathMap[run.videoUri];
      }
    }
  }
  if (data.children) {
    for (const child of data.children) {
      if (child.photoUri && pathMap[child.photoUri]) {
        child.photoUri = pathMap[child.photoUri];
      }
    }
  }
  if (data.birthdayMedia) {
    for (const item of data.birthdayMedia) {
      if (item.uri && pathMap[item.uri]) {
        item.uri = pathMap[item.uri];
      }
    }
  }

  await importData(data);

  return {
    children: data.children?.length || 0,
    interviews: data.interviews?.length || 0,
    balloonRuns: data.balloonRuns?.length || 0,
    birthdayMedia: data.birthdayMedia?.length || 0,
    mediaFiles: Object.keys(pathMap).length,
  };
}

export async function getBackupSizeEstimate() {
  if (!FileSystem) return 0;
  let totalSize = 0;

  const directories = [VIDEO_DIR, BALLOON_VIDEO_DIR, `${FileSystem.documentDirectory}profile-photos/`, BIRTHDAY_MEDIA_DIR];
  for (const dir of directories) {
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) continue;
      const files = await FileSystem.readDirectoryAsync(dir);
      for (const file of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(dir + file);
          if (fileInfo.exists && fileInfo.size) totalSize += fileInfo.size;
        } catch (e) { /* skip */ }
      }
    } catch (e) { /* skip */ }
  }

  return totalSize;
}
