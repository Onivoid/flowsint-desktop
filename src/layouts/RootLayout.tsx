import { Outlet } from "react-router-dom";
import { useTheme } from "@/composables";
import { Updater } from "@/components/Updater";

export default function RootLayout() {
  useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      <Updater />
    </div>
  );
}
