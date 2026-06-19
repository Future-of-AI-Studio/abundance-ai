// journey-update — persist journey progress (path choice, current step, mark a
// step complete). Drives the resumable stepper + Home next-best-step.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, journeyUpdateRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const body = await parseBody(req, journeyUpdateRequestSchema);

    const { data: state } = await db
      .from('journey_state').select('*').eq('user_id', user.id).maybeSingle();

    const completed: string[] = Array.isArray(state?.completed_steps) ? [...state!.completed_steps] : [];
    if (body.complete_step && !completed.includes(body.complete_step)) {
      completed.push(body.complete_step);
    }

    // Only touch the fields we were given (PostgREST upsert would null the rest).
    const patch: Record<string, unknown> = { completed_steps: completed };
    if (body.path !== undefined) patch.path = body.path;
    if (body.current_step !== undefined) patch.current_step = body.current_step;

    let updated;
    if (state) {
      const { data } = await db.from('journey_state').update(patch).eq('user_id', user.id).select('*').single();
      updated = data;
    } else {
      // Row is normally created by the signup trigger; insert as a safety net.
      const { data } = await db.from('journey_state').insert({ user_id: user.id, ...patch }).select('*').single();
      updated = data;
    }

    return json(updated);
  } catch (err) {
    return handleThrown(err);
  }
});
