import { updateInterview } from './storage';
import { FileSystem } from './native-modules';

const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function transcribeVideo(videoUri, apiKey) {
  const fileInfo = await FileSystem.getInfoAsync(videoUri);
  if (!fileInfo.exists) {
    throw new Error('Video file not found');
  }
  if (fileInfo.size > MAX_FILE_SIZE) {
    throw new Error('Video file exceeds 25MB limit. Try recording a shorter interview.');
  }

  const response = await FileSystem.uploadAsync(WHISPER_API_URL, videoUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: 'segment',
    },
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (response.status !== 200) {
    const errorBody = JSON.parse(response.body || '{}');
    throw new Error(errorBody.error?.message || `Whisper API error (${response.status})`);
  }

  return JSON.parse(response.body);
}

export function mapSegmentsToQuestions(segments, questionTimestamps) {
  if (!segments?.length || !questionTimestamps?.length) return {};

  // Build time windows: each question runs from its timestamp to the next one
  // Handle revisited questions by using last occurrence per questionId
  const questionWindows = [];
  for (let i = 0; i < questionTimestamps.length; i++) {
    const startMs = questionTimestamps[i].timestampMs;
    const endMs = i < questionTimestamps.length - 1
      ? questionTimestamps[i + 1].timestampMs
      : Infinity;
    questionWindows.push({
      questionId: questionTimestamps[i].questionId,
      startSec: startMs / 1000,
      endSec: endMs / 1000,
    });
  }

  // Collect text per window
  const windowTexts = questionWindows.map(() => []);
  for (const segment of segments) {
    const segMid = (segment.start + segment.end) / 2;
    for (let i = questionWindows.length - 1; i >= 0; i--) {
      if (segMid >= questionWindows[i].startSec && segMid < questionWindows[i].endSec) {
        windowTexts[i].push(segment.text.trim());
        break;
      }
    }
  }

  // Merge into answers keyed by questionId, using last occurrence for revisited questions
  const answers = {};
  for (let i = 0; i < questionWindows.length; i++) {
    const qId = questionWindows[i].questionId;
    const text = windowTexts[i].join(' ').trim();
    if (text) {
      answers[qId] = { text, source: 'auto', editedAt: null };
    }
  }

  return answers;
}

export async function runTranscriptionPipeline(interviewId, videoUri, questionTimestamps, apiKey) {
  try {
    await updateInterview(interviewId, {
      transcription: { status: 'processing', rawSegments: null, error: null, completedAt: null },
    });

    const result = await transcribeVideo(videoUri, apiKey);
    const segments = result.segments || [];
    const answers = mapSegmentsToQuestions(segments, questionTimestamps);

    await updateInterview(interviewId, {
      transcription: {
        status: 'completed',
        rawSegments: segments,
        error: null,
        completedAt: new Date().toISOString(),
      },
      answers,
    });

    return { answers, segments };
  } catch (error) {
    await updateInterview(interviewId, {
      transcription: {
        status: 'failed',
        rawSegments: null,
        error: error.message,
        completedAt: null,
      },
    });
    throw error;
  }
}
