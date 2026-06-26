export const isKakaoTalkBrowser = (userAgent = "") =>
  /KAKAOTALK/i.test(userAgent);

export const isAndroidBrowser = (userAgent = "") => /Android/i.test(userAgent);

export const getExternalBrowserUrl = (pageUrl, userAgent = "") => {
  if (!pageUrl) {
    return "";
  }

  if (!isAndroidBrowser(userAgent)) {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(pageUrl)}`;
  }

  const url = new URL(pageUrl);
  const path = `${url.host}${url.pathname}${url.search}`;

  return `intent://${path}#Intent;scheme=${url.protocol.replace(
    ":",
    ""
  )};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
    pageUrl
  )};end`;
};
