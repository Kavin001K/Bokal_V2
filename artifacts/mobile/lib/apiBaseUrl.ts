import { Platform } from "react-native";

declare const window: any;

function normalizeDomain(rawDomain: string): string {
  return rawDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configuredDomain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (configuredDomain && configuredDomain.trim().length > 0) {
    const domain = normalizeDomain(configuredDomain);
    const isLocal =
      domain.includes("localhost") ||
      domain.includes("127.0.0.1") ||
      domain.includes("192.168.") ||
      domain.includes("10.0.");
    return `${isLocal ? "http" : "https"}://${domain}`;
  }

  // Smooth local web testing when env is not set.
  if (Platform.OS === "web" && typeof window !== "undefined" && window?.location?.hostname) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8080";
    }
  }

  return "https://backend.bookal.kavin.cyou";
}
