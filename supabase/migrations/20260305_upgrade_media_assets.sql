-- ═══════════════════════════════════════════════════════════════
-- DreamPlay Assets — Schema Upgrade Migration
-- Run this in Supabase SQL Editor manually.
-- This upgrades the shared DB used by dreamplay-blog, dreamplay-email,
-- dreamplay-knowledge, and dreamplay-assets.
-- ═══════════════════════════════════════════════════════════════

-- ─── Step 4: Upgrade media_assets table ─────────────────────
-- Add master/derivative hierarchy, usage scoring, and categorization

-- Asset type column (image, video, document)
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'image'
  CHECK (asset_type IN ('image', 'video', 'document'));

-- Role column (master vs derivative)
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'master'
  CHECK (role IN ('master', 'derivative'));

-- Parent ID for derivative → master relationship
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES media_assets(id);

-- Usage score — incremented when asset is deployed to campaigns
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS usage_score INTEGER DEFAULT 0;

-- Category ID — links to asset_categories
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS category_id UUID;

-- Description column (may already exist from blog repo upgrades)
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Starred flag (may already exist from blog repo upgrades)
ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false;

-- Index for querying derivatives by parent
CREATE INDEX IF NOT EXISTS idx_media_assets_parent ON media_assets(parent_id)
  WHERE parent_id IS NOT NULL;

-- Index for usage score ranking
CREATE INDEX IF NOT EXISTS idx_media_assets_usage ON media_assets(usage_score DESC)
  WHERE is_deleted = false AND role = 'master';

-- Index for asset type filtering
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(asset_type)
  WHERE is_deleted = false;


-- ─── Step 5: Create asset_categories table ──────────────────

CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with initial categories
INSERT INTO asset_categories (name, slug) VALUES
  ('Product Photos', 'product-photos'),
  ('3D Renders', '3d-renders'),
  ('CEO Lionel', 'ceo-lionel'),
  ('Marketing Videos', 'marketing-videos'),
  ('Product Videos', 'product-videos')
ON CONFLICT (slug) DO NOTHING;

-- Add FK constraint from media_assets.category_id → asset_categories.id
-- (Use DO $$ block to avoid error if constraint already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_media_assets_category'
    AND table_name = 'media_assets'
  ) THEN
    ALTER TABLE media_assets
      ADD CONSTRAINT fk_media_assets_category
      FOREIGN KEY (category_id) REFERENCES asset_categories(id);
  END IF;
END$$;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category_id)
  WHERE is_deleted = false;

-- RLS for asset_categories
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select on categories"
  ON asset_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on categories"
  ON asset_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on categories"
  ON asset_categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on categories"
  ON asset_categories FOR DELETE TO authenticated USING (true);


-- ─── Step 6: Verify asset_tags / asset_tag_links ────────────
-- These tables already exist from the blog migration (20260301_create_asset_tags.sql).
-- No changes needed. The asset_tag_links table correctly references
-- media_assets(id) ON DELETE CASCADE.
-- This comment serves as documentation that the mapping is verified.


-- ─── Step 7: Create asset_usage_logs table ──────────────────

CREATE TABLE IF NOT EXISTS asset_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES media_assets(id),
  source_app TEXT NOT NULL,  -- e.g. 'dreamplay-email', 'dreamplay-blog'
  campaign_id TEXT,          -- optional: which campaign/post used it
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying usage history per asset
CREATE INDEX IF NOT EXISTS idx_usage_logs_asset ON asset_usage_logs(asset_id);

-- Index for querying by source app
CREATE INDEX IF NOT EXISTS idx_usage_logs_source ON asset_usage_logs(source_app);

-- RLS for asset_usage_logs
ALTER TABLE asset_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select on usage_logs"
  ON asset_usage_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on usage_logs"
  ON asset_usage_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RPC function for atomic usage_score increment
CREATE OR REPLACE FUNCTION increment_usage_score(asset_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE media_assets
  SET usage_score = usage_score + 1
  WHERE id = asset_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ─── Step 8: Storage Bucket Policies ────────────────────────
-- The existing buckets (email-assets, chat-assets) should have:
--   • Public read access (for serving in emails/blogs)
--   • Authenticated insert/delete (admin only)
--
-- Verify in Supabase Dashboard → Storage → Policies.
-- No SQL changes expected — this step is a manual verification.
-- If policies are missing, uncomment and run:
--
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('email-assets', 'email-assets', true)
--   ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Public read email-assets" ON storage.objects
--   FOR SELECT USING (bucket_id = 'email-assets');
-- CREATE POLICY "Authenticated insert email-assets" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-assets');
