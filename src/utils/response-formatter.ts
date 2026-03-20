export interface McpTextContent {
  type: "text";
  text: string;
  [x: string]: unknown;
}

export interface McpResponse {
  content: McpTextContent[];
  isError?: boolean;
  [x: string]: unknown;
}

export function formatResponse(data: unknown): McpResponse {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
  };
}

export function formatError(message: string): McpResponse {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
