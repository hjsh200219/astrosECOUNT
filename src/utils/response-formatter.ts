export interface McpTextContent {
  type: "text";
  text: string;
  [x: string]: unknown;
}

export interface McpImageContent {
  type: "image";
  data: string;
  mimeType: string;
  [x: string]: unknown;
}

export type McpContentBlock = McpTextContent | McpImageContent;

export interface McpResponse {
  content: McpContentBlock[];
  isError?: boolean;
  [x: string]: unknown;
}

export function formatResponse(data: unknown): McpResponse {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text", text }],
  };
}

export function formatMixedResponse(
  data: unknown,
  imageBase64?: string,
  mimeType = "image/svg+xml",
): McpResponse {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const content: McpContentBlock[] = [{ type: "text", text }];
  if (imageBase64) {
    content.push({ type: "image", data: imageBase64, mimeType });
  }
  return { content };
}

export function formatError(message: string): McpResponse {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
