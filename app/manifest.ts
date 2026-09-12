import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TOdo — Terapia Ocupacional",
    short_name: "TOdo",
    description: "Gestión clínica para terapeutas ocupacionales: agenda, fichas, informes con IA.",
    start_url: "/dashboard/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#ffffff",
    lang: "es",
    categories: ["health", "medical", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
