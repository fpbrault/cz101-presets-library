CREATE TABLE "preset_library" (
	"owner_id" text DEFAULT auth.user_id() NOT NULL,
	"presets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preset_library_pkey" PRIMARY KEY("owner_id")
);

-- Row-Level Security: each user can only see and modify their own row
ALTER TABLE preset_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY preset_library_select ON preset_library
  FOR SELECT USING (owner_id = auth.user_id());

CREATE POLICY preset_library_insert ON preset_library
  FOR INSERT WITH CHECK (owner_id = auth.user_id());

CREATE POLICY preset_library_update ON preset_library
  FOR UPDATE USING (owner_id = auth.user_id());

CREATE POLICY preset_library_delete ON preset_library
  FOR DELETE USING (owner_id = auth.user_id());

-- Least-privilege grants (app runtime role)
GRANT SELECT, INSERT, UPDATE, DELETE ON preset_library TO authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
