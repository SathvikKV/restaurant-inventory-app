"""
Migration: Add UNIQUE constraint on user_tenant_memberships(user_id, tenant_id).
Reads DATABASE_URL from .env automatically.
"""
import asyncio
import asyncpg
import os
import sys

# Load .env from the current directory
try:
    from dotenv import load_dotenv
    load_dotenv(".env")
except ImportError:
    pass  # If dotenv not installed, rely on env vars being set externally

async def main():
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    print(f"Connecting to database...")
    conn = await asyncpg.connect(url)

    try:
        # ── 1. Inspect current constraints ──────────────────────────────────
        print("\n── Current constraints on user_tenant_memberships ──")
        constraints = await conn.fetch("""
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'user_tenant_memberships'
            GROUP BY tc.constraint_name, tc.constraint_type
            ORDER BY tc.constraint_type, tc.constraint_name;
        """)
        if constraints:
            for row in constraints:
                print(f"  [{row['constraint_type']:15}] {row['constraint_name']:50} — {row['columns']}")
        else:
            print("  (no constraints found — table may not exist)")

        # Check if the unique constraint already exists
        already_exists = any(
            "user_id" in row["columns"] and "tenant_id" in row["columns"]
            and row["constraint_type"] == "UNIQUE"
            for row in constraints
        )
        if already_exists:
            print("\n✅ UNIQUE(user_id, tenant_id) already exists — nothing to do.")
            return

        # ── 2. Detect duplicate (user_id, tenant_id) pairs ──────────────────
        print("\n── Checking for duplicate (user_id, tenant_id) rows ──")
        duplicates = await conn.fetch("""
            SELECT user_id, tenant_id, COUNT(*) AS cnt
            FROM public.user_tenant_memberships
            GROUP BY user_id, tenant_id
            HAVING COUNT(*) > 1
            ORDER BY cnt DESC;
        """)

        if not duplicates:
            print("  ✅ No duplicates found — safe to add constraint directly.")
        else:
            print(f"  ⚠️  Found {len(duplicates)} duplicate pair(s):")
            for row in duplicates:
                print(f"     user_id={row['user_id']}  tenant_id={row['tenant_id']}  count={row['cnt']}")

            print("\n── Deduplicating: keeping latest created_at, deleting older rows ──")
            total_deleted = 0
            for row in duplicates:
                rows_to_check = await conn.fetch("""
                    SELECT id, role, created_at
                    FROM public.user_tenant_memberships
                    WHERE user_id = $1 AND tenant_id = $2
                    ORDER BY created_at ASC;
                """, row["user_id"], row["tenant_id"])

                to_keep = rows_to_check[-1]
                to_delete = rows_to_check[:-1]
                for dead_row in to_delete:
                    print(f"     DELETE id={dead_row['id']}  role={dead_row['role']}  created_at={dead_row['created_at']}")
                    print(f"       → keeping id={to_keep['id']}  role={to_keep['role']}  created_at={to_keep['created_at']}")
                    await conn.execute(
                        "DELETE FROM public.user_tenant_memberships WHERE id = $1",
                        dead_row["id"]
                    )
                    total_deleted += 1
            print(f"\n  ✅ Deleted {total_deleted} duplicate row(s).")

        # ── 3. Verify zero duplicates remain ────────────────────────────────
        remaining = await conn.fetchval("""
            SELECT COUNT(*) FROM (
                SELECT user_id, tenant_id
                FROM public.user_tenant_memberships
                GROUP BY user_id, tenant_id
                HAVING COUNT(*) > 1
            ) t;
        """)
        assert remaining == 0, f"Still {remaining} duplicate pairs — aborting"
        print("  ✅ Zero duplicate pairs remain.")

        # ── 4. Add UNIQUE constraint ─────────────────────────────────────────
        print("\n── Adding UNIQUE constraint ──")
        await conn.execute("""
            ALTER TABLE public.user_tenant_memberships
            ADD CONSTRAINT uq_membership_user_tenant
            UNIQUE (user_id, tenant_id);
        """)
        print("  ✅ UNIQUE constraint uq_membership_user_tenant added.")

        # ── 5. Verify ────────────────────────────────────────────────────────
        final_constraints = await conn.fetch("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'user_tenant_memberships'
              AND constraint_type = 'UNIQUE';
        """)
        print("\n── Final UNIQUE constraints on table ──")
        for c in final_constraints:
            print(f"  ✅ {c['constraint_name']}")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
