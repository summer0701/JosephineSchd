import {
  AUDIO_ACTIONS,
  buildMaterialSpeechText,
  canStartAudioAction,
  getRecordingButtonLabel,
} from "./materialAudio";

describe("material audio helpers", () => {
  it("builds TTS text from a material title and description", () => {
    expect(
      buildMaterialSpeechText({
        title: " daily conversation 패턴 ",
        description: " 일상 회화에서 자주 쓰는 표현들 ",
      })
    ).toBe("daily conversation 패턴. 일상 회화에서 자주 쓰는 표현들");
  });

  it("omits empty TTS text parts", () => {
    expect(
      buildMaterialSpeechText({
        title: "발음 가이드",
        description: "",
      })
    ).toBe("발음 가이드");
  });

  it("returns the correct recording button label", () => {
    expect(getRecordingButtonLabel(false)).toBe("🎙️ 목소리 녹음");
    expect(getRecordingButtonLabel(true)).toBe("⏹️ 녹음 중지");
  });

  it("allows a new audio action only while idle", () => {
    expect(canStartAudioAction(AUDIO_ACTIONS.IDLE)).toBe(true);
    expect(canStartAudioAction(AUDIO_ACTIONS.RECORDING)).toBe(false);
    expect(canStartAudioAction(AUDIO_ACTIONS.TTS)).toBe(false);
    expect(canStartAudioAction(AUDIO_ACTIONS.PLAYBACK)).toBe(false);
  });
});
