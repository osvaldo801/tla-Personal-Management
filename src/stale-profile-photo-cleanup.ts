let cleanupObserverStarted = false;
let cleanupTimer = 0;

export function initStaleProfilePhotoCleanup() {
  if (cleanupObserverStarted || typeof window === "undefined") return;
  cleanupObserverStarted = true;

  const run = () => {
    window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(cleanupStaleDetailPhoto, 80);
  };

  cleanupStaleDetailPhoto();
  window.addEventListener("popstate", run);
  window.addEventListener("hashchange", run);
  document.addEventListener("click", run, true);

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

function cleanupStaleDetailPhoto() {
  const detailHeading = document.querySelector<HTMLElement>(".profile-detail-heading");
  const detailPanel = document.querySelector<HTMLElement>(".profile-info-panel");

  document.querySelectorAll<HTMLElement>(".enhanced-detail-title").forEach((wrap) => {
    const isCurrentDetailHeader = Boolean(detailHeading && detailPanel && detailHeading.contains(wrap));
    if (isCurrentDetailHeader) return;

    const parent = wrap.parentElement;
    const originalHeaderContent = Array.from(wrap.children).find(
      (child) => child instanceof HTMLElement && !child.classList.contains("enhanced-profile-photo"),
    );

    if (parent && originalHeaderContent) parent.insertBefore(originalHeaderContent, wrap);
    wrap.remove();
  });

  document.querySelectorAll<HTMLElement>(".profile-detail-heading[data-photo-enhanced='true']").forEach((heading) => {
    if (!heading.querySelector(".enhanced-detail-title")) delete heading.dataset.photoEnhanced;
  });
}
