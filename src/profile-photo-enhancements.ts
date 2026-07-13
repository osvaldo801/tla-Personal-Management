import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Gender = "Hombre" | "Mujer" | "";

type ServerPhotoProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  gender: Gender | null;
  photo_url: string | null;
};

type CropState = {
  image: HTMLImageElement | null;
  fileName: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

let profiles: ServerPhotoProfile[] = [];
let loadingProfiles: Promise<void> | null = null;
let observerStarted = false;
let enhanceTimer = 0;

export function initProfilePhotoEnhancements() {
  if (!isSupabaseConfigured || observerStarted || typeof window === "undefined") return;
  observerStarted = true;
  void refreshProfiles().then(enhanceProfilePhotos);

  const observer = new MutationObserver(() => {
    window.clearTimeout(enhanceTimer);
    enhanceTimer = window.setTimeout(enhanceProfilePhotos, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

async function refreshProfiles() {
  if (loadingProfiles) return loadingProfiles;
  loadingProfiles = loadProfiles();
  return loadingProfiles;
}

async function loadProfiles() {
  try {
    const { data, error } = await supabase
      .from("server_profiles")
      .select("id, full_name, phone, email, address, gender, photo_url")
      .order("full_name");
    if (error) throw error;
    profiles = ((data ?? []) as ServerPhotoProfile[]).map((profile) => ({
      ...profile,
      gender: normalizeGender(profile.gender),
    }));
  } finally {
    loadingProfiles = null;
  }
}

function enhanceProfilePhotos() {
  enhanceRows();
  simplifyServerTable();
  enhanceCards();
  enhanceDetailHeader();
  enhanceGenderInfo();
  enhanceEditorGender();
}

function enhanceRows() {
  document.querySelectorAll<HTMLTableRowElement>(".desktop-profile-table tbody tr").forEach((row) => {
    if (row.dataset.photoEnhanced === "true") return;
    const nameButton = row.querySelector<HTMLButtonElement>(".link-button");
    if (!nameButton) return;
    const profile = findProfile(row.textContent ?? "", nameButton.textContent ?? "");
    if (!profile) return;
    row.dataset.photoEnhanced = "true";
    const firstCell = row.querySelector<HTMLTableCellElement>("td");
    if (!firstCell) return;
    firstCell.classList.add("photo-name-cell", "server-name-contact-cell");

    const nameWrap = document.createElement("div");
    nameWrap.className = "server-name-wrap";
    nameWrap.append(nameButton, createQuickActions(profile));
    firstCell.replaceChildren(createPhotoButton(profile, "list"), nameWrap);
  });
}

function simplifyServerTable() {
  document.querySelectorAll<HTMLTableElement>(".desktop-profile-table").forEach((table) => {
    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
    const headerLabels = getServerTableLabels(headers);
    if (headers.length !== headerLabels.length || headers.some((header, index) => normalizeText(header.textContent ?? "") !== normalizeText(headerLabels[index]))) {
      const headerRow = table.querySelector<HTMLTableRowElement>("thead tr");
      if (headerRow) {
        headerRow.replaceChildren(...headerLabels.map((label) => {
          const th = document.createElement("th");
          th.textContent = label;
          return th;
        }));
      }
    }

    table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      const nameButton = row.querySelector<HTMLButtonElement>(".link-button");
      const profile = nameButton ? findProfile(row.textContent ?? "", nameButton.textContent ?? "") : findProfileByRow(row);
      const cells = Array.from(row.children) as HTMLTableCellElement[];
      if (cells.length < 7) return;

      const actionCell = cells.find((cell) => Boolean(cell.querySelector(".row-actions"))) ?? cells[cells.length - 1];
      const typeCell = cells[5];
      typeCell.textContent = abbreviateType(typeCell.textContent ?? "");
      const normalizedCells = [cells[0], cells[1], cells[2], cells[3], cells[4], typeCell, actionCell];
      const needsNormalization =
        cells.length !== normalizedCells.length ||
        normalizedCells.some((cell, index) => row.children[index] !== cell);

      // Replacing an already-correct row between pointerdown and click cancels
      // desktop interactions. Only touch legacy ten-column rows once.
      if (needsNormalization) row.replaceChildren(...normalizedCells);
    });

    table.querySelectorAll<HTMLTableCellElement>("td[colspan]").forEach((cell) => cell.setAttribute("colspan", "7"));
  });
}

function getServerTableLabels(headers: HTMLTableCellElement[]) {
  const activeLanguage = document.querySelector(".language-toggle button.active")?.textContent?.trim().toLowerCase();
  const firstHeader = normalizeText(headers[0]?.textContent ?? "");
  const isEnglish = activeLanguage === "en" || firstHeader === "name";
  return isEnglish
    ? ["Name", "Class", "Ministry", "Department", "Status", "Type", "Actions"]
    : ["Nombre", "Clase", "Ministerio", "Departamento", "Estado", "Tipo", "Acciones"];
}

function createQuickActions(profile: ServerPhotoProfile) {
  const actions = document.createElement("div");
  actions.className = "profile-quick-actions";
  const maps = createContactLink("map", profile);
  const phone = createContactLink("phone", profile);
  const text = createContactLink("text", profile);
  const email = createContactLink("email", profile);
  [maps, phone, text, email].forEach((link) => {
    if (link) actions.append(link);
  });
  return actions;
}

function createContactLink(kind: "map" | "phone" | "text" | "email", profile: ServerPhotoProfile) {
  const link = document.createElement("a");
  link.className = `quick-contact quick-contact-${kind}`;
  link.target = kind === "map" ? "_blank" : "";
  link.rel = kind === "map" ? "noreferrer" : "";

  if (kind === "map") {
    if (!profile.address) return null;
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`;
    link.title = "Abrir direccion en Google Maps";
    link.textContent = "⌖";
  }
  if (kind === "phone") {
    if (!profile.phone) return null;
    link.href = `tel:${normalizePhone(profile.phone)}`;
    link.title = "Llamar";
    link.textContent = "☎";
  }
  if (kind === "text") {
    if (!profile.phone) return null;
    link.href = `sms:${normalizePhone(profile.phone)}`;
    link.title = "Mandar texto";
    link.textContent = "✉";
  }
  if (kind === "email") {
    if (!profile.email) return null;
    link.href = `mailto:${profile.email}`;
    link.title = "Enviar email";
    link.textContent = "@";
  }

  link.addEventListener("click", (event) => event.stopPropagation());
  return link;
}

function enhanceCards() {
  document.querySelectorAll<HTMLElement>(".profile-card").forEach((card) => {
    if (card.dataset.photoEnhanced === "true") return;
    const nameButton = card.querySelector<HTMLButtonElement>(".profile-card-title, .link-button");
    if (!nameButton) return;
    const profile = findProfile(card.textContent ?? "", nameButton.textContent ?? "");
    if (!profile) return;
    card.dataset.photoEnhanced = "true";
    card.classList.add("compact-mobile-profile-card");

    const header = document.createElement("div");
    header.className = "enhanced-profile-card-head compact-mobile-card-head";
    const photo = createPhotoButton(profile, "mobile");
    const textWrap = document.createElement("div");
    textWrap.className = "compact-mobile-card-main";

    nameButton.parentElement?.insertBefore(header, nameButton);
    header.append(photo, textWrap);
    textWrap.append(nameButton);

    moveCardBadge(card, textWrap);
    moveCardStatus(card, textWrap);
    hideDuplicatedCardContactText(card, profile);
  });
}

function moveCardBadge(card: HTMLElement, target: HTMLElement) {
  const badge = card.querySelector<HTMLElement>(".participant-badge");
  if (!badge) return;
  badge.classList.add("compact-mobile-card-badge");
  target.append(badge);
}

function moveCardStatus(card: HTMLElement, target: HTMLElement) {
  const status = Array.from(card.querySelectorAll<HTMLElement>(".status-pill")).find((item) => normalizeText(item.textContent ?? "").includes("activo"));
  if (!status) return;
  status.classList.add("compact-mobile-card-status");
  target.append(status);
}

function hideDuplicatedCardContactText(card: HTMLElement, profile: ServerPhotoProfile) {
  const needles = [profile.email, profile.phone, profile.address].filter(Boolean).map((value) => normalizeText(value ?? ""));
  if (!needles.length) return;
  card.querySelectorAll<HTMLElement>("span, p, div").forEach((node) => {
    if (node.closest(".compact-mobile-card-head, .profile-quick-actions, .row-actions")) return;
    if (node.children.length > 0) return;
    const text = normalizeText(node.textContent ?? "");
    if (needles.some((needle) => needle && text.includes(needle))) node.classList.add("mobile-duplicate-contact");
  });
}

function enhanceDetailHeader() {
  const heading = document.querySelector<HTMLElement>(".profile-detail-heading");
  if (!heading || heading.dataset.photoEnhanced === "true") return;
  const title = heading.querySelector<HTMLHeadingElement>("h1");
  if (!title) return;
  const profile = findProfile(document.body.textContent ?? "", title.textContent ?? "");
  if (!profile) return;
  heading.dataset.photoEnhanced = "true";
  const wrap = document.createElement("div");
  wrap.className = "enhanced-detail-title";
  const titleParent = title.parentElement;
  if (!titleParent) return;
  titleParent.parentElement?.insertBefore(wrap, titleParent);
  wrap.append(createPhotoButton(profile, "large"), titleParent);
}

function enhanceGenderInfo() {
  const panel = document.querySelector<HTMLElement>(".profile-info-panel");
  if (!panel || panel.querySelector(".gender-info-enhancement")) return;
  const title = document.querySelector<HTMLHeadingElement>(".profile-detail-heading h1");
  if (!title) return;
  const profile = findProfile(panel.textContent ?? "", title.textContent ?? "");
  if (!profile) return;
  const classRow = Array.from(panel.querySelectorAll<HTMLElement>(".info-row")).find((row) => row.textContent?.includes("Clase"));
  const row = document.createElement("div");
  row.className = "info-row gender-info-enhancement";
  const label = document.createElement("span");
  label.textContent = "Género";
  const select = createGenderSelect(profile);
  row.append(label, select);
  classRow?.after(row);
}

function enhanceEditorGender() {
  const editor = document.querySelector<HTMLFormElement>(".profile-editor");
  if (!editor || editor.querySelector(".gender-editor-enhancement")) return;
  const profile = findProfile(editor.textContent ?? "", inputValue(editor, "Nombre completo"));
  const classField = Array.from(editor.querySelectorAll<HTMLElement>(".field")).find((field) => field.textContent?.includes("Clase"));
  const field = document.createElement("label");
  field.className = "field gender-editor-enhancement";
  const label = document.createElement("span");
  label.textContent = "Género";
  field.append(label, createGenderSelect(profile));
  classField?.after(field);
}

function createGenderSelect(profile: ServerPhotoProfile | null) {
  const select = document.createElement("select");
  ["", "Hombre", "Mujer"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || "Sin definir";
    select.append(option);
  });
  select.value = profile?.gender ?? "";
  select.addEventListener("change", async () => {
    if (!profile) return;
    const gender = normalizeGender(select.value);
    const { error } = await supabase.from("server_profiles").update({ gender: gender || null }).eq("id", profile.id);
    if (error) {
      window.alert("No se pudo guardar el género.");
      return;
    }
    profile.gender = gender;
    document.querySelectorAll(`[data-profile-photo-id="${profile.id}"]`).forEach((node) => renderPhoto(node as HTMLElement, profile));
  });
  return select;
}

function createPhotoButton(profile: ServerPhotoProfile, size: "small" | "large" | "list" | "mobile") {
  const button = document.createElement("button");
  button.className = `enhanced-profile-photo enhanced-profile-photo-${size}`;
  button.type = "button";
  button.title = "Ver o reemplazar foto";
  button.dataset.profilePhotoId = profile.id;
  renderPhoto(button, profile);
  button.addEventListener("click", () => openPhotoDialog(profile));
  return button;
}

function renderPhoto(target: HTMLElement, profile: ServerPhotoProfile) {
  const initials = getInitials(profile.full_name);
  const genderClass = profile.gender === "Mujer" ? "female" : profile.gender === "Hombre" ? "male" : "neutral";
  target.classList.remove("male", "female", "neutral");
  target.classList.add(genderClass);
  target.innerHTML = profile.photo_url
    ? `<img src="${escapeAttr(profile.photo_url)}" alt="${escapeAttr(profile.full_name)}" />`
    : `<span>${initials}</span>`;
}

function openPhotoDialog(profile: ServerPhotoProfile) {
  document.querySelector(".profile-photo-dialog")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "profile-photo-dialog";
  overlay.innerHTML = `
    <div class="profile-photo-dialog-card" role="dialog" aria-modal="true">
      <button class="profile-photo-dialog-close" type="button" aria-label="Cerrar">×</button>
      <div class="profile-photo-preview-area">
        <div class="profile-photo-id-frame" data-photo-preview></div>
      </div>
      <div class="profile-photo-crop-tools" hidden>
        <label>Zoom <input type="range" min="1" max="2.5" step="0.05" value="1" data-photo-zoom /></label>
        <p>Mueve la foto con el dedo o mouse para escoger el encuadre.</p>
      </div>
      <div class="profile-photo-dialog-actions">
        <button class="btn btn-secondary" type="button" data-photo-pick>Subir nueva</button>
        <button class="btn btn-primary" type="button" data-photo-save hidden>Guardar foto ID</button>
      </div>
    </div>`;
  document.body.append(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector<HTMLButtonElement>(".profile-photo-dialog-close")?.addEventListener("click", close);

  const preview = overlay.querySelector<HTMLElement>("[data-photo-preview]");
  const zoom = overlay.querySelector<HTMLInputElement>("[data-photo-zoom]");
  const save = overlay.querySelector<HTMLButtonElement>("[data-photo-save]");
  const tools = overlay.querySelector<HTMLElement>(".profile-photo-crop-tools");
  if (!preview || !zoom || !save || !tools) return;

  renderDialogPreview(preview, profile);
  const crop: CropState = { image: null, fileName: "profile.jpg", zoom: 1, offsetX: 0, offsetY: 0 };
  enablePreviewDrag(preview, crop);

  overlay.querySelector<HTMLButtonElement>("[data-photo-pick]")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      crop.fileName = file.name;
      crop.offsetX = 0;
      crop.offsetY = 0;
      crop.zoom = 1;
      zoom.value = "1";
      const url = URL.createObjectURL(file);
      crop.image = new Image();
      crop.image.onload = () => URL.revokeObjectURL(url);
      crop.image.src = url;
      preview.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(profile.full_name)}" />`;
      tools.hidden = false;
      save.hidden = false;
      updatePreviewTransform(preview, crop);
    };
    input.click();
  });

  zoom.addEventListener("input", () => {
    crop.zoom = Number(zoom.value);
    updatePreviewTransform(preview, crop);
  });
  save.addEventListener("click", async () => {
    if (!crop.image) return;
    const blob = await cropImageForId(crop.image, crop.zoom, crop.offsetX, crop.offsetY, preview);
    await saveProfilePhoto(profile, blob, crop.fileName);
    close();
  });
}

function enablePreviewDrag(preview: HTMLElement, crop: CropState) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  preview.addEventListener("pointerdown", (event) => {
    if (!crop.image) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    originX = crop.offsetX;
    originY = crop.offsetY;
    preview.setPointerCapture(event.pointerId);
  });

  preview.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    crop.offsetX = originX + event.clientX - startX;
    crop.offsetY = originY + event.clientY - startY;
    updatePreviewTransform(preview, crop);
  });

  const stopDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    preview.releasePointerCapture(event.pointerId);
  };
  preview.addEventListener("pointerup", stopDrag);
  preview.addEventListener("pointercancel", stopDrag);
}

