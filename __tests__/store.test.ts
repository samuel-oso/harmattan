import { MAX_COMPARE, restoreView, useView } from "@/lib/store";

const KEY = "harmattan:view";
const save = (state: unknown) => localStorage.setItem(KEY, JSON.stringify({ state, version: 1 }));

beforeEach(() => {
  localStorage.clear();
  useView.setState({ ready: false, pollutant: "pm2_5", range: "7d", compare: ["lagos", "accra", "nairobi"] });
});

describe("saved view", () => {
  it("brings back valid choices", async () => {
    save({ pollutant: "dust", range: "30d", compare: ["kano", "cairo"] });
    await restoreView();
    expect(useView.getState()).toMatchObject({ ready: true, pollutant: "dust", range: "30d", compare: ["kano", "cairo"] });
  });

  it("drops anything it does not recognise", async () => {
    save({ pollutant: "radon", range: "10y", compare: ["atlantis", "kano", 7], extra: "x" });
    await restoreView();
    const state = useView.getState();
    expect(state).toMatchObject({ ready: true, pollutant: "pm2_5", range: "7d", compare: ["kano"] });
    expect(state).not.toHaveProperty("extra");
  });

  it("falls back to the defaults when what was saved is not readable", async () => {
    localStorage.setItem(KEY, "{not json");
    await restoreView();
    expect(useView.getState()).toMatchObject({ ready: true, range: "7d", compare: ["lagos", "accra", "nairobi"] });
  });
});

describe("comparing cities", () => {
  it("adds up to the limit and never drops the last one", () => {
    const { toggleCompare } = useView.getState();
    toggleCompare("kano");
    toggleCompare("cairo");
    expect(useView.getState().compare).toHaveLength(MAX_COMPARE);
    expect(useView.getState().compare).not.toContain("cairo");

    for (const slug of ["lagos", "accra", "nairobi", "kano"]) toggleCompare(slug);
    expect(useView.getState().compare).toEqual(["kano"]);
  });
});
