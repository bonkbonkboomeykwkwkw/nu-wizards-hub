export function getGameArt(name = "") {
  if (/roblox/i.test(name)) return "/roblox-arena.webp";
  if (/valorant/i.test(name)) return "/valorant-arena.jpg";
  if (/mobile\s*legends|legends|mlbb/i.test(name)) return "/mobile-legends-arena.jpg";
  return null;
}
