import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Provider } from "./components/ui/provider.tsx";
import "react-bscroll/lib/react-scroll.css";
import { downloadDefaultMapSet } from "./utils/maps/online.ts";
async function main() {
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  // const currentWindow = getCurrentWindow();
  // currentWindow.setTitle("Rhythia - Testing 3");
  await downloadDefaultMapSet();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Provider forcedTheme="dark">
        <App />
      </Provider>
    </StrictMode>
  );
}

main();
