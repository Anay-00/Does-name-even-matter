import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info("A new version is available.");
  },
  onOfflineReady() {
    console.info("MediSync SOS is ready offline.");
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
