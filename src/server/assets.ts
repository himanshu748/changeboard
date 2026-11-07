import sharp from "sharp";
import { randomUUID } from "node:crypto";
import type { Facts } from "../shared";
import type { Sql } from "./db";
const esc = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function poster(
  db: Sql,
  userId: string,
  facts: Facts,
  name: string,
) {
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(facts.date + "T12:00:00Z"));
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date("2026-01-01T" + facts.time + ":00Z"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#EEE8D9"/><rect x="48" y="48" width="984" height="1254" rx="4" fill="none" stroke="#214E40" stroke-width="2"/><text x="100" y="132" font-family="sans-serif" font-size="22" fill="#214E40" letter-spacing="6">AN EVENING OF MAKING</text><path d="M280 540 Q270 810 540 820 Q810 810 800 540 Z" fill="#AD7159"/><ellipse cx="540" cy="540" rx="260" ry="92" fill="#C18B72"/><ellipse cx="540" cy="540" rx="195" ry="57" fill="#8E5B48"/><path d="M300 650 Q540 740 780 650" stroke="#D4A58B" fill="none" stroke-width="5"/><path d="M335 730 Q540 790 745 730" stroke="#D4A58B" fill="none" stroke-width="5"/><text x="100" y="305" font-family="Georgia,serif" font-size="86" fill="#214E40">${esc(name.split(" ").slice(0, 2).join(" "))}</text><text x="100" y="400" font-family="Georgia,serif" font-size="86" fill="#214E40">${esc(name.split(" ").slice(2).join(" "))}</text><path d="M100 910H980" stroke="#214E40"/><text x="100" y="990" font-family="sans-serif" font-size="30" fill="#214E40">${esc(day)}</text><text x="100" y="1050" font-family="sans-serif" font-size="30" fill="#214E40">${esc(time)} · ${esc(facts.timezone)}</text><text x="100" y="1120" font-family="Georgia,serif" font-size="46" fill="#214E40">${esc(facts.venue)}</text><text x="100" y="1170" font-family="sans-serif" font-size="24" fill="#214E40">${esc(facts.address)}</text><text x="100" y="1250" font-family="sans-serif" font-size="20" fill="#214E40">MATERIALS, TEA &amp; GOOD COMPANY.</text></svg>`;
  const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
  const altText = `${name}. ${day}, ${time}, ${facts.timezone}. ${facts.venue}${facts.address ? ", " + facts.address : ""}. Materials, tea and good company.`;
  return saveAsset(db, userId, bytes, "image/png", altText);
}
export async function saveAsset(
  db: Sql,
  userId: string,
  bytes: Buffer,
  mime: string,
  altText: string,
) {
  const id = randomUUID();
  await db.query(
    "INSERT INTO assets(id,user_id,mime,bytes,alt_text) VALUES($1,$2,$3,$4,$5)",
    [id, userId, mime, bytes, altText],
  );
  return { url: `/media/${id}`, altText };
}
export async function uploadImage(
  db: Sql,
  userId: string,
  data: string,
  mime: string,
  altText: string,
) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new Error("Choose a PNG, JPEG or WebP image.");
  const bytes = Buffer.from(data, "base64");
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 16)
    throw new Error("Choose an image smaller than 5 MB.");
  const image = sharp(bytes, { limitInputPixels: 25000000 });
  const meta = await image.metadata();
  if (!["png", "jpeg", "webp"].includes(meta.format || ""))
    throw new Error("The file is not a supported image.");
  const clean = await image
    .rotate()
    .resize({
      width: 1600,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  return saveAsset(db, userId, clean, "image/png", altText);
}
