import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const formData = await request.formData()
        const file = formData.get("file") as File
        const parentId = formData.get("parent_id") as string

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            )
        }

        if (!parentId) {
            return NextResponse.json(
                { success: false, error: "parent_id is required" },
                { status: 400 }
            )
        }

        // 1. Verify the parent exists and is a master
        const { data: parent, error: parentError } = await supabase
            .from("media_assets")
            .select("id, category_id, asset_type")
            .eq("id", parentId)
            .eq("is_deleted", false)
            .single()

        if (parentError || !parent) {
            return NextResponse.json(
                { success: false, error: "Parent asset not found" },
                { status: 404 }
            )
        }

        // 2. Hash the file content → deterministic filename
        const buffer = await file.arrayBuffer()
        const hashHex = createHash("sha256")
            .update(Buffer.from(buffer))
            .digest("hex")
        const ext = file.name.substring(file.name.lastIndexOf("."))
        const storageFilename = `${hashHex}${ext}`

        // 3. Upload to bucket
        await supabase.storage
            .from("email-assets")
            .upload(storageFilename, Buffer.from(buffer), {
                contentType: file.type,
                upsert: false,
            })

        // 4. Build permanent public URL
        const { data: urlData } = supabase.storage
            .from("email-assets")
            .getPublicUrl(storageFilename)

        // 5. Insert as derivative with parent reference
        const { data, error } = await supabase
            .from("media_assets")
            .insert({
                filename: file.name,
                folder_path: "",
                storage_hash: storageFilename,
                public_url: urlData.publicUrl,
                size: file.size,
                is_deleted: false,
                asset_type: parent.asset_type || "image",
                role: "derivative",
                parent_id: parentId,
                usage_score: 0,
                category_id: parent.category_id || null,
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, asset: data })
    } catch (err) {
        console.error("Derivative upload error:", err)
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        )
    }
}
