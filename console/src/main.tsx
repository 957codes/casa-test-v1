import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { loadBrain } from "./feed";
import "./index.css";

// Load the brain before the first paint so the workspace renders with real data.
loadBrain().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
