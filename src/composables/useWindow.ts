import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindow() {
  const appWindow = getCurrentWindow();

  const minimize = async () => {
    await appWindow.minimize();
  };

  const maximize = async () => {
    await appWindow.maximize();
  };

  const unmaximize = async () => {
    await appWindow.unmaximize();
  };

  const toggleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await unmaximize();
    } else {
      await maximize();
    }
  };

  const close = async () => {
    await appWindow.close();
  };

  const hide = async () => {
    await appWindow.hide();
  };

  const show = async () => {
    await appWindow.show();
  };

  const setTitle = async (title: string) => {
    await appWindow.setTitle(title);
  };

  const setFullscreen = async (fullscreen: boolean) => {
    await appWindow.setFullscreen(fullscreen);
  };

  const isMaximized = async () => {
    return await appWindow.isMaximized();
  };

  const isFullscreen = async () => {
    return await appWindow.isFullscreen();
  };

  return {
    minimize,
    maximize,
    unmaximize,
    toggleMaximize,
    close,
    hide,
    show,
    setTitle,
    setFullscreen,
    isMaximized,
    isFullscreen,
  };
}
