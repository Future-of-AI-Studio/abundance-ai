// testimonial-create — lightweight capture after a positive moment.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, testimonialCreateRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { text, permission_granted } = await parseBody(req, testimonialCreateRequestSchema);

    const { data: testimonial } = await db
      .from('testimonials')
      .insert({ user_id: user.id, text, permission_granted })
      .select('*').single();

    return json({ testimonial });
  } catch (err) {
    return handleThrown(err);
  }
});
