import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router";
import "./index.css";
import "react-tooltip/dist/react-tooltip.css";
import App from "./App.tsx";
import { DealPreparation } from "./pages/DealPreparation";
import { Download } from "./pages/Download";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <DealPreparation />,
      },
      {
        path: "/download",
        element: <Download />,
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
