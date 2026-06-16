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
  observer.observe(document.body, { childList: true, subtree: true });
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
    firstCell.classList.add("photo-name-cell");
    firstCell.prepend(createPhotoButton(profile, "small"));
  });
}

function enhanceCards() {
  document.querySelectorAll<HTMLElement>(".profile-card").forEach((card) => {
    if (card.dataset.photoEnhanced === "true") return;
    const nameButton = card.querySelector<HTMLButtonElement>(".profile-card-title, .link-button");
    if (!nameButton) return;
    const profile = findProfile(card.textContent ?? "", nameButton.textContent ?? "");
    if (!profile) return;
    card.dataset.photoEnhanced = "true";
    const header = document.createElement("div");
    header.className = "enhanced-profile-card-head";
    const photo = createPhotoButton(profile, "small");
    const textWrap = document.createElement("div");
    nameButton.parentElement?.insertBefore(header, nameButton);
    header.append(photo, textWrap);
    textWrap.append(nameButton);
    const badge = card.querySelector<HTMLElement>(".participant-badge");
    if (badge) textWrap.append(badge);
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

function createPhotoButton(profile: ServerPhotoProfile, size: "small" | "large") {
  const button = document.createElement("button");
  button.className = `enhanced-profile-photo enhanced-profile-photo-${size}`;
  button.type = "button";
  button.title = "Subir o reemplazar foto";
  button.dataset.profilePhotoId = profile.id;
  renderPhoto(button, profile);
  button.addEventListener("click", () => void uploadPhoto(profile));
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

async function uploadPhoto(profile: ServerPhotoProfile) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("server-photos").upload(path, file, { cacheControl: "3600", upsert: true });
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
  };
  input.click();
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
