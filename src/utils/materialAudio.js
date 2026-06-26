export const AUDIO_ACTIONS = {
  IDLE: "idle",
  RECORDING: "recording",
  TTS: "tts",
  PLAYBACK: "playback",
};

export function buildMaterialSpeechText(material) {
  return [material.title, material.description]
    .filter(Boolean)
    .map((text) => String(text).trim())
    .filter(Boolean)
    .join(". ");
}

export function getRecordingButtonLabel(isRecording) {
  return isRecording ? "⏹️ 녹음 중지" : "🎙️ 목소리 녹음";
}

export function canStartAudioAction(activeAction) {
  return activeAction === AUDIO_ACTIONS.IDLE;
}
