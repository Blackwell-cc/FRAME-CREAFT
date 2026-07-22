import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { AuthRepository, OwnerSession } from "./contracts";
import { CloudRepositoryError } from "./repositories";

function throwAuthError(operation: string, error: { code?: string } | null) {
  if (error) throw new CloudRepositoryError(operation, error);
}

async function resolveOwnerSession(
  client: SupabaseClient,
  session: Session | null,
): Promise<OwnerSession> {
  if (!session?.user) return { state: "signed-out" };

  const { data, error } = await client.rpc("is_framecraft_owner");
  throwAuthError("auth.ownerCheck", error);
  return {
    state: data === true ? "owner" : "viewer",
    userId: session.user.id,
    email: session.user.email ?? null,
  };
}

export function createAuthRepository(client: SupabaseClient): AuthRepository {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      throwAuthError("auth.getSession", error);
      return resolveOwnerSession(client, data.session);
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      throwAuthError("auth.signIn", error);
      return resolveOwnerSession(client, data.session);
    },

    async sendPasswordReset(email, origin) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset`,
      });
      throwAuthError("auth.passwordReset", error);
    },

    async linkGoogle(origin) {
      const { error } = await client.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: origin },
      });
      throwAuthError("auth.linkGoogle", error);
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      throwAuthError("auth.signOut", error);
    },

    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        void resolveOwnerSession(client, session).then(listener);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
