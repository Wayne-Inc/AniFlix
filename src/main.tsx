import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker for offline support and installability.
if ("serviceWorker" in navigator) {
  const { Workbox } = await import("workbox-window");
  const wb = new Workbox("/sw.js", { scope: "/" });

  wb.addEventListener("waiting", () => {
    console.log("[pwa] service worker waiting — reload to activate the latest version.");
  });

  wb.addEventListener("activated", (event) => {
    if (!event.isUpdate) {
      console.log("[pwa] service worker activated for the first time.");
    } else {
      console.log("[pwa] service worker updated.");
    }
  });

  wb.register().catch((err) => {
    console.warn("[pwa] service worker registration failed:", err);
  });
}
