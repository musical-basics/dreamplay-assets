"use server"

import { createHash } from "crypto"
import { getSupabase } from "@/lib/supabase/server"

// ─── Types ─────────────────────────────────────────────
export type AssetType = "image" | "video" | "document"
export type AssetRole = "master" | "derivative"

export interface MediaAsset {
    id: string
    filename: string
    folder_path: string
    storage_hash: string
    public_url: string
    size?: number
    is_deleted: boolean
    created_at: string
    asset_type: AssetType
    role: AssetRole
    parent_id: string | null
    usage_score: number
    category_id: string | null
    description: string | null
    is_starred: boolean
}

// ─── Upload — Content-Addressable (SHA-256 hash) ──────
export async function uploadHashedAsset(
    formData: FormData,
    folderPath: string,
    assetType: AssetType = "image",
    categoryId?: string
) {
    const supabase = getSupabase()
    const file = formData.get("file") as File
    if (!file) return { success: false, error: "No file provided" }

    // 1. Hash file content → deterministic filename
    const buffer = await file.arrayBuffer()
    const hashHex = createHash("sha256")
        .update(Buffer.from(buffer))
        .digest("hex")
    const ext = file.name.substring(file.name.lastIndexOf("."))
    const storageFilename = `${hashHex}${ext}`

    // 2. Upload to bucket (silently deduplicates — upsert: false ignores if exists)
    const bucket = assetType === "video" ? "chat-assets" : "email-assets"
    await supabase.storage
        .from(bucket)
        .upload(storageFilename, Buffer.from(buffer), {
            contentType: file.type,
            upsert: false,
        })

    // 3. Build permanent public URL
    const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storageFilename)

    // 4. Create DB record — direct human uploads are always 'master'
    const { data, error } = await supabase
        .from("media_assets")
        .insert({
            filename: file.name,
            folder_path: folderPath || "",
            storage_hash: storageFilename,
            public_url: urlData.publicUrl,
            size: file.size,
            is_deleted: false,
            asset_type: assetType,
            role: "master" as AssetRole,
            usage_score: 0,
            category_id: categoryId || null,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, asset: data as MediaAsset }
}

