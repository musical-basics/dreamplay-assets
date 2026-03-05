"use server"

import { getSupabase } from "@/lib/supabase/server"

// ─── Types ─────────────────────────────────────────────
export interface AssetCategory {
    id: string
    name: string
    slug: string
    created_at: string
}

// ─── Category CRUD ────────────────────────────────────

export async function getAllCategories() {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("asset_categories")
        .select("*")
        .order("name")

    if (error) return []
    return data as AssetCategory[]
}

export async function createCategory(name: string, slug: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from("asset_categories")
        .insert({ name: name.trim(), slug: slug.trim() })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, category: data as AssetCategory }
}

export async function updateCategory(id: string, name: string, slug: string) {
    const supabase = getSupabase()
    const { error } = await supabase
        .from("asset_categories")
        .update({ name: name.trim(), slug: slug.trim() })
        .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteCategory(id: string) {
    const supabase = getSupabase()

    // Remove category from assets that reference it
    await supabase
        .from("media_assets")
        .update({ category_id: null })
        .eq("category_id", id)

    const { error } = await supabase
        .from("asset_categories")
        .delete()
        .eq("id", id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

/** Get asset count per category */
export async function getCategoryCounts() {
    const supabase = getSupabase()
    const { data: categories } = await supabase
        .from("asset_categories")
        .select("id, name, slug")
        .order("name")

    if (!categories) return []

    const counts = await Promise.all(
        categories.map(async (cat) => {
            const { count } = await supabase
                .from("media_assets")
                .select("id", { count: "exact", head: true })
                .eq("category_id", cat.id)
                .eq("is_deleted", false)
                .eq("role", "master")

            return { ...cat, count: count || 0 }
        })
    )

    return counts
}
