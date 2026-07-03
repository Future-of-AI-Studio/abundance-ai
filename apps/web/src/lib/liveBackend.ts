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
      async signUpWithPassword({ email, password, firstName, category }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // first_name + category are read by the handle_new_user trigger to seed
          // the profile (profiles.category feeds automatic circle matching).
          options: { data: { first_name: firstName, category } },
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
        const { data: program } = await supabase
          .from(TABLES.programs)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!program) return { program: null, modules: [] };
        const { data: modules } = await supabase
          .from(TABLES.modules)
          .select('*')
          .eq('program_id', program.id)
          .order('idx');
        return { program, modules: modules ?? [] };
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
          .order('last_message_at', { ascending: false })
          .limit(20);
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
        return { id: res.content_source_id, filename: file.name };
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
