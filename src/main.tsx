import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createHashRouter } from "react-router";
import "./index.css";
import "react-tooltip/dist/react-tooltip.css";
import App from "./App.tsx";
import { DOWNLOAD_PATH } from "./lib/consts.ts";
import { DealPreparation } from "./pages/DealPreparation";
import { Retrieval } from "./pages/FileRetrieval.tsx";

const router = createHashRouter([
  {
    path: "/",
    Component: App,
    children: [
      {
        index: true,
        Component: DealPreparation,
      },
      {
        path: DOWNLOAD_PATH,
        Component: Retrieval,
      },
    ],
  },
]);

// biome-ignore lint/style/noNonNullAssertion: If there is no `root` there is no page
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
