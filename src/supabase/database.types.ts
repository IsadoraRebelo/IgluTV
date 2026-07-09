export type Database = {
  public: {
    Tables: {
      invite_codes: {
        Row: {
          id: number;
          code: string;
          is_used: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          code: string;
          is_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          code?: string;
          is_used?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_invite_code: {
        Args: { p_code: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