// ─── Upload Derivative (for remote cropper calls) ─────
export async function uploadDerivative(
    formData: FormData,
    parentId: string
) {
    const supabase = getSupabase()
    const file = formData.get("file") as File
    if (!file) return { success: false, error: "No file provided" }

    // Hash and upload
    const buffer = await file.arrayBuffer()
    const hashHex = createHash("sha256")
        .update(Buffer.from(buffer))
        .digest("hex")
    const ext = file.name.substring(file.name.lastIndexOf("."))
    const storageFilename = `${hashHex}${ext}`

    await supabase.storage
        .from("email-assets")
        .upload(storageFilename, Buffer.from(buffer), {
            contentType: file.type,
            upsert: false,
        })

    const { data: urlData } = supabase.storage
        .from("email-assets")
        .getPublicUrl(storageFilename)

    // Look up parent to inherit category
    const { data: parent } = await supabase
        .from("media_assets")
        .select("category_id, asset_type")
        .eq("id", parentId)
        .single()

    const { data, error } = await supabase
        .from("media_assets")
        .insert({
            filename: file.name,
            folder_path: "",
            storage_hash: storageFilename,
            public_url: urlData.publicUrl,
            size: file.size,
            is_deleted: false,
            asset_type: parent?.asset_type || "image",
            role: "derivative" as AssetRole,
            parent_id: parentId,
            usage_score: 0,
            category_id: parent?.category_id || null,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, asset: data as MediaAsset }
}

// ─── Soft Delete — bucket files are NEVER removed ─────
export async function deleteAsset(assetId: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .eq("id", assetId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteAssets(assetIds: string[]) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .in("id", assetIds)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Soft Delete Master + Cascade to Derivatives ──────
export async function deleteMasterWithDerivatives(masterId: string) {
    const supabase = getSupabase()

    // Soft-delete all derivatives of this master
    await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .eq("parent_id", masterId)

    // Soft-delete the master itself
    const { error } = await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .eq("id", masterId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Virtual Move — only changes folder_path in DB ────
export async function moveAsset(assetId: string, newFolderPath: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ folder_path: newFolderPath })
        .eq("id", assetId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function moveAssets(assetIds: string[], newFolderPath: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ folder_path: newFolderPath })
        .in("id", assetIds)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Query — fetch assets from DB ─────────────────────

/** Get MASTER assets only (default gallery view) */
export async function getMasterAssets(options?: {
    categoryId?: string
    assetType?: AssetType
    search?: string
    limit?: number
}) {
    const supabase = getSupabase()

    let query = supabase
        .from("media_assets")
        .select("*")
        .eq("is_deleted", false)
        .eq("role", "master")
        .neq("filename", ".folder")
        .order("created_at", { ascending: false })

    if (options?.categoryId) query = query.eq("category_id", options.categoryId)
    if (options?.assetType) query = query.eq("asset_type", options.assetType)
    if (options?.search) {
        query = query.or(
            `filename.ilike.%${options.search}%,description.ilike.%${options.search}%`
        )
    }
    if (options?.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) return { assets: [], error: error.message }
    return { assets: (data || []) as MediaAsset[] }
}

/** Get derivatives for a specific master */
export async function getDerivatives(parentId: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("parent_id", parentId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })

    if (error) return { assets: [], error: error.message }
    return { assets: (data || []) as MediaAsset[] }
}

/** Get ALL assets (masters + derivatives), for admin views */
export async function getAllAssets() {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("is_deleted", false)
        .neq("filename", ".folder")
        .order("created_at", { ascending: false })

    if (error) return []
    return (data || []) as MediaAsset[]
}

// ─── Folder Operations ────────────────────────────────

export async function getFolders() {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("media_assets")
        .select("folder_path")
        .eq("is_deleted", false)
        .neq("folder_path", "")

    if (error) return { folders: [], error: error.message }

    const folderSet = new Set<string>()
    for (const row of data || []) {
        const parts = row.folder_path.split("/")
        if (parts[0]) folderSet.add(parts[0])
    }
    return { folders: Array.from(folderSet).sort() }
}

export async function createFolder(name: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .insert({
            filename: ".folder",
            folder_path: name,
            storage_hash: ".folder",
            public_url: "",
            size: 0,
            is_deleted: false,
        })

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteFolder(name: string) {
    const supabase = getSupabase()

    const { error: exactError } = await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .eq("folder_path", name)
        .eq("is_deleted", false)

    if (exactError) return { success: false, error: exactError.message }

    const { error: subError } = await supabase
        .from("media_assets")
        .update({ is_deleted: true })
        .like("folder_path", `${name}/%`)
        .eq("is_deleted", false)

    if (subError) return { success: false, error: subError.message }
    return { success: true }
}

// ─── Asset Metadata Updates ───────────────────────────

export async function updateAssetDescription(assetId: string, description: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ description })
        .eq("id", assetId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function toggleAssetStar(assetId: string, isStarred: boolean) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ is_starred: isStarred })
        .eq("id", assetId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateAssetCategory(assetId: string, categoryId: string | null) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("media_assets")
        .update({ category_id: categoryId })
        .eq("id", assetId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Usage Score ──────────────────────────────────────

export async function incrementUsageScore(assetIds: string[], sourceApp: string, campaignId?: string) {
    const supabase = getSupabase()

    // Increment usage_score for each asset
    for (const assetId of assetIds) {
        await supabase.rpc("increment_usage_score", { asset_id_input: assetId })

        // Also log the usage event
        await supabase.from("asset_usage_logs").insert({
            asset_id: assetId,
            source_app: sourceApp,
            campaign_id: campaignId || null,
        })
    }

    return { success: true }
}

/** Get top-performing assets by usage score */
export async function getTopAssets(limit: number = 10) {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("is_deleted", false)
        .eq("role", "master")
        .gt("usage_score", 0)
        .order("usage_score", { ascending: false })
        .limit(limit)

    if (error) return []
    return (data || []) as MediaAsset[]
}

// ─── AI Context — condensed for Copilot injection ─────

export async function getAIContext(limit: number = 30) {
    const supabase = getSupabase()

    const { data, error } = await supabase
        .from("media_assets")
        .select("id, public_url, description, filename, usage_score")
        .eq("is_deleted", false)
        .eq("role", "master")
        .eq("is_starred", true)
        .not("description", "is", null)
        .neq("description", "")
        .order("usage_score", { ascending: false })
        .limit(limit)

    if (error || !data) return []

    // Fetch tag names for context
    const assetIds = data.map((a) => a.id)
    let tagMap: Record<string, string[]> = {}
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

    return data.map((a) => ({
        public_url: a.public_url,
        description: a.description,
        filename: a.filename,
        usage_score: a.usage_score,
        tags: tagMap[a.id] || [],
    }))
}

// ─── Derivative Cleanup ──────────────────────────────

/** Get stale derivatives (usage_score = 0, older than 30 days) */
export async function getStaleDerivatives() {
    const supabase = getSupabase()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("is_deleted", false)
        .eq("role", "derivative")
        .eq("usage_score", 0)
        .lt("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true })

    if (error) return []
    return (data || []) as MediaAsset[]
}

// ─── Dashboard Stats ─────────────────────────────────

export async function getDashboardStats() {
    const supabase = getSupabase()

    const [masters, derivatives, videos, topAsset] = await Promise.all([
        supabase
            .from("media_assets")
            .select("id", { count: "exact", head: true })
            .eq("is_deleted", false)
            .eq("role", "master")
            .neq("filename", ".folder"),
        supabase
            .from("media_assets")
            .select("id", { count: "exact", head: true })
            .eq("is_deleted", false)
            .eq("role", "derivative"),
        supabase
            .from("media_assets")
            .select("id", { count: "exact", head: true })
            .eq("is_deleted", false)
            .eq("asset_type", "video"),
        supabase
            .from("media_assets")
            .select("usage_score")
            .eq("is_deleted", false)
            .eq("role", "master")
            .order("usage_score", { ascending: false })
            .limit(1)
            .single(),
    ])

    return {
        masterCount: masters.count || 0,
        derivativeCount: derivatives.count || 0,
        videoCount: videos.count || 0,
        topUsageScore: topAsset.data?.usage_score || 0,
    }
}
