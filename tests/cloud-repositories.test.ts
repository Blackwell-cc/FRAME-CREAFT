import { describe, expect, it } from "vitest";
import { starterTechniques } from "../app/framecraft/seed-data";
import { toCloudSavedPrompt, toCloudTechnique } from "../app/framecraft/cloud/mappers";
import {
  CloudRepositoryError,
  createCloudRepositories,
} from "../app/framecraft/cloud/repositories";
import type { SavedPrompt } from "../app/framecraft/types";
import { upgradeSavedPrompt } from "../app/framecraft/saved-prompt-schema";

function createScriptedClient(
  script: Record<string, { data: unknown; error: unknown }>,
  options: {
    rpcResponse?: { data: unknown; error: unknown };
    uploadResponse?: { data: unknown; error: unknown };
    authUserId?: string;
  } = {},
) {
  const calls: Array<[string, ...unknown[]]> = [];
  return {
    calls,
    client: {
      from(table: string) {
        calls.push(["from", table]);
        const response = script[table];
        const query = {
          select(columns: string) {
            calls.push(["select", columns]);
            return query;
          },
          eq(column: string, value: unknown) {
            calls.push(["eq", column, value]);
            return query;
          },
          is(column: string, value: unknown) {
            calls.push(["is", column, value]);
            return query;
          },
          order(column: string, options: unknown) {
            calls.push(["order", column, options]);
            return Promise.resolve(response);
          },
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve(response).then(resolve);
          },
        };
        return query;
      },
      rpc(name: string, parameters: unknown) {
        calls.push(["rpc", name, parameters]);
        return Promise.resolve(
          options.rpcResponse ?? {
            data: { status: "applied", version: 1 },
            error: null,
          },
        );
      },
      storage: {
        from(bucket: string) {
          calls.push(["storage.from", bucket]);
          return {
            upload(path: string, blob: Blob, uploadOptions: unknown) {
              calls.push(["storage.upload", path, blob, uploadOptions]);
              return Promise.resolve(
                options.uploadResponse ?? { data: { path }, error: null },
              );
            },
          };
        },
      },
      auth: {
        getUser() {
          calls.push(["auth.getUser"]);
          return Promise.resolve({
            data: {
              user: {
                id:
                  options.authUserId ??
                  "11111111-1111-4111-8111-111111111111",
              },
            },
            error: null,
          });
        },
      },
    },
  };
}

