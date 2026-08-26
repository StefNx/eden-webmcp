export {};

declare global {
  interface WebMcpToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface WebMcpExecuteOptions {
    signal: AbortSignal;
  }

  interface WebMcpTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    annotations?: WebMcpToolAnnotations;
    execute: (
      input: Record<string, unknown>,
      options?: WebMcpExecuteOptions,
    ) => unknown | Promise<unknown>;
  }

  interface WebMcpRegisterOptions {
    signal?: AbortSignal;
    exposedTo?: string[];
  }

  interface ModelContext {
    registerTool(tool: WebMcpTool, options?: WebMcpRegisterOptions): Promise<void>;
  }

  interface Document {
    modelContext?: ModelContext;
  }
}
