/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ReturnsPage from "@/app/es/legal/devoluciones/page";

describe("Política de devoluciones – render", () => {
  it("renders heading and key sections", () => {
    render(<ReturnsPage />);
    expect(
      screen.getByText(/Política de devoluciones y reembolsos \(servicios digitales\)/i)
    ).toBeInTheDocument();
    // Puede aparecer más de una vez (plazo y tiempos de reembolso)
    expect(screen.getAllByText(/14 días/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/NO hay reembolso/i)).toBeInTheDocument();
    expect(screen.getByText(/Cómo solicitar un reembolso/i)).toBeInTheDocument();
  });

  it("contains email and contact form links", () => {
    render(<ReturnsPage />);
    const mailLink = screen.getByRole("link", { name: /contacto@evolve2digital.com/i });
    expect(mailLink).toHaveAttribute("href", "mailto:contacto@evolve2digital.com");
    const formLink = screen.getByRole("link", { name: "/es#contacto" });
    expect(formLink).toHaveAttribute("href", "/es#contacto");
  });
});

describe("Política de devoluciones – snapshots at breakpoints", () => {
  const setViewport = (width: number) => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
  };

  it("snapshots at 360px, 768px, 1024px", () => {
    setViewport(360);
    const snap360 = render(<ReturnsPage />);
    expect(snap360.container).toMatchSnapshot();

    setViewport(768);
    const snap768 = render(<ReturnsPage />);
    expect(snap768.container).toMatchSnapshot();

    setViewport(1024);
    const snap1024 = render(<ReturnsPage />);
    expect(snap1024.container).toMatchSnapshot();
  });
});
