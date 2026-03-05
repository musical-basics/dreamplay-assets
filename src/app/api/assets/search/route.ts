import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

/**
 * GET /api/assets/search
 *
 * Query params:
 *   q        — search filename/description (optional)
 *   category — category slug or id (optional)
 *   tag      — tag name or id, can repeat (optional)
 *   type     — asset_type filter: image | video | document (optional)
 *   role     — master | derivative (default: master)
 *   starred  — true to only show starred assets (optional)
 *   limit    — max results (default: 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const q = searchParams.get("q")
        const category = searchParams.get("category")
        const tags = searchParams.getAll("tag")
        const type = searchParams.get("type")
        const role = searchParams.get("role") || "master"
        const starred = searchParams.get("starred")
        const limit = parseInt(searchParams.get("limit") || "50", 10)

        let query = supabase
            .from("media_assets")
            .select("*")
            .eq("is_deleted", false)
            .eq("role", role)
            .neq("filename", ".folder")
            .order("usage_score", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 200))

        // Search
        if (q) {
            query = query.or(
                `filename.ilike.%${q}%,description.ilike.%${q}%`
            )
        }

        // Category filter (support both id and slug)
        if (category) {
            // Check if it's a UUID (category id) or slug
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category)
            if (isUuid) {
                query = query.eq("category_id", category)
            } else {
                // Lookup category by slug
                const { data: catData } = await supabase
                    .from("asset_categories")
                    .select("id")
                    .eq("slug", category)
                    .single()
                if (catData) {
                    query = query.eq("category_id", catData.id)
                }
            }
        }

        // Type filter
        if (type && ["image", "video", "document"].includes(type)) {
            query = query.eq("asset_type", type)
        }

        // Starred filter
        if (starred === "true") {
            query = query.eq("is_starred", true)
        }

        const { data: assets, error } = await query

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        let results = assets || []

        // Tag filter – applied post-query since it spans a join table
        if (tags.length > 0) {
            // Get all tag links
            const assetIds = results.map((a) => a.id)
            if (assetIds.length > 0) {
                // Resolve tag names to IDs if needed
                const resolvedTagIds: string[] = []
                for (const tag of tags) {
                    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag)
                    if (isUuid) {
                        resolvedTagIds.push(tag)
                    } else {
                        const { data: tagData } = await supabase
                            .from("asset_tags")
                            .select("id")
                            .eq("name", tag)
                            .single()
                        if (tagData) resolvedTagIds.push(tagData.id)
                    }
                }

                if (resolvedTagIds.length > 0) {
                    const { data: links } = await supabase
                        .from("asset_tag_links")
                        .select("asset_id")
                        .in("asset_id", assetIds)
                        .in("tag_id", resolvedTagIds)

                    const matchingIds = new Set((links || []).map((l) => l.asset_id))
                    results = results.filter((a) => matchingIds.has(a.id))
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: results.length,
            assets: results,
        })
    } catch (err) {
        console.error("Search API error:", err)
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
    }
}
