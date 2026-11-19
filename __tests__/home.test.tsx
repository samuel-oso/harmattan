import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("Home", () => {
  it("names the project and says where the data comes from", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Harmattan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open-Meteo" })).toHaveAttribute("href", "https://open-meteo.com/");
  });
});
