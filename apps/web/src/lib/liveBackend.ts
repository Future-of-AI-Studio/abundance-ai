// Live backend — Supabase auth + RLS-scoped table reads + the typed Edge-Function
// client from @abundance/shared.
import {
  createBrowserSupabase,
  createApiClient,
  TABLES,
} from '@abundance/shared';
import type { Backend, AuthUser } from './backend';
import { env } from './env';

export function createLiveBackend(): Backend {
  const supabase = createBrowserSupabase({ url: env.supabaseUrl, anonKey: env.supabaseAnonKey });
  const api = createApiClient(supabase);

  const toUser = (u: { id: string; email?: string } | null | undefined): AuthUser | null =>
    u ? { id: u.id, email: u.email ?? '' } : null;

  return {
    api,
    auth: {
      async getUser() {
        const { data } = await supabase.auth.getUser();
        return toUser(data.user);
      },
      onChange(cb) {
        const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
        return () => data.subscription.unsubscribe();
      },
      async signUpWithPassword({ email, password, firstName, category, categoryOther }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // first_name + category (+ category_other for the 'other' free text) are
          // read by the handle_new_user trigger to seed the profile
          // (profiles.category feeds automatic circle matching).
          options: {
            data: {
              first_name: firstName,
              category,
              category_other: category === 'other' ? categoryOther ?? null : null,
            },
          },
        });
        if (error) throw error;
        return { user: toUser(data.user), needsConfirmation: !data.session };
      },
      async signInWithPassword({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const u = toUser(data.user);
        if (!u) throw new Error('Sign-in failed.');
        return u;
      },
      async signInWithMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/welcome` },
        });
        if (error) throw error;
      },
      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      },
      async updatePassword(newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      },
      async updateEmail({ currentPassword, newEmail }) {
        const { data: current } = await supabase.auth.getUser();
        const email = current.user?.email;
        if (!email) throw new Error("You're not signed in.");
        const { error: pwError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
        if (pwError) throw new Error("That password isn't right - try again.");
        // Applies immediately (profiles.email follows via the on_auth_email_changed
        // trigger) — requires "Secure email change" to be off in the Supabase
        // project's auth settings, or the change stays pending a mailed link.
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    },
    reads: {
      async getProfile() {
        const { data } = await supabase.from(TABLES.profiles).select('*').maybeSingle();
        return data ?? null;
      },
      async getJourney() {
        const { data } = await supabase.from(TABLES.journey_state).select('*').maybeSingle();
        return data ?? null;
      },
      async getProgram() {
        // The active build. Fall back to the newest row if somehow none is active
        // (e.g. mid-migration), so the app never renders empty when a build exists.
        const { data: active } = await supabase
          .from(TABLES.programs)
          .select('*')
          .eq('is_active', true)
          .maybeSingle();
        const program =
          active ??
          (await supabase
            .from(TABLES.programs)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()).data;
        if (!program) return { program: null, modules: [] };
        const { data: modules } = await supabase
          .from(TABLES.modules)
          .select('*')
          .eq('program_id', program.id)
          .order('idx');
        return { program, modules: modules ?? [] };
      },
      async getPrograms() {
        const { data } = await supabase
          .from(TABLES.programs)
          .select('*')
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      async getProgramModules(programId) {
        const { data } = await supabase
          .from(TABLES.modules)
          .select('*')
          .eq('program_id', programId)
          .order('idx');
        return data ?? [];
      },
      async getMarketingPosts() {
        const { data } = await supabase.from(TABLES.marketing_posts).select('*').order('created_at');
        return data ?? [];
      },
      async getSession() {
        const { data } = await supabase.from(TABLES.sessions).select('*').maybeSingle();
        return data ?? null;
      },
      async getStripeConnect() {
        const { data } = await supabase.from(TABLES.stripe_connect).select('*').maybeSingle();
        return data ?? null;
      },
      async getLatestCheckin() {
        const { data } = await supabase
          .from(TABLES.mindset_checkins)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data ?? null;
      },
      async getCheckins() {
        const { data } = await supabase
          .from(TABLES.mindset_checkins)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        return data ?? [];
      },
      async getConversations() {
        const { data } = await supabase
          .from(TABLES.mindset_conversations)
          .select('*')
          .order('last_message_at', { ascending: false });
        return data ?? [];
      },
      async getMessages(conversationId) {
        const { data } = await supabase
          .from(TABLES.mindset_messages)
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        return data ?? [];
      },
      async getContentSources() {
        const { data } = await supabase
          .from(TABLES.content_sources)
          .select('*')
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      async getEnrollments() {
        // RLS scopes this to the signed-in creator's own buyers.
        const { data } = await supabase
          .from(TABLES.enrollments)
          .select('*')
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      async getProgramStats() {
        // Two head-only count queries (RLS-scoped to the creator) — no rows shipped.
        const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
        const [total, week] = await Promise.all([
          supabase.from(TABLES.program_views).select('*', { count: 'exact', head: true }),
          supabase
            .from(TABLES.program_views)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', weekAgo),
        ]);
        return { views: total.count ?? 0, views_this_week: week.count ?? 0 };
      },
      async updateProfile(patch) {
        const { data: userRes } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from(TABLES.profiles)
          .update(patch)
          .eq('id', userRes.user?.id ?? '')
          .select('*')
          .single();
        if (error) throw error;
        return data;
      },
    },
    storage: {
      async upload(file, kind, durationSec) {
        const res = await api.contentUploadUrl({
          kind,
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          duration_sec: durationSec ?? null,
        });
        // Upload via the browser storage client using the returned path + token.
        // (Don't PUT to res.signed_url directly — that absolute URL is built from
        // the Edge Function's SUPABASE_URL, which is the internal Docker host in
        // local dev and unreachable from the browser.)
        const { error } = await supabase.storage
          .from('content')
          .uploadToSignedUrl(res.storage_path, res.token, file, {
            contentType: file.type || 'application/octet-stream',
          });
        if (error) throw new Error('Upload failed.');
        // Kick off transcription in the background for recordings, so program-build
        // stays text-only and fast. Fire-and-forget: it's idempotent and program-build
        // backfills any that don't finish, so a dropped request is harmless.
        if (kind === 'voice') {
          void api.contentTranscribe({ content_source_id: res.content_source_id }).catch(() => {});
        }
        return { id: res.content_source_id, filename: file.name };
      },
      async uploadAvatar(file) {
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (!uid) throw new Error('You need to be signed in to upload a photo.');
        // Stable per-user path (upsert) so a new picture replaces the old one and
        // leaves no orphans. Content-type metadata drives how it's served, so the
        // path needs no extension.
        const path = `${uid}/avatar`;
        const { error } = await supabase.storage.from('avatars').upload(path, file, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });
        if (error) throw new Error('Upload failed.');
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cache-bust so the replaced image shows immediately (the path is reused).
        return `${data.publicUrl}?v=${Date.now()}`;
      },
      async remove(id) {
        // Look up the stored object first, delete the bytes, then the row.
        // RLS scopes both to the owner (policies: content_sources_all, content_owner_delete).
        const { data: row } = await supabase
          .from(TABLES.content_sources)
          .select('storage_path')
          .eq('id', id)
          .maybeSingle();
        if (row?.storage_path) {
          await supabase.storage.from('content').remove([row.storage_path]);
        }
        const { error } = await supabase.from(TABLES.content_sources).delete().eq('id', id);
        if (error) throw error;
      },
      async signedUrl(storagePath) {
        // Private bucket → issue a time-limited signed URL the <audio> can stream.
        const { data, error } = await supabase.storage.from('content').createSignedUrl(storagePath, 3600);
        if (error || !data?.signedUrl) throw new Error('Could not load that recording.');
        return data.signedUrl;
      },
    },
  };
}
