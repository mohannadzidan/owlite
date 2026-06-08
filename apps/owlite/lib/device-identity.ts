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
  const ua = navigator.userAgent;

  // Android TV / Smart TV
  if (/Android TV|SMART-TV|SmartTV|CrKey|Tizen|webOS/i.test(ua)) {
    const model = ua.match(/\(Linux;\s*Android[^;]*;\s*([^)]+?)\s*(?:Build|[)])/)?.[1]?.trim();
    return model ? `${model} (TV)` : "Android TV";
  }
  // Large-screen touch-free Android is almost certainly a TV
  if (/Android/i.test(ua) && screen.width >= 1920 && navigator.maxTouchPoints === 0) {
    const model = ua.match(/\(Linux;\s*Android[^;]*;\s*([^)]+?)\s*(?:Build|[)])/)?.[1]?.trim();
    return model ? `${model} (TV)` : "Android TV";
  }

  // iPhone
  if (/iPhone/.test(ua)) {
    const ver = ua.match(/CPU iPhone OS ([\d_]+)/)?.[1]?.replace(/_/g, ".");
    return ver ? `iPhone (iOS ${ver})` : "iPhone";
  }

  // iPad (or iPad-mode Safari on iPadOS 13+)
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    const ver = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".");
    return ver ? `iPad (iPadOS ${ver})` : "iPad";
  }

  // Android phone — UA format: "(Linux; Android 14; Pixel 8 Build/...)"
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) {
    const model = ua.match(/\(Linux;\s*Android[^;]*;\s*([^)]+?)\s*(?:Build|[)])/)?.[1]?.trim();
    return model ?? "Android Phone";
  }

  // Android tablet (no "Mobile" token)
  if (/Android/i.test(ua)) {
    const model = ua.match(/\(Linux;\s*Android[^;]*;\s*([^)]+?)\s*(?:Build|[)])/)?.[1]?.trim();
    return model ? `${model} (Tablet)` : "Android Tablet";
  }

  // Windows
  if (/Windows NT/.test(ua)) {
    const ntVer = ua.match(/Windows NT ([\d.]+)/)?.[1] ?? "";
    const names: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    return `Windows ${names[ntVer] ?? ntVer} PC`;
  }

  // macOS
  if (/Macintosh/.test(ua)) {
    const ver = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, ".");
    return ver ? `Mac (macOS ${ver})` : "Mac";
  }

  if (/Linux/.test(ua)) return "Linux PC";

  return "Browser";
}
