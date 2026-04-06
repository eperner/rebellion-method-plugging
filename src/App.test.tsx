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

  it("allows decimal entry in advanced mixed string fields", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "Show advanced" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Add segment" })[0]);

    const innerDiameterInputs = screen.getAllByLabelText("Inner diameter in");
    const firstInnerDiameter = innerDiameterInputs[0];

    await user.type(firstInnerDiameter, "4.125");

    expect(firstInnerDiameter).toHaveValue("4.125");

    await user.clear(firstInnerDiameter);
    await user.type(firstInnerDiameter, "3.875");

    expect(firstInnerDiameter).toHaveValue("3.875");
  });
});
