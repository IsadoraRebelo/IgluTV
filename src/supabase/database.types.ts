export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      episode_watches: {
        Row: {
          created_at: string
          episode_number: number
          id: number
          season_number: number
          tmdb_show_id: number
          user_id: string
          watched_on: string | null
        }
        Insert: {
          created_at?: string
          episode_number: number
          id?: never
          season_number: number
          tmdb_show_id: number
          user_id: string
          watched_on?: string | null
        }
        Update: {
          created_at?: string
          episode_number?: number
          id?: never
          season_number?: number
          tmdb_show_id?: number
          user_id?: string
          watched_on?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: number
          is_used: boolean
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: never
          is_used?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: never
          is_used?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          country: string | null
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          country?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          country?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      season_catalogue: {
        Row: {
          aired_count: number
          episode_count: number
          finished_airing: boolean
          season_number: number
          tmdb_show_id: number
          updated_at: string
        }
        Insert: {
          aired_count?: number
          episode_count?: number
          finished_airing?: boolean
          season_number: number
          tmdb_show_id: number
          updated_at?: string
        }
        Update: {
          aired_count?: number
          episode_count?: number
          finished_airing?: boolean
          season_number?: number
          tmdb_show_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      show_catalogue: {
        Row: {
          average_runtime: number | null
          genres: string[]
          markable_episode_count: number
          name: string
          network: string | null
          poster_path: string | null
          tmdb_show_id: number
          updated_at: string
          year: string | null
        }
        Insert: {
          average_runtime?: number | null
          genres?: string[]
          markable_episode_count?: number
          name: string
          network?: string | null
          poster_path?: string | null
          tmdb_show_id: number
          updated_at?: string
          year?: string | null
        }
        Update: {
          average_runtime?: number | null
          genres?: string[]
          markable_episode_count?: number
          name?: string
          network?: string | null
          poster_path?: string | null
          tmdb_show_id?: number
          updated_at?: string
          year?: string | null
        }
        Relationships: []
      }
      show_tracking: {
        Row: {
          created_at: string
          custom_banner_url: string | null
          custom_poster_url: string | null
          is_favourite: boolean
          skip_catch_up_prompt: boolean
          status: number
          tmdb_show_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_banner_url?: string | null
          custom_poster_url?: string | null
          is_favourite?: boolean
          skip_catch_up_prompt?: boolean
          status: number
          tmdb_show_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_banner_url?: string | null
          custom_poster_url?: string | null
          is_favourite?: boolean
          skip_catch_up_prompt?: boolean
          status?: number
          tmdb_show_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finished_seasons: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          finished_on: string
          rewatch: boolean
          season_number: number
          tmdb_show_id: number
        }[]
      }
      finished_shows: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          finished_on: string
          rewatch: boolean
          tmdb_show_id: number
        }[]
      }
      recent_watched_shows: {
        Args: { p_limit: number; p_user_id: string }
        Returns: {
          episode_number: number
          id: number
          season_number: number
          tmdb_show_id: number
          watched_on: string
        }[]
      }
      redeem_invite_code: { Args: { p_code: string }; Returns: boolean }
      season_totals: {
        Args: { p_limit?: number; p_offset?: number; p_show_ids: number[] }
        Returns: {
          aired_total: number
          tmdb_show_id: number
        }[]
      }
      tracking_rows: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          backlog_count: number
          estimated_minutes: number
          last_watched_on: string
          name: string
          network: string
          next_episode: number
          next_season: number
          poster_path: string
          tmdb_show_id: number
        }[]
      }
      upsert_season_catalogue: { Args: { p_rows: Json }; Returns: undefined }
      upsert_show_catalogue: { Args: { p_rows: Json }; Returns: undefined }
      watch_stats: {
        Args: { p_user_id: string; p_year: number }
        Returns: {
          episodes_this_year: number
          finished_shows_count: number
          total_episodes: number
          total_minutes: number
        }[]
      }
      watched_episode_counts: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          tmdb_show_id: number
          watched_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
