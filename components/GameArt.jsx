import Image from "next/image";
import { getGameArt } from "@/lib/game-art";

export default function GameArt({ name, wide = false }) {
  const src = getGameArt(name);
  if (!src) return null;
  const alt = src.includes("roblox")
    ? "Roblox avatars gathering beside a pool"
    : src.includes("valorant") ? "Valorant game artwork" : "Mobile Legends game artwork";
  return (
    <div className="relative z-30 aspect-video w-full overflow-hidden bg-slate-950">
      <Image src={src} alt={alt} fill sizes={wide ? "(max-width: 1152px) 100vw, 1152px" : "(max-width: 768px) 100vw, 560px"} className="object-contain object-center opacity-100" />
    </div>
  );
}
