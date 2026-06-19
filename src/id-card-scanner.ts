import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type ParsedId = {
  address?: string;
  birthDate?: string;
  fullName?: string;
  gender?: "Hombre" | "Mujer" | "";
};

type ScannerControls = {
  stop: () => void;
};

const aamvaCodes = [
  "DCA", "DCB", "DCD", "DBA", "DCS", "DAC", "DAD", "DBD", "DBB", "DBC", "DAY", "DAU", "DAG", "DAI", "DAJ", "DAK",
  "DAQ", "DCF", "DCG", "DCH", "DAH", "DAZ", "DCI", "DCJ", "DCK", "DDB", "DDC", "DDD", "DAW", "DAX", "DDH", "DDI",
  "DDJ", "DDA", "DDE", "DDF", "DDG", "ZVA",
];

let observerStarted = false;
let enhanceTimer = 0;

export function initIdCardScanner() {
  if (observerStarted || typeof window === "undefined") return;
  observerStarted = true;

  const run = () => {
    window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(addScannerButtons, 100);
  };

  run();
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

function addScannerButtons() {
  document.querySelectorAll<HTMLFormElement>(".profile-editor").forEach((form) => {
    if (form.dataset.idScannerReady === "true") return;
    form.dataset.idScannerReady = "true";

    const title = form.querySelector("h2");
    const wrap = document.createElement("div");
    wrap.className = "id-scan-actions";

    const barcodeButton = document.createElement("button");
    barcodeButton.className = "btn btn-secondary id-scan-button";
    barcodeButton.type = "button";
    barcodeButton.innerHTML = `${scanIcon()} Escanear codigo`;
    barcodeButton.addEventListener("click", () => openBarcodeScanner(form));

    wrap.append(barcodeButton);
    title?.after(wrap);
  });
}

function openBarcodeScanner(form: HTMLFormElement) {
  openCameraDialog({
    title: "Escanear codigo del ID",
    help: "Usa el codigo de barras de atras del ID. No se encendera la linterna para evitar reflejos. Limpia el lente, busca buena luz y manten el codigo dentro del cuadro.",
    frameClass: "id-scanner-frame-barcode",
    onReady: async ({ video, setStatus, close }) => {
      let controls: ScannerControls | null = null;
      let found = false;
      const scanStartedAt = Date.now();
      setStatus("Apunta al codigo de atras del ID. Manten el telefono estable.", "normal");

      const stop = () => {
        controls?.stop();
        stopVideo(video);
      };

      try {
        const hints = new Map<DecodeHintType, BarcodeFormat[]>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 400 });
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video,
          (result) => {
            if (!result || found) return;
            const parsed = parseAamva(result.getText());
            if (!hasUsefulData(parsed)) {
              setStatus("El codigo se detecto, pero no se pudo leer con claridad. Limpia el lente, mejora la luz y vuelve a intentarlo.", "warning");
              return;
            }
            found = true;
            fillFormFromId(form, parsed);
            setStatus("Datos leidos correctamente. Revisa la informacion antes de guardar.", "success");
            window.setTimeout(() => {
              stop();
              close();
            }, 850);
          },
        );
        window.setTimeout(() => {
          if (!found && Date.now() - scanStartedAt >= 6500) {
            setStatus("No se lee claro todavia. Limpia el lente, busca mas luz sin reflejos y acerca el codigo al cuadro.", "warning");
          }
        }, 7000);
      } catch (error) {
        setStatus("No pude abrir la camara o leer el codigo. Da permiso a la camara, limpia el lente, mejora la luz y vuelve a intentarlo.", "warning");
      }

      return stop;
    },
  });
}

type CameraDialogOptions = {
  frameClass: string;
  help: string;
  onReady?: (context: { close: () => void; setStatus: StatusSetter; video: HTMLVideoElement }) => Promise<(() => void) | void>;
  title: string;
};

type StatusSetter = (message: string, tone?: "normal" | "warning" | "success") => void;

function openCameraDialog(options: CameraDialogOptions) {
  document.querySelector(".id-scanner-dialog")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "id-scanner-dialog";
  overlay.innerHTML = `
    <div class="id-scanner-card" role="dialog" aria-modal="true">
      <button class="id-scanner-close" type="button" aria-label="Cerrar">x</button>
      <h2>${escapeHtml(options.title)}</h2>
      <p class="id-scanner-help">${escapeHtml(options.help)}</p>
      <div class="id-scanner-video-wrap">
        <video class="id-scanner-video" muted playsinline></video>
        <div class="id-scanner-frame ${options.frameClass}"></div>
      </div>
      <p class="id-scanner-status">Abriendo camara...</p>
      <div class="id-scanner-actions">
        <button class="btn btn-secondary" type="button" data-id-rescan>Reintentar</button>
        <button class="btn btn-primary" type="button" data-id-close>Cerrar</button>
      </div>
    </div>`;
  document.body.append(overlay);

  const video = overlay.querySelector<HTMLVideoElement>(".id-scanner-video");
  const status = overlay.querySelector<HTMLElement>(".id-scanner-status");
  const closeButtons = overlay.querySelectorAll<HTMLButtonElement>(".id-scanner-close, [data-id-close]");
  const rescan = overlay.querySelector<HTMLButtonElement>("[data-id-rescan]");
  let cleanup: (() => void) | null = null;

  const setStatus: StatusSetter = (message, tone = "normal") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const close = () => {
    cleanup?.();
    stopVideo(video);
    overlay.remove();
  };

  const start = async () => {
    if (!video) return;
    cleanup?.();
    stopVideo(video);
    setStatus("Abriendo camara...", "normal");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      cleanup = (await options.onReady?.({ video, setStatus, close })) ?? null;
    } catch (error) {
      setStatus("No pude abrir la camara. Da permiso a la camara, limpia el lente y vuelve a intentarlo.", "warning");
    }
  };

  closeButtons.forEach((button) => button.addEventListener("click", close));
  rescan?.addEventListener("click", start);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  void start();
}

