-- Ensure questionnaires.structure is stored as TEXT containing JSON, converting from possible OID/LOB numeric references.
-- This migration attempts to coerce legacy large-object OID integers into their textual JSON via lo_get if needed.
-- NOTE: lo_get() is available in PostgreSQL when the lo extension is installed. We guard with a DO block.

-- 1) If column already TEXT, keep type but we may have numeric values that are actually JSON OIDs.
-- We heuristically detect rows where structure ~ E'^\\d+$' and try to dereference; if fails, we keep original.

DO $$
DECLARE
    rec RECORD;
    v_text TEXT;
BEGIN
    -- Ensure column is TEXT (if it was OID/BYTEA previously developers may have manually changed mapping).
    -- Using ALTER ... TYPE TEXT will noop if already text.
    BEGIN
        EXECUTE 'ALTER TABLE questionnaires ALTER COLUMN structure TYPE TEXT';
    EXCEPTION WHEN others THEN
        -- ignore type change issues
        NULL;
    END;

    FOR rec IN SELECT id, structure FROM questionnaires WHERE structure ~ '^[0-9]+$' LOOP
        BEGIN
            -- Attempt to read large object if exists
            EXECUTE 'SELECT convert_from(lo_get($1), ''UTF8'')' INTO v_text USING rec.structure::OID;
            IF v_text IS NOT NULL THEN
                UPDATE questionnaires SET structure = v_text WHERE id = rec.id;
            END IF;
        EXCEPTION WHEN others THEN
            -- If we cannot resolve, leave value as-is so validation layer will surface issue on next update.
            NULL;
        END;
    END LOOP;
END$$;
