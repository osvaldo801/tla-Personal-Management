import { isSupabaseConfigured, supabase } from "./lib/supabase";

type PhotoProfile = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

let started = false;
let timer = 0;
let profiles = new Map<string, PhotoProfile>();

export function initProfilePhotoClickHotfix() {
  if (started || typeof window === "undefined" || !isSupabaseConfigured) return;
  started = true;
  void loadProfiles().then(attachPhotoHandlers);

  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void loadProfiles().then(attachPhotoHandlers), 250);
  };

  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true });
}

async function loadProfiles() {
  const { data, error } = await supabase.from("server_profiles").select("id, full_name, photo_url");
  if (error) return;
  profiles = new Map(((data ?? []) as PhotoProfile[]).map((profile) => [profile.id, profile]));
}

function attachPhotoHandlers() {
  document.querySelectorAll<HTMLElement>("[data-profile-photo-id]").forEach((target) => {
    if (target.dataset.photoClickHotfix === "true") return;
    const profileId = target.dataset.profilePhotoId;
    if (!profileId) return;
    target.dataset.photoClickHotfix = "true";
    target.setAttribute("role", target.getAttribute("role") || "button");
    target.setAttribute("tabindex", target.getAttribute("tabindex") || "0");
    target.setAttribute("title", target.getAttribute("title") || "Subir o cambiar foto");
    target.style.cursor = "pointer";

    target.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPhotoPicker(profileId);
    });
    target.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      openPhotoPicker(profileId);
    });
  });
}

function openPhotoPicker(profileId: string) {
  const profile = profiles.get(profileId);
  if (!profile) {
    window.alert("No se pudo encontrar este servidor para subir la foto.");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    void uploadProfilePhoto(profile, file);
  };
  input.click();
}

async function uploadProfilePhoto(profile: PhotoProfile, file: File) {
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").replace(/\.+/g, ".") || "profile.jpg";
  const path = `${profile.id}/${Date.now()}-${safeName}`;
  const upload = await supabase.storage.from("server-photos").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: true,
  });

  if (upload.error) {
    window.alert("No se pudo subir la foto. Revisa permisos de Storage.");
    return;
  }

  const { data } = supabase.storage.from("server-photos").getPublicUrl(path);
  const update = await supabase.from("server_profiles").update({ photo_url: data.publicUrl }).eq("id", profile.id);
  if (update.error) {
    window.alert("La foto subió, pero no se pudo guardar en la ficha.");
    return;
  }

  profile.photo_url = data.publicUrl;
  profiles.set(profile.id, profile);
  document.querySelectorAll<HTMLElement>(`[data-profile-photo-id="${profile.id}"]`).forEach((target) => {
    target.innerHTML = `<img src="${escapeAttr(data.publicUrl)}" alt="${escapeAttr(profile.full_name)}" />`;
  });
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
