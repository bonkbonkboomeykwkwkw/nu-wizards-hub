export function getGameArt(name = "") {
  if (/valorant/i.test(name)) return "/valorant-arena.jpg";
  if (/mobile\s*legends|legends|mlbb/i.test(name)) return "/mobile-legends-arena.jpg";
  return null;
}

export function getGameBackgroundStyle(name = "") {
  const image = getGameArt(name);
  return image
    ? { backgroundImage: `linear-gradient(90deg, rgba(7, 27, 73, .94), rgba(7, 27, 73, .72)), url('${image}')` }
    : { backgroundImage: "linear-gradient(120deg, #0b285d, #071b49)" };
}
