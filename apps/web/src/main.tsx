import "./polyfills";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { installShortcuts } from "./lib/shortcuts";


installShortcuts();


const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});


declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <>
      <RouterProvider router={router} />
      <TanStackRouterDevtools router={router} />
    </>,
  );
}