function renderDialogPreview(preview: HTMLElement, profile: ServerPhotoProfile) {
  preview.innerHTML = profile.photo_url
    ? `<img src="${escapeAttr(profile.photo_url)}" alt="${escapeAttr(profile.full_name)}" />`
    : `<span>${getInitials(profile.full_name)}</span>`;
}

function updatePreviewTransform(preview: HTMLElement, crop: CropState) {
  const image = preview.querySelector<HTMLImageElement>("img");
  if (!image) return;
  image.style.transform = `translate(${crop.offsetX}px, ${crop.offsetY}px) scale(${crop.zoom})`;
}

function cropImageForId(image: HTMLImageElement, zoom: number, offsetX: number, offsetY: number, preview: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 750;
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(new Blob());
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const targetRatio = canvas.width / canvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  if (imageRatio > targetRatio) sourceWidth = image.naturalHeight * targetRatio;
  else sourceHeight = image.naturalWidth / targetRatio;

  sourceWidth = Math.max(1, sourceWidth / zoom);
  sourceHeight = Math.max(1, sourceHeight / zoom);

  const previewRect = preview.getBoundingClientRect();
  const sourceX = clamp((image.naturalWidth - sourceWidth) / 2 - (offsetX / Math.max(1, previewRect.width)) * sourceWidth, 0, image.naturalWidth - sourceWidth);
  const sourceY = clamp((image.naturalHeight - sourceHeight) / 2 - (offsetY / Math.max(1, previewRect.height)) * sourceHeight, 0, image.naturalHeight - sourceHeight);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob ?? new Blob()), "image/jpeg", 0.9));
}

