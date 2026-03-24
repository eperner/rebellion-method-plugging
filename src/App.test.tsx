import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("app shell", () => {
  it("shows the displacement workflow and calculates with defaults", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Calculate" }));

    expect(screen.getByRole("heading", { name: "Tubing displacement" })).toBeInTheDocument();
    expect(screen.getByText("38.6 bbl")).toBeInTheDocument();
  });
});
