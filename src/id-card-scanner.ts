import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type ParsedId = {
  address?: string;
  birthDate?: string;
  firstName?: string;
  fullName?: string;
  gender?: "Hombre" | "Mujer" | "";
  lastName?: string;
  middleName?: string;
};

type ScannerControls = {
  stop: () => void;
};

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
    const button = document.createElement("button");
    button.className = "btn btn-secondary id-scan-button";
    button.type = "button";
    button.innerHTML = `${scanIcon()} Escanear ID`;
    button.addEventListener("click", () => openScanner(form));
    title?.after(button);
  });
}

function openScanner(form: HTMLFormElement) {
  document.querySelector(".id-scanner-dialog")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "id-scanner-dialog";
  overlay.innerHTML = `
    <div class="id-scanner-card" role="dialog" aria-modal="true">
      <button class="id-scanner-close" type="button" aria-label="Cerrar">x</button>
      <h2>Escanear ID</h2>
      <p class="id-scanner-help">Usa el codigo de barras de atras del ID. Limpia el lente de la camara, busca buena luz y mantén el codigo dentro del cuadro.</p>
      <div class="id-scanner-video-wrap">
        <video class="id-scanner-video" muted playsinline></video>
        <div class="id-scanner-frame"></div>
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
  let controls: ScannerControls | null = null;
  let found = false;
  let scanStartedAt = Date.now();

  const setStatus = (message: string, tone: "normal" | "warning" | "success" = "normal") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const close = () => {
    controls?.stop();
    stopVideo(video);
    overlay.remove();
  };

  const start = async () => {
    if (!video) return;
    found = false;
    scanStartedAt = Date.now();
    setStatus("Apunta al codigo de atras del ID. Intentando encender la luz del telefono...", "normal");

    try {
      controls?.stop();
      stopVideo(video);
      const hints = new Map<DecodeHintType, BarcodeFormat[]>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]);
      const reader = new BrowserMultiFormatReader(hints, 400);
      controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        video,
        (result) => {
          if (!result || found) return;
          found = true;
          const parsed = parseAamva(result.getText());
          if (!parsed.fullName && !parsed.birthDate && !parsed.address) {
            setStatus("El codigo se detecto, pero no se pudo leer con claridad. Limpia el lente, mejora la luz y vuelve a intentarlo.", "warning");
            found = false;
            return;
          }
          fillFormFromId(form, parsed);
          setStatus("Datos leidos correctamente. Revisa la informacion antes de guardar.", "success");
          window.setTimeout(close, 850);
        },
      );
      await enableTorch(video);
      window.setTimeout(() => {
        if (!found && Date.now() - scanStartedAt >= 6500) {
          setStatus("No se lee claro todavia. Limpia el lente, enciende mas luz si puedes y evita reflejos sobre el codigo.", "warning");
        }
      }, 7000);
    } catch (error) {
      setStatus("No pude abrir la camara o leer el codigo. Da permiso a la camara, limpia el lente, mejora la luz y vuelve a intentarlo.", "warning");
    }
  };

  closeButtons.forEach((button) => button.addEventListener("click", close));
  rescan?.addEventListener("click", start);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  void start();
}

async function enableTorch(video: HTMLVideoElement | null) {
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  const track = stream?.getVideoTracks()[0];
  if (!track) return;
  const torchTrack = track as MediaStreamTrack & {
    getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
  };
  const capabilities = torchTrack.getCapabilities?.();
  if (!capabilities?.torch) return;
  await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
}

function stopVideo(video: HTMLVideoElement | null) {
  const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

function parseAamva(raw: string): ParsedId {
  const get = (code: string) => {
    const match = raw.match(new RegExp(`${code}([^\n\r]+)`));
    return match?.[1]?.trim().replace(/\s+/g, " ") ?? "";
  };

  const firstName = cleanName(get("DAC"));
  const middleName = cleanName(get("DAD"));
  const lastName = cleanName(get("DCS"));
  const street = get("DAG");
  const city = get("DAI");
  const state = get("DAJ");
  const postal = formatZip(get("DAK"));
  const birthDate = formatAamvaDate(get("DBB"));
  const gender = formatGender(get("DBC"));
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
  const address = [street, city, state, postal].filter(Boolean).join(", ");

  return { address, birthDate, firstName, fullName, gender, lastName, middleName };
}

function fillFormFromId(form: HTMLFormElement, parsed: ParsedId) {
  setFieldValue(form, "Nombre completo", parsed.fullName ?? "");
  setFieldValue(form, "Direccion", parsed.address ?? "");
  setFieldValue(form, "Dirección", parsed.address ?? "");
  setFieldValue(form, "Cumpleanos", parsed.birthDate ?? "");
  setFieldValue(form, "Cumpleaños", parsed.birthDate ?? "");
  setSelectByVisibleLabel(form, "Genero", parsed.gender ?? "");
  setSelectByVisibleLabel(form, "Género", parsed.gender ?? "");
}

function setFieldValue(form: HTMLFormElement, labelText: string, value: string) {
  if (!value) return;
  const control = findControlForLabel<HTMLInputElement | HTMLTextAreaElement>(form, labelText, "input, textarea");
  if (!control) return;
  control.value = value;
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function setSelectByVisibleLabel(form: HTMLFormElement, labelText: string, value: string) {
  if (!value) return;
  const control = findControlForLabel<HTMLSelectElement>(form, labelText, "select");
  if (!control) return;
  control.value = value;
  control.dispatchEvent(new Event("change", { bubbles: true }));
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

function cleanName(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatAamvaDate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function formatGender(value: string): ParsedId["gender"] {
  if (value === "1") return "Hombre";
  if (value === "2") return "Mujer";
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

function scanIcon() {
  return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>';
}
