import { createMemoryRouter } from "react-router-dom";
import RootLayout from "@/layouts/RootLayout";
import Startup from "@/pages/Startup";

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Startup />,
      },
    ],
  },
]);
