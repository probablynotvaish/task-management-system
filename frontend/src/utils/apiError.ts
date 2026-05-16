import axios from "axios";

type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
};

function isApiErrorPayload(data: unknown): data is ApiErrorPayload {
  return typeof data === "object" && data !== null;
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (isApiErrorPayload(data)) {
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  return fallbackMessage;
}