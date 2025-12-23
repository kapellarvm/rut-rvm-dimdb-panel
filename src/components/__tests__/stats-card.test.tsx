import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatsCard } from "../shared/stats-card"
import { Router } from "lucide-react"

describe("StatsCard", () => {
  it("should render title and value", () => {
    render(
      <StatsCard title="Total Routers" value={156} icon={Router} />
    )

    expect(screen.getByText("Total Routers")).toBeInTheDocument()
    expect(screen.getByText("156")).toBeInTheDocument()
  })

  it("should render with description", () => {
    render(
      <StatsCard
        title="Total Routers"
        value={156}
        icon={Router}
        description="Active devices"
      />
    )

    expect(screen.getByText("Active devices")).toBeInTheDocument()
  })

  it("should render positive trend", () => {
    render(
      <StatsCard
        title="Total Routers"
        value={156}
        icon={Router}
        trend={{ value: 10, isPositive: true }}
      />
    )

    expect(screen.getByText("+10%")).toBeInTheDocument()
    expect(screen.getByText("son 7 gün")).toBeInTheDocument()
  })

  it("should render negative trend", () => {
    render(
      <StatsCard
        title="Total Routers"
        value={156}
        icon={Router}
        trend={{ value: 5, isPositive: false }}
      />
    )

    expect(screen.getByText("-5%")).toBeInTheDocument()
  })

  it("should render string value", () => {
    render(
      <StatsCard title="Status" value="Active" icon={Router} />
    )

    expect(screen.getByText("Active")).toBeInTheDocument()
  })
})
