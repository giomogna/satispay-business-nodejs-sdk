/**
 * Shape of the error body returned by the Satispay API.
 *
 * @link https://developers.satispay.com/reference/errors
 */
export interface SatispayErrorBody {
  code?: number;
  message?: string;
  wlt?: string;
}

/**
 * Error thrown when the Satispay API answers with a non-2xx status.
 */
export class SatispayError extends Error {
  /** HTTP status code of the response */
  readonly status: number;
  /** Satispay error code (e.g. `41`), when provided by the API */
  readonly code?: number;
  /** Satispay trace identifier, useful when contacting support */
  readonly wlt?: string;
  /** Parsed JSON body of the response, when available */
  readonly body?: unknown;

  constructor(
    message: string,
    {
      status,
      code,
      wlt,
      body,
    }: { status: number; code?: number; wlt?: string; body?: unknown },
  ) {
    super(message);
    this.name = "SatispayError";
    this.status = status;
    this.code = code;
    this.wlt = wlt;
    this.body = body;
  }

  /**
   * Builds a `SatispayError` from a failed `Response`, falling back to the
   * status text when the body is not Satispay's JSON error format.
   */
  static async fromResponse(response: Response): Promise<SatispayError> {
    let body: unknown;
    try {
      const text = await response.text();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }

    const parsed: SatispayErrorBody =
      body !== null && typeof body === "object" ? body : {};
    const code = typeof parsed.code === "number" ? parsed.code : undefined;
    const wlt = typeof parsed.wlt === "string" ? parsed.wlt : undefined;
    const message =
      typeof parsed.message === "string" && parsed.message
        ? parsed.message
        : response.statusText || `HTTP ${response.status}`;

    return new SatispayError(message, {
      status: response.status,
      code,
      wlt,
      body,
    });
  }
}