function stopVideo(video: HTMLVideoElement | null) {
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

function parseAamva(raw: string): ParsedId {
  const fields = parseAamvaFields(raw);
  const firstName = cleanName(fields.get("DAC") ?? "");
  const middleName = cleanName(fields.get("DAD") ?? "");
  const lastName = cleanName(fields.get("DCS") ?? "");
  const street = cleanAddress(fields.get("DAG") ?? "");
  const city = cleanAddress(fields.get("DAI") ?? "");
  const state = (fields.get("DAJ") ?? "").trim().toUpperCase();
  const postal = formatZip(fields.get("DAK") ?? "");
  const birthDate = formatAamvaDate(fields.get("DBB") ?? "");
  const gender = formatGender(fields.get("DBC") ?? "");
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const address = [street, city, state, postal].filter(Boolean).join(", ");

  return { address, birthDate, fullName, gender };
}

function parseAamvaFields(raw: string) {
  const normalized = raw.replace(/\r/g, "\n");
  const positions = aamvaCodes
    .flatMap((code) => Array.from(normalized.matchAll(new RegExp(code, "g"))).map((match) => ({ code, index: match.index ?? -1 })))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  const fields = new Map<string, string>();

  positions.forEach((item, positionIndex) => {
    const start = item.index + item.code.length;
    const end = positions[positionIndex + 1]?.index ?? normalized.length;
    const value = normalized.slice(start, end).replace(/[\n\r]+/g, " ").trim();
    if (value && !fields.has(item.code)) fields.set(item.code, value);
  });

  return fields;
}

function fillFormFromId(form: HTMLFormElement, parsed: ParsedId) {
  setFieldValue(form, "Nombre completo", parsed.fullName ?? "");
  setFieldValue(form, "Direccion", parsed.address ?? "");
  setFieldValue(form, "Cumpleanos", parsed.birthDate ?? "");
  setSelectByVisibleLabel(form, "Genero", parsed.gender ?? "");
}

function setFieldValue(form: HTMLFormElement, labelText: string, value: string) {
  if (!value) return;
  const control = findControlForLabel<HTMLInputElement | HTMLTextAreaElement>(form, labelText, "input, textarea");
  if (!control) return;
  setNativeValue(control, value);
  control.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSelectByVisibleLabel(form: HTMLFormElement, labelText: string, value: string) {
  if (!value) return;
  const control = findControlForLabel<HTMLSelectElement>(form, labelText, "select");
  if (!control) return;
  setNativeValue(control, value);
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeValue(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const prototype = control instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : control instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(control, value);
}

function findControlForLabel<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  form: HTMLFormElement,
  labelText: string,
  selector: string,
): T | null {
  const label = findLabel(form, labelText);
  if (!label) return null;
  const nested = label.querySelector<T>(selector);
  if (nested) return nested;
  if (label.htmlFor) {
    const byId = form.querySelector<T>(`#${CSS.escape(label.htmlFor)}`);
    if (byId) return byId;
  }
  const parentControl = label.parentElement?.querySelector<T>(selector);
  if (parentControl) return parentControl;
  const siblingControl = label.nextElementSibling?.matches(selector)
    ? (label.nextElementSibling as T)
    : label.nextElementSibling?.querySelector<T>(selector);
  return siblingControl ?? null;
}

function findLabel(form: HTMLFormElement, labelText: string) {
  const target = normalize(labelText);
  return Array.from(form.querySelectorAll<HTMLLabelElement>("label")).find((label) => normalize(label.textContent ?? "").startsWith(target));
}

function hasUsefulData(parsed: ParsedId) {
  return Boolean(parsed.fullName || parsed.birthDate || parsed.address || parsed.gender);
}

function cleanName(value: string) {
  const withoutAamvaNoise = value
    .replace(/\bD[A-Z]{2,3}[A-Z0-9-]*/g, " ")
    .replace(/\b[A-Z]{2,4}N\b/g, " ");

  return withoutAamvaNoise
    .split(/[, ]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function cleanAddress(value: string) {
  return value.replace(/[^a-z0-9 #.,-]/gi, " ").replace(/\s+/g, " ").trim();
}

function formatAamvaDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const firstFour = Number(digits.slice(0, 4));
  if (firstFour >= 1900 && firstFour <= 2099) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return `${digits.slice(4, 8)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
}

function formatGender(value: string): ParsedId["gender"] {
  const normalized = value.trim();
  if (normalized === "1" || /^M\b/i.test(normalized)) return "Hombre";
  if (normalized === "2" || /^F\b/i.test(normalized)) return "Mujer";
  return "";
}

function formatZip(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 9) return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  return digits.slice(0, 5);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function scanIcon() {
  return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>';
}
