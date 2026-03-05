import { Settings } from "lucide-react"

export default function ApiSettingsPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Settings className="h-8 w-8 text-gold" />
                    API Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Configure API keys, CORS domains, and view endpoint documentation.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold">Endpoints</h2>
                <div className="space-y-3">
                    {[
                        {
                            method: "GET",
                            path: "/api/assets/search",
                            desc: "Search master assets by category, tags, and query string",
                        },
                        {
                            method: "GET",
                            path: "/api/assets/ai-context",
                            desc: "Condensed JSON of top-scoring masters for AI Copilot injection",
                        },
                        {
                            method: "POST",
                            path: "/api/assets/log-usage",
                            desc: "Increment usage_score and log deployment events",
                        },
                        {
                            method: "POST",
                            path: "/api/upload-derivative",
                            desc: "Upload a cropped/resized derivative linked to a parent master",
                        },
                    ].map((ep) => (
                        <div
                            key={ep.path}
                            className="flex items-start gap-3 bg-muted/30 border border-border rounded-lg px-4 py-3"
                        >
                            <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${ep.method === "GET"
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : "bg-amber-500/15 text-amber-400"
                                    }`}
                            >
                                {ep.method}
                            </span>
                            <div>
                                <p className="text-sm font-mono text-foreground">
                                    {ep.path}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {ep.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-2">
                    Allowed Origins (CORS)
                </h2>
                <p className="text-sm text-muted-foreground">
                    CORS configuration will be implemented in Phase 8.
                    Endpoints will be restricted to company domains only.
                </p>
            </div>
        </div>
    )
}
