"use client"

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  TrendingUp,
  Image,
  Video,
  Layers,
  Star,
  Loader2,
  ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
import { getDashboardStats, getTopAssets, type MediaAsset } from "@/app/actions/assets"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    masterCount: 0,
    derivativeCount: 0,
    videoCount: 0,
    topUsageScore: 0,
  })
  const [topAssets, setTopAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [s, top] = await Promise.all([
        getDashboardStats(),
        getTopAssets(10),
      ])
      setStats(s)
      setTopAssets(top)
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    {
      label: "Total Masters",
      value: stats.masterCount,
      icon: Image,
      color: "text-gold",
      bg: "bg-gold/10",
    },
    {
      label: "Total Derivatives",
      value: stats.derivativeCount,
      icon: Layers,
      color: "text-violet",
      bg: "bg-violet/10",
    },
    {
      label: "Videos",
      value: stats.videoCount,
      icon: Video,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Top Usage Score",
      value: stats.topUsageScore,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-gold" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your asset library performance and usage.
          </p>
        </div>
        <Link
          href="/gallery"
          className="flex items-center gap-1.5 text-sm text-gold hover:underline"
        >
          Open Gallery <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:shadow-lg hover:shadow-gold/5 transition-shadow"
            >
              <div className={`${stat.bg} p-2.5 rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold mt-0.5">
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Performing Assets */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gold" />
          Top 10 Most Used Assets
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : topAssets.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            No assets have been scored yet. Usage data will appear when assets are deployed to campaigns.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {topAssets.map((asset, i) => (
              <Link
                key={asset.id}
                href="/gallery"
                className="bg-muted/20 border border-border rounded-xl p-3 hover:border-gold/20 hover:shadow-lg hover:shadow-gold/5 transition-all group"
              >
                <div className="aspect-square bg-muted/10 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.public_url}
                    alt={asset.filename}
                    className="max-h-full max-w-full object-contain rounded"
                    loading="lazy"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-gold text-gold-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                  {asset.is_starred && (
                    <Star className="absolute top-1.5 right-1.5 w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  {asset.filename}
                </p>
                <p className="text-xs font-semibold text-gold mt-0.5">
                  Score: {asset.usage_score}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
