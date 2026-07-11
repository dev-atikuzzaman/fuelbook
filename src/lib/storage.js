import { supabase, IMAGES_BUCKET, FILES_BUCKET } from "./supabase";

function randomName(originalName) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return ext ? `${rand}.${ext}` : rand;
}

// আপলোড করে public URL রিটার্ন করে — dictionary/custom entry ছবির জন্য
export async function uploadImage(file, folder = "misc") {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  const path = `${folder}/${randomName(file.name)}`;
  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// সাধারণ যেকোনো ফাইল/ফোল্ডার আপলোডের জন্য — files টেবিলে metadata সেভ হয়
export async function uploadGenericFile(file, folderPath = "") {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  const storagePath = `${folderPath ? folderPath + "/" : ""}${Date.now()}-${randomName(file.name)}`;
  const { error: upErr } = await supabase.storage.from(FILES_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase.from("files").insert({
    name: file.name,
    path: storagePath,
    folder_path: folderPath,
    size: file.size,
    mime_type: file.type || "",
  });
  if (dbErr) throw dbErr;
}

export function getFilePublicUrl(path) {
  if (!supabase) return "";
  const { data } = supabase.storage.from(FILES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteGenericFile(row) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  await supabase.storage.from(FILES_BUCKET).remove([row.path]);
  const { error } = await supabase.from("files").delete().eq("id", row.id);
  if (error) throw error;
}
