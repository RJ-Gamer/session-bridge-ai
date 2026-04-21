import * as vscode from "vscode";
import { EXTENSION_ID, PROVIDERS } from "./constants";

export interface SessionBridgeConfig {
  provider: string;
  threshold: number;
  captureGitDiff: boolean;
  captureOpenFiles: boolean;
}

export function getConfig(): SessionBridgeConfig {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  return {
    provider: config.get<string>("provider", PROVIDERS.GEMINI),
    threshold: config.get<number>("messageThreshold", 5),
    captureGitDiff: config.get<boolean>("captureGitDiff", true),
    captureOpenFiles: config.get<boolean>("captureOpenFiles", true),
  };
}

export async function setProvider(provider: string): Promise<void> {
  await vscode.workspace
    .getConfiguration(EXTENSION_ID)
    .update("provider", provider, vscode.ConfigurationTarget.Global);
}