async function saveProfilePhoto(profile: ServerPhotoProfile, blob: Blob, originalName: string) {
  const safeName = originalName.replace(/[^a-z0-9._-]/gi, "-").replace(/\.+/g, ".");
  const path = `${profile.id}/${Date.now()}-${safeName || "profile.jpg"}`;
  const upload = await supabase.storage.from("server-photos").upload(path, blob, { cacheControl: "3600", contentType: "image/jpeg", upsert: true });
  if (upload.error) {
    window.alert("No se pudo subir la foto.");
    return;
  }
  const { data } = supabase.storage.from("server-photos").getPublicUrl(path);
  const update = await supabase.from("server_profiles").update({ photo_url: data.publicUrl }).eq("id", profile.id);
  if (update.error) {
    window.alert("La foto subió, pero no se pudo guardar en el perfil.");
    return;
  }
  profile.photo_url = data.publicUrl;
  document.querySelectorAll(`[data-profile-photo-id="${profile.id}"]`).forEach((node) => renderPhoto(node as HTMLElement, profile));
}

function findProfileByRow(row: HTMLTableRowElement) {
  const email = row.textContent?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
  const phone = normalizePhone(row.textContent ?? "");
  return profiles.find((profile) => {
    if (email && (profile.email ?? "").toLowerCase() === email) return true;
    const profilePhone = normalizePhone(profile.phone ?? "");
    return Boolean(profilePhone && phone.includes(profilePhone));
  }) ?? null;
}

function abbreviateType(value: string) {
  const normalized = normalizeText(value);
  if (normalized.startsWith("ministerial")) return "MINIS.";
  if (normalized.startsWith("administrativo")) return "ADMIN.";
  return value.trim().slice(0, 5).toUpperCase();
}

function findProfile(containerText: string, name: string) {
  const normalizedName = normalizeText(name);
  const email = containerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? "";
  const phone = normalizePhone(containerText);
  return profiles.find((profile) => {
    if (normalizeText(profile.full_name) !== normalizedName) return false;
    if (email && (profile.email ?? "").toLowerCase() === email) return true;
    if (phone && normalizePhone(profile.phone ?? "") && phone.includes(normalizePhone(profile.phone ?? ""))) return true;
    return !email && !phone;
  }) ?? null;
}

function inputValue(form: HTMLElement, labelText: string) {
  const field = Array.from(form.querySelectorAll<HTMLLabelElement>("label")).find((label) => label.textContent?.includes(labelText));
  return field?.querySelector<HTMLInputElement>("input")?.value ?? "";
}

function normalizeGender(value: string | null | undefined): Gender {
  if (value === "Hombre" || value === "Mujer") return value;
  return "";
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
