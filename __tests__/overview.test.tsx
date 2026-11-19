import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Overview } from "@/components/overview";
import type { City } from "@/lib/cities";
import { DataError, fetchSeries } from "@/lib/open-meteo";
import { useView } from "@/lib/store";
import { series } from "./fixtures";

jest.mock("@/lib/open-meteo", () => ({ ...jest.requireActual("@/lib/open-meteo"), fetchSeries: jest.fn() }));

const fetchMock = jest.mocked(fetchSeries);
const LEVELS: Record<string, number> = { kano: 90, lagos: 30, accra: 9 };
const week = (slug: string) => series(new Array(8 * 24).fill(LEVELS[slug] ?? 12), slug);

function show() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Overview />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useView.setState({ ready: true });
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (city: City) => week(city.slug));
});

describe("Overview", () => {
  it("ranks the cities worst first once every one has answered", async () => {
    show();
    expect(await screen.findByText(/2 of 20 cities are above the WHO guideline of 15/)).toBeInTheDocument();
    expect(screen.getByText(/Highest: Kano, at 6\.0× the guideline/)).toBeInTheDocument();

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByRole("link", { name: "Kano" })).toHaveAttribute("href", "/city/kano");
    expect(within(rows[0]).getByText("5× guideline or more")).toBeInTheDocument();
    expect(within(rows[1]).getByRole("link", { name: "Lagos" })).toBeInTheDocument();
    expect(within(rows[1]).getByText("2× guideline or more")).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByRole("link", { name: "Accra" })).toBeInTheDocument();
    expect(within(rows[rows.length - 1]).getByText("Within guideline")).toBeInTheDocument();
  });

  it("keeps the rest of the list when one city fails, and lets that city be tried again", async () => {
    fetchMock.mockImplementation(async (city: City) => {
      if (city.slug === "abuja") throw new DataError("BAD_REQUEST", 400);
      return week(city.slug);
    });
    show();

    expect(await screen.findByText(/2 of 19 cities are above/)).toBeInTheDocument();
    expect(screen.getByText(/1 could not be loaded/)).toBeInTheDocument();
    const failed = screen.getByRole("link", { name: "Abuja" }).closest("li") as HTMLElement;
    expect(within(failed).getByRole("alert")).toHaveTextContent("The data source rejected the request.");

    fetchMock.mockImplementation(async (city: City) => week(city.slug));
    fireEvent.click(within(failed).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/2 of 20 cities are above/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for nothing until the saved choices have been read", () => {
    useView.setState({ ready: false });
    show();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Loading the latest hours: 0 of 20 cities/)).toBeInTheDocument();
  });
});
