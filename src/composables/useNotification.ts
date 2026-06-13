import {
    sendNotification,
    isPermissionGranted,
    requestPermission,
} from "@tauri-apps/plugin-notification";

export function useNotification() {
    const checkPermission = async () => {
        return await isPermissionGranted();
    };

    const requestNotificationPermission = async () => {
        const permission = await requestPermission();
        return permission === "granted";
    };

    const notify = async (title: string, body?: string) => {
        try {
            console.log("[Notification] Checking permission...");
            let permissionGranted = await isPermissionGranted();
            console.log(
                "[Notification] Permission granted:",
                permissionGranted,
            );

            if (!permissionGranted) {
                console.log("[Notification] Requesting permission...");
                const permission = await requestPermission();
                permissionGranted = permission === "granted";
                console.log(
                    "[Notification] Permission after request:",
                    permissionGranted,
                );
            }

            if (permissionGranted) {
                console.log("[Notification] Sending notification:", {
                    title,
                    body,
                });
                sendNotification({ title, body });
                console.log("[Notification] Notification sent successfully");
            } else {
                console.warn(
                    "[Notification] Permission denied, cannot send notification",
                );
            }
        } catch (error) {
            console.error("[Notification] Error:", error);
        }
    };

    return {
        checkPermission,
        requestNotificationPermission,
        notify,
    };
}
