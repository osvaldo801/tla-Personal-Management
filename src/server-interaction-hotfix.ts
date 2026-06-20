let started = false;
let timer = 0;

export function initServerInteractionHotfix() {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      ensureDeleteButtons();
      protectDirectActions();
      translateServersCopy();
    }, 160);
  };

  run();
  window.setInterval(run, 800);
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".language-toggle")) {
      window.setTimeout(run, 80);
      window.setTimeout(run, 300);
    }
  });
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] });
}

function ensureDeleteButtons() {
  document.querySelectorAll<HTMLButtonElement>(".desktop-profile-table .row-actions .btn-danger").forEach((button) => {
    button.style.display = "inline-flex";
    button.style.pointerEvents = "auto";
    button.title = button.title || "Borrar servidor";
    if (!button.textContent?.trim()) {
      const label = document.createElement("span");
      label.textContent = "Borrar";
      button.append(label);
    }
  });
}

function protectDirectActions() {
  document.querySelectorAll<HTMLElement>(
    ".enhanced-profile-photo, .quick-contact, .quick-contact-actions a, .row-actions button, .row-actions select",
  ).forEach((element) => {
    element.style.pointerEvents = "auto";
    element.style.position = "relative";
    element.style.zIndex = "5";
  });
}

function translateServersCopy() {
  const activeLanguage = document.querySelector(".language-toggle button.active")?.textContent?.trim().toLowerCase();
  const isEnglish = activeLanguage === "en";

  document.querySelectorAll<HTMLElement>(".page-heading h1, .content h1").forEach((heading) => {
    const normalized = normalize(heading.textContent ?? "");
    if (normalized === "servidores" || normalized === "servers") {
      heading.textContent = isEnglish ? "SERVERS" : "SERVIDORES";
    }
  });

  const pairs = isEnglish
    ? new Map([
        ["Servidores", "Servers"],
        ["SERVIDORES", "SERVERS"],
        ["Nuevo servidor", "New server"],
        ["Lista operativa de servidores y colaboradores.", "Operational list of servers and collaborators."],
        ["Gestión", "Management"],
        ["GESTIÓN", "MANAGEMENT"],
      ])
    : new Map([
        ["Servers", "Servidores"],
        ["SERVERS", "SERVIDORES"],
        ["New server", "Nuevo servidor"],
        ["Operational list of servers and collaborators.", "Lista operativa de servidores y colaboradores."],
        ["Management", "Gestión"],
        ["MANAGEMENT", "GESTIÓN"],
      ]);

  document.querySelectorAll<HTMLElement>(".sidebar, .content").forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      const text = node.textContent ?? "";
      const trimmed = text.trim();
      const next = pairs.get(trimmed);
      if (next && next !== trimmed && !parent?.closest(".brand-name, .topbar-title, .user-pill, .participant-badge")) {
        node.textContent = text.replace(trimmed, next);
      }
      node = walker.nextNode();
    }
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