describe("cloud repositories", () => {
  it("returns null when cloud configuration did not create a client", () => {
    expect(createCloudRepositories(null)).toBeNull();
  });

  it("reads only published, non-deleted techniques", async () => {
    const technique = starterTechniques[0];
    const scripted = createScriptedClient({
      techniques: { data: [toCloudTechnique(technique)], error: null },
    });
    const repositories = createCloudRepositories(scripted.client as never);

    await expect(repositories?.techniques.listPublished()).resolves.toEqual([
      technique,
    ]);
    expect(scripted.calls).toContainEqual(["eq", "published", true]);
    expect(scripted.calls).toContainEqual(["is", "deleted_at", null]);
  });

  it("reads private prompts through the authenticated RLS boundary", async () => {
    const prompt: SavedPrompt = {
      id: "prompt-1",
      name: "Saved prompt",
      mode: "image",
      platform: "generic-image",
      input: {
        mode: "image",
        platform: "generic-image",
        subject: "subject",
        action: "action",
        environment: "studio",
        shotSize: "close-up",
        angle: "eye-level",
        lens: "85mm",
        movement: "static",
        lighting: "soft",
        composition: "centered",
        mood: "calm",
        aspectRatio: "16:9",
        duration: "",
        pacing: "",
      },
      generatedPrompt: "generated",
      editedPrompt: "edited",
      isFavorite: false,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T01:00:00.000Z",
    };
    const scripted = createScriptedClient({
      saved_prompts: {
        data: [
          toCloudSavedPrompt(
            prompt,
            "11111111-1111-4111-8111-111111111111",
          ),
        ],
        error: null,
      },
    });

    await expect(
      createCloudRepositories(scripted.client as never)?.prompts.listMine(),
    ).resolves.toEqual([upgradeSavedPrompt(prompt)]);
    expect(scripted.calls).toContainEqual(["from", "saved_prompts"]);
  });

  it("throws a typed safe error without exposing raw credentials", async () => {
    const scripted = createScriptedClient({
      techniques: {
        data: null,
        error: {
          code: "42501",
          message: "denied with bearer secret-token-value",
        },
      },
    });
    const promise = createCloudRepositories(
      scripted.client as never,
    )?.techniques.listPublished();

    await expect(promise).rejects.toMatchObject({
      name: "CloudRepositoryError",
      code: "42501",
      operation: "techniques.listPublished",
    });
    await expect(promise).rejects.not.toThrow("secret-token-value");
    await expect(promise).rejects.toBeInstanceOf(CloudRepositoryError);
  });

  it("sends versioned owner changes through the fixed RPC", async () => {
    const scripted = createScriptedClient({});
    const technique = starterTechniques[0];
    const repositories = createCloudRepositories(scripted.client as never);

    await expect(
      repositories?.techniques.upsert(
        technique,
        3,
        "22222222-2222-4222-8222-222222222222",
      ),
    ).resolves.toEqual({ status: "applied", version: 1 });

    expect(scripted.calls).toContainEqual([
      "rpc",
      "apply_framecraft_operation",
      expect.objectContaining({
        p_entity: "technique",
        p_entity_id: technique.id,
        p_action: "upsert",
        p_base_version: 3,
        p_operation_id: "22222222-2222-4222-8222-222222222222",
        p_payload: expect.objectContaining({ title_en: technique.titleEn }),
      }),
    ]);
  });

  it("uploads an image before committing its metadata", async () => {
    const scripted = createScriptedClient({});
    const repositories = createCloudRepositories(scripted.client as never);
    const record = {
      id: "media-close-up",
      techniqueId: "shot-close-up",
      blob: new Blob(["image"], { type: "image/webp" }),
      mimeType: "image/webp",
      width: 1200,
      height: 800,
      byteSize: 5,
      altTh: "Close-up",
      altEn: "Close-up",
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    };

    await repositories?.media.upload(
      record,
      "11111111-1111-4111-8111-111111111111",
      null,
      "33333333-3333-4333-8333-333333333333",
    );

    expect(scripted.calls[0]).toEqual(["storage.from", "technique-images"]);
    expect(scripted.calls[1]?.slice(0, 2)).toEqual([
      "storage.upload",
      "11111111-1111-4111-8111-111111111111/shot-close-up/media-close-up.webp",
    ]);
    expect(scripted.calls[2]).toEqual([
      "rpc",
      "apply_framecraft_operation",
      expect.objectContaining({
        p_entity: "media",
        p_entity_id: "media-close-up",
        p_action: "upsert",
      }),
    ]);
  });

  it("uses the authenticated user ID when saving a private prompt", async () => {
    const scripted = createScriptedClient(
      {},
      { authUserId: "44444444-4444-4444-8444-444444444444" },
    );
    const prompt: SavedPrompt = {
      id: "prompt-private",
      name: "Private prompt",
      mode: "image",
      platform: "generic-image",
      input: {
        mode: "image",
        platform: "generic-image",
        subject: "subject",
        action: "action",
        environment: "studio",
        shotSize: "close-up",
        angle: "eye-level",
        lens: "85mm",
        movement: "static",
        lighting: "soft",
        composition: "centered",
        mood: "calm",
        aspectRatio: "16:9",
        duration: "",
        pacing: "",
      },
      generatedPrompt: "generated",
      editedPrompt: "edited",
      isFavorite: false,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    };

    await createCloudRepositories(scripted.client as never)?.prompts.upsertMine(
      prompt,
      null,
      "55555555-5555-4555-8555-555555555555",
    );

    expect(scripted.calls).toContainEqual(["auth.getUser"]);
    expect(scripted.calls).toContainEqual([
      "rpc",
      "apply_framecraft_operation",
      expect.objectContaining({
        p_entity: "prompt",
        p_payload: expect.objectContaining({
          user_id: "44444444-4444-4444-8444-444444444444",
        }),
      }),
    ]);
  });
});
