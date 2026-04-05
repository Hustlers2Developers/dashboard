import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./stores/auth-store";

// Initialize auth store on app start
useAuthStore.getState().initialize();

createRoot(document.getElementById("root")!).render(<App />);
