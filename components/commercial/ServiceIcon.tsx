import { Bot, Briefcase, Camera, LineChart, Globe, Layers, Mail, MapPin, Megaphone, PenTool, Share2, Sparkles, Star, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  megaphone: Megaphone,
  share: Share2,
  globe: Globe,
  bot: Bot,
  video: Video,
  "map-pin": MapPin,
  layers: Layers,
  briefcase: Briefcase,
  camera: Camera,
  pen: PenTool,
  chart: LineChart,
  mail: Mail,
  star: Star,
  sparkles: Sparkles,
} as const;

export const ICON_LABELS: Record<keyof typeof ICONS, string> = {
  megaphone: "Anúncios",
  share: "Redes sociais",
  globe: "Site",
  bot: "IA / automação",
  video: "Vídeo",
  "map-pin": "Localização",
  layers: "Pacote",
  briefcase: "Consultoria",
  camera: "Fotografia",
  pen: "Design",
  chart: "Resultados",
  mail: "E-mail",
  star: "Destaque",
  sparkles: "Novidade",
};

/** Imagem do serviço (URL https) ou ícone; cai para um ícone neutro. */
export function ServiceIcon({ icon, imageUrl, className, size = 20 }: { icon?: string | null; imageUrl?: string | null; className?: string; size?: number }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={cn("h-10 w-10 shrink-0 rounded-lg object-cover", className)} />;
  }
  const Icon = ICONS[(icon ?? "") as keyof typeof ICONS] ?? Briefcase;
  return (
    <span aria-hidden className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-korvix-50 text-korvix-600 ring-1 ring-inset ring-korvix-100", className)}>
      <Icon size={size} />
    </span>
  );
}
