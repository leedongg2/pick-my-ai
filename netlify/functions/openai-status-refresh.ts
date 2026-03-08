const OPENAI_STATUS_ENDPOINT_PATH = '/api/openai-status?refresh=1';

function normalizeBaseUrl(): string {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  return baseUrl.replace(/\/+$/, '');
}

export default async () => {
  const baseUrl = normalizeBaseUrl();
  if (!baseUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing site URL environment variable.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const cronSecret = process.env.CRON_SECRET || '';
  const response = await fetch(`${baseUrl}${OPENAI_STATUS_ENDPOINT_PATH}`, {
    method: 'GET',
    headers: cronSecret
      ? {
          Authorization: `Bearer ${cronSecret}`,
        }
      : undefined,
  });

  const text = await response.text();

  return new Response(text || JSON.stringify({ ok: response.ok }), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
};

export const config = {
  schedule: '*/5 * * * *',
};
