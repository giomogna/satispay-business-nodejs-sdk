import { describe, expect, it } from "vitest";
import { SatispayError } from "../src";

describe("SatispayError.fromResponse", () => {
  it("parses the Satispay error body", async () => {
    const res = new Response(
      JSON.stringify({ code: 41, message: "Forbidden", wlt: "abc-123" }),
      { status: 403, statusText: "Forbidden" },
    );
    const err = await SatispayError.fromResponse(res);
    expect(err).toBeInstanceOf(SatispayError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SatispayError");
    expect(err.status).toBe(403);
    expect(err.code).toBe(41);
    expect(err.wlt).toBe("abc-123");
    expect(err.message).toBe("Forbidden");
    expect(err.body).toEqual({
      code: 41,
      message: "Forbidden",
      wlt: "abc-123",
    });
  });

  it("falls back to statusText when the body is not JSON", async () => {
    const res = new Response("<html>Bad gateway</html>", {
      status: 502,
      statusText: "Bad Gateway",
    });
    const err = await SatispayError.fromResponse(res);
    expect(err.status).toBe(502);
    expect(err.message).toBe("Bad Gateway");
    expect(err.code).toBeUndefined();
    expect(err.wlt).toBeUndefined();
    expect(err.body).toBeUndefined();
  });
});
