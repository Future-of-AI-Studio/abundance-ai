// Permissive CORS for the browser app. Tighten `Access-Control-Allow-Origin`
// to the deployed frontend origin in production via the APP_URL secret.
const APP_URL = Deno.env.get('APP_URL') ?? '*';

export const corsHeaders = {
  'Access-Control-Allow-Origin': APP_URL,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
};

export function handleOptions(): Response {
  return new Response('ok', { headers: corsHeaders });
}
