export type AiProviderId = "open" | "openai";

export interface AiProviderAttempt<T> {
  id: AiProviderId;
  model: string;
  execute: () => Promise<T | null | undefined>;
}

export interface AiProviderFailure {
  id: AiProviderId;
  model: string;
  error: unknown;
}

export interface AiProviderSelection<T> {
  data: T;
  provider: AiProviderId;
  model: string;
  fallbackUsed: boolean;
}

export async function runAiProviderChain<T>(
  attempts: AiProviderAttempt<T>[],
  onFailure?: (failure: AiProviderFailure) => void,
  signal?: AbortSignal,
): Promise<AiProviderSelection<T> | null> {
  for (const [index, attempt] of attempts.entries()) {
    signal?.throwIfAborted();

    try {
      const data = await attempt.execute();
      if (data == null) {
        throw new Error("AI provider returned no parsed data.");
      }

      return {
        data,
        provider: attempt.id,
        model: attempt.model,
        fallbackUsed: index > 0,
      };
    } catch (error) {
      // Si el navegador cerró la solicitud, no debemos iniciar el siguiente
      // proveedor (que podría ser el respaldo de pago).
      signal?.throwIfAborted();
      onFailure?.({ id: attempt.id, model: attempt.model, error });
    }
  }

  return null;
}
