import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

/**
 * GET /api/assets/ai-context
 *
 * Returns a condensed JSON payload of top-scoring starred assets
 * designed for injection into AI Copilot prompts.
 *
 * Query params:
 *   limit — max results (default: 30)
 *   category — category slug filter (optional)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get("limit") || "30", 10)
        const category = searchParams.get("category")

        let query = supabase
            .from("media_assets")
            .select("id, public_url, description, filename, usage_score")
            .eq("is_deleted", false)
            .eq("role", "master")
            .eq("is_starred", true)
            .not("description", "is", null)
            .neq("description", "")
            .order("usage_score", { ascending: false })
            .limit(Math.min(limit, 100))

        // Category filter
        if (category) {
            const { data: catData } = await supabase
                .from("asset_categories")
                .select("id")
                .eq("slug", category)
                .single()
            if (catData) {
                query = query.eq("category_id", catData.id)
            }
        }

        const { data, error } = await query

        if (error || !data) {
            return NextResponse.json({
                success: false,
                error: error?.message || "No data",
            }, { status: 500 })
        }

        // Fetch tag names for context
        const assetIds = data.map((a) => a.id)
        let tagMap: Record<string, string[]> = {}

        if (assetIds.length > 0) {
            try {
                const { data: links } = await supabase
                    .from("asset_tag_links")
                    .select("asset_id, tag_id")
                    .in("asset_id", assetIds)

                if (links && links.length > 0) {
                    const tagIds = [...new Set(links.map((l) => l.tag_id))]
                    const { data: tags } = await supabase
                        .from("asset_tags")
                        .select("id, name")
                        .in("id", tagIds)

                    const tagNameMap: Record<string, string> = {}
                    for (const t of tags || []) tagNameMap[t.id] = t.name

                    for (const link of links) {
                        if (!tagMap[link.asset_id]) tagMap[link.asset_id] = []
                        const name = tagNameMap[link.tag_id]
                        if (name) tagMap[link.asset_id].push(name)
                    }
                }
            } catch {
                // Tags tables may not exist yet — silently continue
            }
        }

        // Build condensed payload for AI injection
        const context = data.map((a) => ({
            url: a.public_url,
            desc: a.description,
            file: a.filename,
            score: a.usage_score,
            tags: tagMap[a.id] || [],
        }))

        return NextResponse.json({
            success: true,
            count: context.length,
            context,
        })
    } catch (err) {
        console.error("AI context API error:", err)
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}
