import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pace — your weight-loss partner",
    short_name: "Pace",
    description:
      "Calm, photo-first nutrition tracking for busy adults losing weight at their own pace.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#0d9488",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
