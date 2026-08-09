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

// একসাথে একাধিক ছবি আপলোড করার জন্য — গ্যালারি ফিচারে ব্যবহার হয়।
export async function uploadMultipleImages(fileList, folder = "misc", onProgress) {
  const files = Array.from(fileList || []);
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], folder);
    urls.push(url);
    if (onProgress) onProgress(i + 1, files.length);
  }
  return urls;
}

// public URL থেকে bucket-এর ভেতরের path বের করে সেই ছবিটা storage থেকে মুছে ফেলে
export async function deleteImageByUrl(url) {
  if (!supabase || !url) return;
  const marker = `/${IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  try {
    await supabase.storage.from(IMAGES_BUCKET).remove([path]);
  } catch {
    // ব্যর্থ হলে সমস্যা নেই — শুধু রেফারেন্স মোছাই যথেষ্ট
  }
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

// শুধু ডিসপ্লে নাম বদলায় — স্টোরেজের আসল path অপরিবর্তিত থাকে
export async function renameGenericFile(row, newName) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  const { error } = await supabase.from("files").update({ name: newName }).eq("id", row.id);
  if (error) throw error;
}

// শুধু ভার্চুয়াল ফোল্ডার (folder_path) বদলায় — আসল ফাইল স্টোরেজে সরানোর দরকার নেই
export async function moveGenericFile(row, targetFolderPath) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  const { error } = await supabase.from("files").update({ folder_path: targetFolderPath }).eq("id", row.id);
  if (error) throw error;
}

// Storage-এর নিজস্ব copy() দিয়ে সার্ভার-সাইডেই কপি হয়
export async function copyGenericFile(row, targetFolderPath, newName) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  const finalName = newName || row.name;
  const newPath = `${targetFolderPath ? targetFolderPath + "/" : ""}${Date.now()}-${randomName(finalName)}`;
  const { error: copyErr } = await supabase.storage.from(FILES_BUCKET).copy(row.path, newPath);
  if (copyErr) throw copyErr;
  const { error: dbErr } = await supabase.from("files").insert({
    name: finalName,
    path: newPath,
    folder_path: targetFolderPath,
    size: row.size,
    mime_type: row.mime_type,
    tags: row.tags || [],
  });
  if (dbErr) throw dbErr;
}

// একসাথে একাধিক ফাইল ডিলিট করার জন্য (ফোল্ডার মোছার সময় ব্যবহার হয়)
export async function deleteFilesBulk(rows) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  if (!rows || rows.length === 0) return;
  const paths = rows.map((r) => r.path);
  const ids = rows.map((r) => r.id);
  const BATCH = 50;
  for (let i = 0; i < paths.length; i += BATCH) {
    await supabase.storage.from(FILES_BUCKET).remove(paths.slice(i, i + BATCH));
  }
  const { error } = await supabase.from("files").delete().in("id", ids);
  if (error) throw error;
}

// একটা ফোল্ডারের ভেতরের সব ফাইলকে একসাথে অন্য ফোল্ডারে সরানোর জন্য
export async function moveFilesBulk(rows, targetFolderPath) {
  if (!supabase) throw new Error("Supabase কনফিগার করা নেই");
  if (!rows || rows.length === 0) return;
  const ids = rows.map((r) => r.id);
  const { error } = await supabase.from("files").update({ folder_path: targetFolderPath }).in("id", ids);
  if (error) throw error;
}
