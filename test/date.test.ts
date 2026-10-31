import { describe, expect, it } from "vitest";
import { getFormattedCurrentDate } from "../src/utils/date";

describe("getFormattedCurrentDate", () => {
  it("formats a date as UTC RFC 1123 with numeric offset", () => {
    expect(
      getFormattedCurrentDate(new Date(Date.UTC(2019, 2, 18, 15, 10, 24))),
    ).toBe("Mon, 18 Mar 2019 15:10:24 +0000");
  });

  it("zero-pads day, hours, minutes and seconds", () => {
    expect(
      getFormattedCurrentDate(new Date(Date.UTC(2024, 0, 5, 3, 4, 5))),
    ).toBe("Fri, 05 Jan 2024 03:04:05 +0000");
  });

  it("defaults to the current time", () => {
    expect(getFormattedCurrentDate()).toMatch(
      /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000$/,
    );
  });
});
