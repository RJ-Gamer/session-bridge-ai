import * as vscode from "vscode";
import { STORAGE_KEYS, STATUS_BAR } from "./constants";

let ctx: vscode.ExtensionContext;

export function initBuffer(context: vscode.ExtensionContext): void {
  ctx = context;
}

export function getBuffer(): string[] {
  return ctx.workspaceState.get<string[]>(STORAGE_KEYS.BUFFER, []);
}

export function getCount(): number {
  return ctx.workspaceState.get<number>(STORAGE_KEYS.COUNT, 0);
}

export async function appendToBuffer(message: string): Promise<number> {
  const buffer = getBuffer();
  buffer.push(`[${new Date().toLocaleTimeString()}] ${message}`);
  await ctx.workspaceState.update(STORAGE_KEYS.BUFFER, buffer);
  const newCount = getCount() + 1;
  await ctx.workspaceState.update(STORAGE_KEYS.COUNT, newCount);
  return newCount;
}

export async function clearBuffer(): Promise<void> {
  await ctx.workspaceState.update(STORAGE_KEYS.BUFFER, []);
  await ctx.workspaceState.update(STORAGE_KEYS.COUNT, 0);
}

export function getBufferStatus(threshold: number): string {
  const count = getCount();
  return STATUS_BAR.withCount(count, threshold);
}
