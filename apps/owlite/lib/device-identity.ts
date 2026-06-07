import { nanoid } from "nanoid";

export function getDeviceId(): string {
  let id = localStorage.getItem("owlite_device_id");
  if (!id) {
    id = nanoid();
    localStorage.setItem("owlite_device_id", id);
  }
  return id;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("tv") || ua.includes("smarttv") || ua.includes("crkey")) return "TV";
  if (screen.width >= 1920) return "TV";
  if (screen.width < 768 || ua.includes("mobile") || ua.includes("android")) return "Mobile";
  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
  return "Desktop";
}
