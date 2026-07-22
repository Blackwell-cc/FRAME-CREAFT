import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CloudMediaRepository,
  CloudMediaRow,
  CloudFavoriteRow,
  CloudSavedPromptRow,
  CloudSettingsRow,
  CloudTechniqueRow,
  OwnerTechniqueRepository,
  PrivatePromptRepository,
  PrivateFavoritesRepository,
  PrivateSettingsRepository,
  SyncApplyResult,
} from "./contracts";
import {
  fromCloudSavedPrompt,
  fromCloudTechnique,
  toCloudMedia,
  toCloudSavedPrompt,
  toCloudSettings,
  toCloudTechnique,
  fromCloudSettings,
} from "./mappers";

interface SupabaseFailure {
  code?: string;
  message?: string;
}

export class CloudRepositoryError extends Error {
  readonly code: string;
  readonly operation: string;

  constructor(operation: string, failure: SupabaseFailure) {
    super(`Cloud operation failed: ${operation}`);
    this.name = "CloudRepositoryError";
    this.code = failure.code ?? "UNKNOWN";
    this.operation = operation;
  }
}

function throwIfError(operation: string, error: SupabaseFailure | null) {
  if (error) throw new CloudRepositoryError(operation, error);
}

function parseSyncResult(operation: string, data: unknown): SyncApplyResult {
  if (typeof data !== "object" || data === null) {
    throw new CloudRepositoryError(operation, { code: "INVALID_RESPONSE" });
  }

  const result = data as Record<string, unknown>;
  if (result.status === "applied" && typeof result.version === "number") {
    return { status: "applied", version: result.version };
  }
  if (
    result.status === "conflict" &&
    typeof result.cloudVersion === "number"
  ) {
    return {
      status: "conflict",
      cloudVersion: result.cloudVersion,
      cloudPayload: result.cloudPayload,
    };
  }
  throw new CloudRepositoryError(operation, { code: "INVALID_RESPONSE" });
}

async function applyOperation(
  client: SupabaseClient,
  parameters: {
    operationId: string;
    entity: "technique" | "media" | "prompt" | "favorite" | "settings";
    entityId: string;
    action: "upsert" | "delete";
    baseVersion: number | null;
    payload: unknown;
  },
) {
  const operation = `${parameters.entity}.${parameters.action}`;
  const { data, error } = await client.rpc("apply_framecraft_operation", {
    p_operation_id: parameters.operationId,
    p_entity: parameters.entity,
    p_entity_id: parameters.entityId,
    p_action: parameters.action,
    p_base_version: parameters.baseVersion,
    p_payload: parameters.payload,
  });
  throwIfError(operation, error);
  return parseSyncResult(operation, data);
}

function extensionForMimeType(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const extension = extensions[mimeType];
  if (!extension) {
    throw new CloudRepositoryError("media.upload", {
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }
  return extension;
}

async function getAuthenticatedUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  throwIfError("auth.getUser", error);
  if (!data.user) {
    throw new CloudRepositoryError("auth.getUser", { code: "NO_SESSION" });
  }
  return data.user.id;
}

export function createCloudRepositories(client: SupabaseClient | null) {
  if (!client) return null;

  const techniques: OwnerTechniqueRepository = {
    async listPublished() {
      const { data, error } = await client
        .from("techniques")
        .select("*")
        .eq("published", true)
        .is("deleted_at", null);

      throwIfError("techniques.listPublished", error);
      return ((data ?? []) as CloudTechniqueRow[]).map(fromCloudTechnique);
    },
    upsert(record, baseVersion, operationId) {
      return applyOperation(client, {
        operationId,
        entity: "technique",
        entityId: record.id,
        action: "upsert",
        baseVersion,
        payload: toCloudTechnique(record),
      });
    },
    remove(id, baseVersion, operationId) {
      return applyOperation(client, {
        operationId,
        entity: "technique",
        entityId: id,
        action: "delete",
        baseVersion,
        payload: {},
      });
    },
  };

  const prompts: PrivatePromptRepository = {
    async listMine() {
      const { data, error } = await client
        .from("saved_prompts")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      throwIfError("prompts.listMine", error);
      return ((data ?? []) as CloudSavedPromptRow[]).map(fromCloudSavedPrompt);
    },
    async upsertMine(record, baseVersion, operationId) {
      const userId = await getAuthenticatedUserId(client);
      return applyOperation(client, {
        operationId,
        entity: "prompt",
        entityId: record.id,
        action: "upsert",
        baseVersion,
        payload: toCloudSavedPrompt(record, userId),
      });
    },
    removeMine(id, baseVersion, operationId) {
      return applyOperation(client, {
        operationId,
        entity: "prompt",
        entityId: id,
        action: "delete",
        baseVersion,
        payload: {},
      });
    },
  };

  const media: CloudMediaRepository = {
    async listPublished() {
      const { data, error } = await client
        .from("media")
        .select("*")
        .is("deleted_at", null);
      throwIfError("media.listPublished", error);
      return (data ?? []) as CloudMediaRow[];
    },
    async upload(record, ownerUserId, baseVersion, operationId) {
      const extension = extensionForMimeType(record.mimeType);
      const storagePath = `${ownerUserId}/${record.techniqueId}/${record.id}.${extension}`;
      const { error: uploadError } = await client.storage
        .from("technique-images")
        .upload(storagePath, record.blob, {
          contentType: record.mimeType,
          upsert: true,
        });
      throwIfError("media.upload", uploadError);

      const cloudRecord = toCloudMedia(record, storagePath);
      const sync = await applyOperation(client, {
        operationId,
        entity: "media",
        entityId: record.id,
        action: "upsert",
        baseVersion,
        payload: cloudRecord,
      });
      return { record: cloudRecord, sync };
    },
    async remove(record, ownerUserId, baseVersion, operationId) {
      const extension = extensionForMimeType(record.mimeType);
      const storagePath = `${ownerUserId}/${record.techniqueId}/${record.id}.${extension}`;
      const sync = await applyOperation(client, {
        operationId,
        entity: "media",
        entityId: record.id,
        action: "delete",
        baseVersion,
        payload: {},
      });
      if (sync.status === "applied") {
        const { error } = await client.storage.from("technique-images").remove([storagePath]);
        throwIfError("media.remove", error);
      }
      return sync;
    },
  };

  const favorites: PrivateFavoritesRepository = {
    async listMine() {
      const { data, error } = await client.from("favorites").select("*");
      throwIfError("favorites.listMine", error);
      return (data ?? []) as CloudFavoriteRow[];
    },
    saveMine(favorite, operationId) {
      return applyOperation(client, {
        operationId,
        entity: "favorite",
        entityId: favorite.entity_id,
        action: "upsert",
        baseVersion: null,
        payload: favorite,
      });
    },
    removeMine(entityType, entityId, operationId) {
      return applyOperation(client, {
        operationId,
        entity: "favorite",
        entityId,
        action: "delete",
        baseVersion: null,
        payload: { entity_type: entityType },
      });
    },
  };

  const settings: PrivateSettingsRepository = {
    async getMine() {
      const { data, error } = await client.from("user_settings").select("*").maybeSingle();
      throwIfError("settings.getMine", error);
      return data ? fromCloudSettings(data as CloudSettingsRow) : null;
    },
    async saveMine(record, baseVersion, operationId) {
      const userId = await getAuthenticatedUserId(client);
      return applyOperation(client, {
        operationId,
        entity: "settings",
        entityId: userId,
        action: "upsert",
        baseVersion,
        payload: toCloudSettings(record, userId),
      });
    },
  };

  return { techniques, prompts, media, favorites, settings };
}
