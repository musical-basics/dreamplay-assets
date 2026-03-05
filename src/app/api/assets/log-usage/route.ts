import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

/**
 * POST /api/assets/log-usage
 *
 * Body (JSON):
 *   asset_ids    — string[] of asset IDs to increment  (required)
 *   source_app   — e.g. "dreamplay-email" or "dreamplay-blog" (required)
 *   campaign_id  — optional campaign/post identifier
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { asset_ids, source_app, campaign_id } = body

        if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
            return NextResponse.json(
                { success: false, error: "asset_ids is required and must be a non-empty array" },
                { status: 400 }
            )
        }

        if (!source_app || typeof source_app !== "string") {
            return NextResponse.json(
                { success: false, error: "source_app is required" },
                { status: 400 }
            )
        }

        // Process each asset
        const results = await Promise.all(
            asset_ids.map(async (assetId: string) => {
                // Increment usage_score via RPC
                const { error: rpcError } = await supabase.rpc(
                    "increment_usage_score",
                    { asset_id_input: assetId }
                )

                if (rpcError) {
                    return { asset_id: assetId, success: false, error: rpcError.message }
                }

                // Log the usage event
                const { error: logError } = await supabase
                    .from("asset_usage_logs")
                    .insert({
                        asset_id: assetId,
                        source_app: source_app,
                        campaign_id: campaign_id || null,
                    })

                if (logError) {
                    return { asset_id: assetId, success: false, error: logError.message }
                }

                return { asset_id: assetId, success: true }
            })
        )

        const allSuccess = results.every((r) => r.success)

        return NextResponse.json({
            success: allSuccess,
            results,
        })
    } catch (err) {
        console.error("Log usage API error:", err)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
