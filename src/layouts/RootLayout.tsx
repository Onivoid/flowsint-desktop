import { Outlet } from "react-router-dom";
import { useTheme } from "@/composables";

export default function RootLayout() {
  useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
