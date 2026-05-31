import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "./stores/auth-store";

// Session restore: accessToken is in-memory only.
// On reload it's lost — user will need to login again.
// When backend supports credentials:include CORS, refreshAccessToken() can be called here.
useAuthStore.getState().setSessionLoading(false);

createRoot(document.getElementById("root")!).render(<App />);
