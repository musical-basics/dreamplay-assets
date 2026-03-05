import { LayoutDashboard, TrendingUp, Image, Video } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <LayoutDashboard className="h-8 w-8 text-gold" />
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your asset library performance and usage.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Masters",
            value: "—",
            icon: Image,
            color: "text-gold",
            bg: "bg-gold/10",
          },
          {
            label: "Total Derivatives",
            value: "—",
            icon: Image,
            color: "text-violet",
            bg: "bg-violet/10",
          },
          {
            label: "Videos",
            value: "—",
            icon: Video,
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
          },
          {
            label: "Top Usage Score",
            value: "—",
            icon: TrendingUp,
            color: "text-amber-400",
            bg: "bg-amber-400/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5 flex items-start gap-4"
          >
            <div
              className={`${stat.bg} p-2.5 rounded-lg`}
            >
              <stat.icon
                className={`h-5 w-5 ${stat.color}`}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-0.5">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Performing Assets Placeholder */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gold" />
          Top 10 Most Used Assets
        </h2>
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Asset usage data will appear here once the system is connected.
        </div>
      </div>
    </div>
  )
}
