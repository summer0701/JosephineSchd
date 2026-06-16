import {
  getExternalBrowserUrl,
  isAndroidBrowser,
  isKakaoTalkBrowser,
} from "./kakaoBrowser";

describe("kakaoBrowser", () => {
  test("detects KakaoTalk in-app browser", () => {
    expect(isKakaoTalkBrowser("Mozilla/5.0 KAKAOTALK 10.0")).toBe(true);
    expect(isKakaoTalkBrowser("Mozilla/5.0 Chrome/120")).toBe(false);
  });

  test("detects Android browsers", () => {
    expect(isAndroidBrowser("Mozilla/5.0 Android 14 KAKAOTALK")).toBe(true);
    expect(isAndroidBrowser("Mozilla/5.0 iPhone KAKAOTALK")).toBe(false);
  });

  test("builds a Chrome intent URL on Android", () => {
    expect(
      getExternalBrowserUrl(
        "https://summer0701.github.io/JosephineSchd/home?tab=1#today",
        "Mozilla/5.0 Android 14 KAKAOTALK"
      )
    ).toBe(
      "intent://summer0701.github.io/JosephineSchd/home?tab=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fsummer0701.github.io%2FJosephineSchd%2Fhome%3Ftab%3D1%23today;end"
    );
  });

  test("builds a KakaoTalk external browser URL for non-Android browsers", () => {
    expect(
      getExternalBrowserUrl(
        "https://summer0701.github.io/JosephineSchd/home",
        "Mozilla/5.0 iPhone KAKAOTALK"
      )
    ).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Fsummer0701.github.io%2FJosephineSchd%2Fhome"
    );
  });
});
