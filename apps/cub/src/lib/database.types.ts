/**
 * Database types.
 *
 * Hand-written for the tables the app reads today. Once a Supabase project
 * exists, regenerate with:
 *
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 *
 * and delete this note. Keeping it hand-written until then means `npm run
 * typecheck` is meaningful without network access to a live project.
 *
 * Everything below is declared with `type` rather than `interface` on purpose:
 * supabase-js constrains each table to `Record<string, unknown>`, and an
 * interface has no implicit index signature, so interfaces silently fail that
 * constraint and every query degrades to `never`.
 */

export type HouseholdRole = 'mom' | 'dad';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type HouseholdRow = {
  id: string;
  name: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  household_id: string | null;
  role: HouseholdRole | null;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type HouseholdInviteRow = {
  id: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type PregnancyRow = {
  id: string;
  household_id: string;
  edd: string;
  conception_date: string | null;
  dating_offset_days: number;
  ob_name: string | null;
  ob_phone: string | null;
  hospital: string | null;
  er_phone: string | null;
  prepreg_weight_kg: number | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
};

export type WeightLogRow = {
  id: string;
  household_id: string;
  date: string;
  weight_kg: number;
  note: string | null;
  logged_by: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      households: Table<HouseholdRow>;
      profiles: Table<ProfileRow>;
      household_invites: Table<HouseholdInviteRow>;
      pregnancy: Table<PregnancyRow>;
      weight_logs: Table<WeightLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      current_household_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      create_household_and_join: {
        Args: {
          household_name?: string;
          member_role?: HouseholdRole;
          member_display_name?: string | null;
        };
        Returns: string;
      };
      join_household_with_token: {
        Args: { invite_token: string };
        Returns: string;
      };
    };
    Enums: {
      household_role: HouseholdRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
