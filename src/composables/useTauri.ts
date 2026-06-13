import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTauriCommand<T>(
    command: string,
    args?: Record<string, unknown>,
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const execute = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoke<T>(command, args);
            setData(result);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, execute };
}

export function useIsTauri() {
    return true;
}
