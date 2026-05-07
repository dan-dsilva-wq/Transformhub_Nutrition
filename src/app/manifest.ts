import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Transform Hub — Performance Nutrition",
    short_name: "Transform Hub",
    description:
      "Engineered nutrition tracking for high performers. Log meals in seconds, see your numbers, and let the system pace your transformation.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#001a26",
    theme_color: "#003c53",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/brand/mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/mark.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
