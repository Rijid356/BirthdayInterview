import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileSystem } from './native-modules';

const CHILDREN_KEY = '@birthday_interview_children';
const INTERVIEWS_KEY = '@birthday_interview_sessions';

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
  const children = await getChildren();
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

// ─── Video Storage ───

export const VIDEO_DIR = FileSystem
  ? `${FileSystem.documentDirectory}interview-videos/`
  : '';

export async function moveVideoToStorage(tempUri, filename) {
  if (!FileSystem) throw new Error('File system not available on this platform');
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  const dest = `${VIDEO_DIR}${filename}`;
  await FileSystem.moveAsync({ from: tempUri, to: dest });
  return dest;
}

// ─── Backup ───

export async function exportAllData() {
  return {
    exportDate: new Date().toISOString(),
    children: await getChildren(),
    interviews: await getInterviews(),
  };
}

export async function importData(data) {
  if (data.children) await AsyncStorage.setItem(CHILDREN_KEY, JSON.stringify(data.children));
  if (data.interviews) await AsyncStorage.setItem(INTERVIEWS_KEY, JSON.stringify(data.interviews));
}
