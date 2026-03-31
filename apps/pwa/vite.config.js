import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.svg", "icon-512.svg", "apple-touch-icon.svg"],
      manifest: {
        name: "MediSync SOS",
        short_name: "MediSync SOS",
        description: "One-tap emergency request for faster ambulance dispatch.",
        theme_color: "#0d1f2d",
        background_color: "#f5f7f8",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          },
          {
            src: "apple-touch-icon.svg",
            sizes: "180x180",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "app-shell"
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly"
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_ORIGIN || "http://localhost:8080",
        changeOrigin: true
      }
    }
  }
});
