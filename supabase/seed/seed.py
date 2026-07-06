"""
Seed script — creates one demo branch and one Super Admin account for first login.

Usage:
    cd supabase/seed
    pip install -r requirements.txt
    python seed.py

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
(same values as backend/.env). Uses the Supabase Admin API — never run this
with the anon key.
"""

import os
import sys

from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

SUPER_ADMIN_EMAIL = os.environ.get("SEED_SUPER_ADMIN_EMAIL", "admin@meraki.local")
SUPER_ADMIN_PASSWORD = os.environ.get("SEED_SUPER_ADMIN_PASSWORD", "ChangeMe123!")
SUPER_ADMIN_NAME = os.environ.get("SEED_SUPER_ADMIN_NAME", "Meraki Super Admin")


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.", file=sys.stderr)
        sys.exit(1)

    admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # 1. Demo branch (head office)
    branch = (
        admin.table("branches")
        .insert({"name": "Head Office", "address": "HQ"})
        .execute()
    )
    branch_id = branch.data[0]["id"]
    print(f"Created branch 'Head Office' ({branch_id})")

    # 2. Super admin auth user
    created = admin.auth.admin.create_user(
        {
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD,
            "email_confirm": True,
        }
    )
    user_id = created.user.id
    print(f"Created auth user {SUPER_ADMIN_EMAIL} ({user_id})")

    # 3. Profile row
    admin.table("profiles").insert(
        {
            "id": user_id,
            "branch_id": None,
            "full_name": SUPER_ADMIN_NAME,
            "email": SUPER_ADMIN_EMAIL,
            "role": "super_admin",
            "modules": [
                "dashboard", "enquiry", "enrollment", "batch_management",
                "batch_execution", "curriculum", "expense", "marketing",
                "reports", "user_management", "my_account",
            ],
            "permission_level": "Full Access",
        }
    ).execute()

    print("\nSeed complete.")
    print(f"  Login email:    {SUPER_ADMIN_EMAIL}")
    print(f"  Login password: {SUPER_ADMIN_PASSWORD}")
    print("  Change this password after first login.")


if __name__ == "__main__":
    main()
