import { useEffect, useState } from "react";
import { Href, useRouter } from "expo-router";
import { getAuthDestination } from "../utils/authNavigation";

export const useAuthBootstrap = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const destination = await getAuthDestination();
        if (!cancelled) {
          router.replace(destination as Href);
        }
      } catch {
        if (!cancelled) {
          setError("Impossible de vérifier votre session. Vérifiez votre connexion.");
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [retryKey, router]);

  const retry = () => {
    setError("");
    setRetryKey((key) => key + 1);
  };

  return { error, retry };
};
