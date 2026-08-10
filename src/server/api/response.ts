// Shared envelope so every endpoint returns the same shape
export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: string;
  fieldErrors?: Record<string, string>;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { success: true, data, error: null };
}

export function apiError(
  error: string,
  fieldErrors?: Record<string, string>,
): ApiFailure {
  return {
    success: false,
    data: null,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}
