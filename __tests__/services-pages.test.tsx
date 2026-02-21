/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ChatbotPage from "@/app/es/servicios/agente-ia-chatbot/page";
import IntegracionesPage from "@/app/es/servicios/agente-ia-integraciones/page";
import DashboardPage from "@/app/es/servicios/dashboard-agente-ia/page";
import ConsultoriaSmallPage from "@/app/es/servicios/consultoria-proyecto-pequeno/page";
import ConsultoriaMediumPage from "@/app/es/servicios/consultoria-proyecto-mediano/page";
import ConsultoriaLargePage from "@/app/es/servicios/consultoria-proyecto-grande/page";

describe("Servicios pages – render", () => {
  it("agente-ia-chatbot: renders heading, price and CTA", () => {
    const { container } = render(<ChatbotPage />);
    expect(
      screen.getByText(/Agente de IA para chatbot \(pack base\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Precio: 1500€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it("agente-ia-integraciones: renders heading, price and CTA", () => {
    render(<IntegracionesPage />);
    expect(screen.getByText(/Integraciones y acciones extra/i)).toBeInTheDocument();
    expect(screen.getByText(/300€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
  });

  it("dashboard-agente-ia: renders heading, price and CTA", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Dashboard del agente de IA/i)).toBeInTheDocument();
    expect(screen.getByText(/Precio: 1500€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
  });

  it("consultoria-pequeno: renders heading, price and CTA", () => {
    render(<ConsultoriaSmallPage />);
    expect(screen.getByText(/Consultoría – Proyecto pequeño/i)).toBeInTheDocument();
    expect(screen.getByText(/Precio: 500€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
  });

  it("consultoria-mediano: renders heading, price and CTA", () => {
    render(<ConsultoriaMediumPage />);
    expect(screen.getByText(/Consultoría – Proyecto mediano/i)).toBeInTheDocument();
    expect(screen.getByText(/Precio: 1500€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
  });

  it("consultoria-grande: renders heading, price and CTA", () => {
    render(<ConsultoriaLargePage />);
    expect(screen.getByText(/Consultoría – Proyecto grande/i)).toBeInTheDocument();
    expect(screen.getByText(/Precio: 3000€/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Contactar/i })).toBeInTheDocument();
  });
});

describe("Servicios pages – snapshots at breakpoints", () => {
  const setViewport = (width: number) => {
    // jsdom: simulate viewport width
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
    window.dispatchEvent(new Event("resize"));
  };

  it("chatbot page snapshots at 360px, 768px, 1024px", () => {
    setViewport(360);
    const snap360 = render(<ChatbotPage />);
    expect(snap360.container).toMatchSnapshot();

    setViewport(768);
    const snap768 = render(<ChatbotPage />);
    expect(snap768.container).toMatchSnapshot();

    setViewport(1024);
    const snap1024 = render(<ChatbotPage />);
    expect(snap1024.container).toMatchSnapshot();
  });
});

