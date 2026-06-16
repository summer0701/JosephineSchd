import React, { useEffect, useState } from "react";
import {
  getExternalBrowserUrl,
  isKakaoTalkBrowser,
} from "../utils/kakaoBrowser";

function KakaoBrowserPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShowPrompt(isKakaoTalkBrowser(window.navigator.userAgent));
  }, []);

  if (!showPrompt) {
    return null;
  }

  const openExternalBrowser = async () => {
    const pageUrl = window.location.href;
    const externalUrl = getExternalBrowserUrl(pageUrl, window.navigator.userAgent);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(pageUrl);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }

    window.location.href = externalUrl;
  };

  return (
    <div className="kakao-browser-prompt" role="status">
      <div>
        <strong>카카오톡에서 열렸어요</strong>
        <p>
          버튼을 누르면 현재 페이지 링크를 복사하고, 다른 브라우저에서 열 수 있어요.
        </p>
      </div>
      <button type="button" onClick={openExternalBrowser}>
        다른 브라우저에서 열기
      </button>
      {copied && <span>링크가 복사됐어요.</span>}
    </div>
  );
}

export default KakaoBrowserPrompt;
