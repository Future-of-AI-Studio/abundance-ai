// marketing-update — edit a post's caption/hashtags, mark it posted, or favorite it. RLS-scoped.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, marketingUpdateRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    await requireUser(req);
    const db = userClient(req);
    const body = await parseBody(req, marketingUpdateRequestSchema);

    const patch: Record<string, unknown> = {};
    if (body.caption !== undefined) patch.caption = body.caption;
    if (body.hashtags !== undefined) patch.hashtags = body.hashtags;
    if (body.posted !== undefined) patch.posted = body.posted;
    if (body.favorited !== undefined) patch.favorited = body.favorited;

    const { data: post, error } = await db
      .from('marketing_posts').update(patch).eq('id', body.id).select('*').maybeSingle();
    if (error || !post) return errorResponse('not_found', "We couldn't find that post.", 404);

    return json({ post });
  } catch (err) {
    return handleThrown(err);
  }
});
