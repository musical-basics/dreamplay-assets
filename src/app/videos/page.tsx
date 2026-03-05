import { Video } from "lucide-react"

export default function VideosPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Video className="h-8 w-8 text-gold" />
                    Video Vault
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage video assets with auto-generated thumbnails and play button overlays.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                    <div className="text-center space-y-3">
                        <Video className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p>Video vault will be built in Phase 4.</p>
                        <p className="text-xs text-muted-foreground/60">
                            Upload .mp4/.mov files, extract thumbnails, and composite play button overlays.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
