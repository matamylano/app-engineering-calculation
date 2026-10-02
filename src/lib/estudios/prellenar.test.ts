import { describe, expect, it } from "vitest";
import { prellenar, urlPrellenado } from "./prellenar";

describe("prellenado", () => {
  const base = { carga: "20", qa: "10", nombre: "Z-1" };
  it("toma solo campos permitidos y números", () => {
    expect(prellenar(base, { carga: "31.5", qa: "abc", nombre: "x", otro: "1" }, ["carga", "qa"])).toEqual({ ...base, carga: "31.5" });
    expect(prellenar(base, {}, ["carga"])).toBeUndefined();
  });
  it("arma la URL", () => {
    expect(urlPrellenado("/civil/zapata", { carga: 20.456, qa: undefined })).toBe("/civil/zapata?carga=20.46");
  });
});
