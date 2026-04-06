import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./stores/auth-store";
import { refreshAccessToken } from "./lib/graphql-client";

// Initialize auth store and proactively refresh tokens on startup
// so the first request never hits an expired access token.
const { accessToken, refreshToken } = useAuthStore.getState();
useAuthStore.getState().initialize();

if (accessToken && refreshToken) {
  refreshAccessToken().catch(() => {
    // logout + redirect handled inside refreshAccessToken
  });
}

createRoot(document.getElementById("root")!).render(<App />);
