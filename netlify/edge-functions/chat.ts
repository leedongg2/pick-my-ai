// Netlify Edge Function for streaming chat API
// Runs on Deno runtime at the edge, supports full streaming

export default async (request: Request) => {
  // Forward to Next.js API route
  const url = new URL(request.url);
  const apiUrl = `${url.origin}/api/chat`;
  
  const response = await fetch(apiUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    // @ts-ignore - Deno supports duplex
    duplex: 'half',
  });

  // Return streaming response as-is
  return response;
};

export const config = {
  path: "/api/chat",
};
