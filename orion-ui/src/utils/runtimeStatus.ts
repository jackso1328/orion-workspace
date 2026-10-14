export interface RuntimeStatusInput {
  backendAvailable: boolean;
  engine: "cloud" | "local" | "none" | string;
  cloudProvider?: string | null;
  selectedProvider: string;
  isDownloading?: boolean;
  downloadPercent?: number;
  isPaused?: boolean;
}

export interface RuntimeStatusBadge {
  label: string;
  pillClass: string;
}

export function formatProviderName(prov?: string | null): string {
  if (!prov) return "Cloud";
  if (prov === "openai") return "OpenAI";
  if (prov === "anthropic") return "Anthropic";
  if (prov === "openrouter") return "OpenRouter";
  return prov.charAt(0).toUpperCase() + prov.slice(1);
}

export function deriveRuntimeStatus(input: RuntimeStatusInput): RuntimeStatusBadge {
  // 1. Backend unavailable or unreachable -> strictly Unavailable
  if (!input.backendAvailable) {
    return { label: "Unavailable", pillClass: "pill-neutral" };
  }
  // 2. Active downloads
  if (input.isDownloading) {
    return { 
      label: `Downloading (${Math.round(input.downloadPercent || 0)}%)`, 
      pillClass: "pill-blue" 
    };
  }
  // 3. Paused downloads
  if (input.isPaused) {
    return { 
      label: `Paused (${Math.round(input.downloadPercent || 0)}%)`, 
      pillClass: "pill-amber" 
    };
  }
  // 4. Backend status available and cloud engine selected
  if (input.engine === "cloud") {
    const activeProv = input.cloudProvider || input.selectedProvider;
    return { 
      label: `Cloud active (${formatProviderName(activeProv)})`, 
      pillClass: "pill-violet" 
    };
  }
  // 5. Backend status available and local engine selected
  if (input.engine === "local") {
    return { 
      label: "Local ready", 
      pillClass: "pill-green" 
    };
  }
  // 6. Backend status available with neither usable configuration
  return { 
    label: "Not configured", 
    pillClass: "pill-neutral" 
  };
}
