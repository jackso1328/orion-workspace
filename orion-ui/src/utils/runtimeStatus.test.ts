import test from "node:test";
import assert from "node:assert/strict";
import { deriveRuntimeStatus, formatProviderName } from "./runtimeStatus.ts";

test("Backend unavailable always produces Unavailable badge with pill-neutral", () => {
  // Even if cloud engine or saved credential exists in state, if backend is offline, must be Unavailable
  const result = deriveRuntimeStatus({
    backendAvailable: false,
    engine: "cloud",
    cloudProvider: "openai",
    selectedProvider: "openai",
  });
  assert.deepEqual(result, {
    label: "Unavailable",
    pillClass: "pill-neutral",
  });
});

test("A saved key alone does not make badge claim Cloud active when backend is offline", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: false,
    engine: "none",
    cloudProvider: null,
    selectedProvider: "anthropic",
  });
  assert.deepEqual(result, {
    label: "Unavailable",
    pillClass: "pill-neutral",
  });
});

test("Backend available and cloud engine selected shows Cloud active with authoritative provider", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: true,
    engine: "cloud",
    cloudProvider: "anthropic",
    selectedProvider: "anthropic",
  });
  assert.deepEqual(result, {
    label: "Cloud active (Anthropic)",
    pillClass: "pill-violet",
  });
});

test("Backend available and local engine selected shows Local ready with pill-green", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: true,
    engine: "local",
    cloudProvider: null,
    selectedProvider: "openai",
  });
  assert.deepEqual(result, {
    label: "Local ready",
    pillClass: "pill-green",
  });
});

test("Backend available with neither engine configured produces Not configured with pill-neutral", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: true,
    engine: "none",
    cloudProvider: null,
    selectedProvider: "openai",
  });
  assert.deepEqual(result, {
    label: "Not configured",
    pillClass: "pill-neutral",
  });
});

test("Downloading state produces Downloading percentage badge with pill-blue", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: true,
    engine: "none",
    selectedProvider: "openai",
    isDownloading: true,
    downloadPercent: 42.6,
  });
  assert.deepEqual(result, {
    label: "Downloading (43%)",
    pillClass: "pill-blue",
  });
});

test("Paused download state produces Paused percentage badge with pill-amber", () => {
  const result = deriveRuntimeStatus({
    backendAvailable: true,
    engine: "none",
    selectedProvider: "openai",
    isPaused: true,
    downloadPercent: 75.2,
  });
  assert.deepEqual(result, {
    label: "Paused (75%)",
    pillClass: "pill-amber",
  });
});

test("formatProviderName properly formats provider display names", () => {
  assert.equal(formatProviderName("openai"), "OpenAI");
  assert.equal(formatProviderName("anthropic"), "Anthropic");
  assert.equal(formatProviderName("openrouter"), "OpenRouter");
  assert.equal(formatProviderName("custom"), "Custom");
  assert.equal(formatProviderName(null), "Cloud");
});
