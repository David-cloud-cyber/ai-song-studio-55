export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      collab_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          project_id: string | null;
          reason: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          reason: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string;
          id?: string;
          project_id?: string | null;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_jobs: {
        Row: {
          created_at: string;
          credits_spent: number;
          error_message: string | null;
          id: string;
          idempotency_key: string | null;
          kind: string;
          payload: Json | null;
          provider_cost_usd: number;
          provider_credits_spent: number;
          project_id: string | null;
          result: Json | null;
          credits_refunded: number;
          refunded_at: string | null;
          status: string;
          suno_task_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_spent?: number;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind?: string;
          payload?: Json | null;
          provider_cost_usd?: number;
          provider_credits_spent?: number;
          project_id?: string | null;
          result?: Json | null;
          credits_refunded?: number;
          refunded_at?: string | null;
          status?: string;
          suno_task_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_spent?: number;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string | null;
          kind?: string;
          payload?: Json | null;
          provider_cost_usd?: number;
          provider_credits_spent?: number;
          project_id?: string | null;
          result?: Json | null;
          credits_refunded?: number;
          refunded_at?: string | null;
          status?: string;
          suno_task_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_jobs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          color: string | null;
          created_at: string;
          credits: number;
          daily_credits_reset_at: string;
          daily_credits_used: number;
          display_name: string | null;
          handle: string | null;
          id: string;
          initials: string | null;
          language: string | null;
          preferred_mood: string | null;
          preferred_style: string | null;
          preferred_voice: string | null;
          plan: string;
          subscription_status: string;
          subscription_expires_at: string | null;
          subscription_source: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          color?: string | null;
          created_at?: string;
          credits?: number;
          daily_credits_reset_at?: string;
          daily_credits_used?: number;
          display_name?: string | null;
          handle?: string | null;
          id: string;
          initials?: string | null;
          language?: string | null;
          preferred_mood?: string | null;
          preferred_style?: string | null;
          preferred_voice?: string | null;
          plan?: string;
          subscription_status?: string;
          subscription_expires_at?: string | null;
          subscription_source?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          color?: string | null;
          created_at?: string;
          credits?: number;
          daily_credits_reset_at?: string;
          daily_credits_used?: number;
          display_name?: string | null;
          handle?: string | null;
          id?: string;
          initials?: string | null;
          language?: string | null;
          preferred_mood?: string | null;
          preferred_style?: string | null;
          preferred_voice?: string | null;
          plan?: string;
          subscription_status?: string;
          subscription_expires_at?: string | null;
          subscription_source?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_orders: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          cycle: string;
          amount_xaf: number;
          credits_granted: number;
          provider: string;
          provider_reference: string | null;
          provider_status: string;
          status: string;
          created_at: string;
          updated_at: string;
          activated_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: string;
          cycle: string;
          amount_xaf: number;
          credits_granted: number;
          provider?: string;
          provider_reference?: string | null;
          provider_status?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: string;
          cycle?: string;
          amount_xaf?: number;
          credits_granted?: number;
          provider?: string;
          provider_reference?: string | null;
          provider_status?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          activated_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          audio_url: string | null;
          cover_gradient: string | null;
          cover_url: string | null;
          created_at: string;
          duration_seconds: number | null;
          error_message: string | null;
          genre: string | null;
          id: string;
          image_url: string | null;
          instrumental: boolean;
          is_favorite: boolean;
          lyrics: string | null;
          model: string | null;
          mood: string | null;
          parent_project_id: string | null;
          progress: number;
          prompt: string | null;
          status: string;
          stems: Json | null;
          style: string | null;
          suno_audio_id: string | null;
          suno_task_id: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
          video_url: string | null;
          wav_url: string | null;
          voice: string | null;
        };
        Insert: {
          audio_url?: string | null;
          cover_gradient?: string | null;
          cover_url?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          genre?: string | null;
          id?: string;
          image_url?: string | null;
          instrumental?: boolean;
          is_favorite?: boolean;
          lyrics?: string | null;
          model?: string | null;
          mood?: string | null;
          parent_project_id?: string | null;
          progress?: number;
          prompt?: string | null;
          status?: string;
          stems?: Json | null;
          style?: string | null;
          suno_audio_id?: string | null;
          suno_task_id?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id: string;
          video_url?: string | null;
          wav_url?: string | null;
          voice?: string | null;
        };
        Update: {
          audio_url?: string | null;
          cover_gradient?: string | null;
          cover_url?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          genre?: string | null;
          id?: string;
          image_url?: string | null;
          instrumental?: boolean;
          is_favorite?: boolean;
          lyrics?: string | null;
          model?: string | null;
          mood?: string | null;
          parent_project_id?: string | null;
          progress?: number;
          prompt?: string | null;
          status?: string;
          stems?: Json | null;
          style?: string | null;
          suno_audio_id?: string | null;
          suno_task_id?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
          video_url?: string | null;
          wav_url?: string | null;
          voice?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_parent_project_id_fkey";
            columns: ["parent_project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_payment_order: {
        Args: { _amount_xaf: number; _provider_reference: string; _provider_status: string };
        Returns: boolean;
      };
      deduct_credits: {
        Args: { _amount: number; _project_id?: string; _reason: string };
        Returns: number;
      };
      refund_credits: {
        Args: { _amount: number; _project_id?: string; _reason: string; _user_id: string };
        Returns: number;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const;
