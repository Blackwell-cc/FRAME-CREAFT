import { describe, expect, it } from "vitest";
import { createAuthRepository } from "../app/framecraft/cloud/auth";

function createAuthClient(isOwner: boolean) {
  const calls: Array<[string, ...unknown[]]> = [];
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "owner@example.com",
  };
  const session = { user };
  return {
    calls,
    client: {
      auth: {
        signInWithPassword(credentials: unknown) {
          calls.push(["signInWithPassword", credentials]);
          return Promise.resolve({ data: { session, user }, error: null });
        },
        resetPasswordForEmail(email: string, options: unknown) {
          calls.push(["resetPasswordForEmail", email, options]);
          return Promise.resolve({ data: {}, error: null });
        },
        linkIdentity(input: unknown) {
          calls.push(["linkIdentity", input]);
          return Promise.resolve({ data: {}, error: null });
        },
        getSession() {
          calls.push(["getSession"]);
          return Promise.resolve({ data: { session }, error: null });
        },
        signOut() {
          calls.push(["signOut"]);
          return Promise.resolve({ error: null });
        },
        onAuthStateChange(callback: (event: string, value: unknown) => void) {
          calls.push(["onAuthStateChange"]);
          callback("SIGNED_IN", session);
          return {
            data: {
              subscription: {
                unsubscribe() {
                  calls.push(["unsubscribe"]);
                },
              },
            },
          };
        },
      },
      rpc(name: string) {
        calls.push(["rpc", name]);
        return Promise.resolve({ data: isOwner, error: null });
      },
    },
  };
}

describe("owner auth repository", () => {
  it("signs in and enables owner state only after the owner RPC passes", async () => {
    const scripted = createAuthClient(true);
    const repository = createAuthRepository(scripted.client as never);

    await expect(
      repository.signIn("owner@example.com", "strong-password"),
    ).resolves.toEqual({
      state: "owner",
      userId: "11111111-1111-4111-8111-111111111111",
      email: "owner@example.com",
    });
    expect(scripted.calls).toContainEqual(["rpc", "is_framecraft_owner"]);
  });

  it("keeps an authenticated non-owner in viewer state", async () => {
    const repository = createAuthRepository(createAuthClient(false).client as never);

    await expect(repository.getSession()).resolves.toMatchObject({
      state: "viewer",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("sends reset and Google link redirects only to the supplied origin", async () => {
    const scripted = createAuthClient(true);
    const repository = createAuthRepository(scripted.client as never);

    await repository.sendPasswordReset("owner@example.com", "https://frame.test");
    await repository.linkGoogle("https://frame.test");

    expect(scripted.calls).toContainEqual([
      "resetPasswordForEmail",
      "owner@example.com",
      { redirectTo: "https://frame.test/auth/reset" },
    ]);
    expect(scripted.calls).toContainEqual([
      "linkIdentity",
      {
        provider: "google",
        options: { redirectTo: "https://frame.test" },
      },
    ]);
  });

  it("subscribes to auth changes and signs out cleanly", async () => {
    const scripted = createAuthClient(true);
    const repository = createAuthRepository(scripted.client as never);
    const states: string[] = [];
    const unsubscribe = repository.subscribe((value) => states.push(value.state));

    await new Promise((resolve) => setTimeout(resolve, 0));
    await repository.signOut();
    unsubscribe();

    expect(states).toEqual(["owner"]);
    expect(scripted.calls).toContainEqual(["signOut"]);
    expect(scripted.calls).toContainEqual(["unsubscribe"]);
  });
});
