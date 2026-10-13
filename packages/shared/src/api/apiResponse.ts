import type { ApiError } from './apiError';

/** Body of every successful API response. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** Body of every failed API response. */
export interface ApiFailure {
  ok: false;
  error: ApiError;
}

/** Every API response body is exactly one of these two shapes. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Narrows an {@link ApiResponse} to the failure shape. */
export function isApiFailure<T>(response: ApiResponse<T>): response is ApiFailure {
  return !response.ok;
}
