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
      event_collaborators: {
        Row: {
          can_send_invitations: boolean
          can_view_attendee_info: boolean
          can_view_rsvps: boolean
          created_at: string
          email: string
          event_id: string
          id: string
          invited_by: string
        }
        Insert: {
          can_send_invitations?: boolean
          can_view_attendee_info?: boolean
          can_view_rsvps?: boolean
          created_at?: string
          email: string
          event_id: string
          id?: string
          invited_by: string
        }
        Update: {
          can_send_invitations?: boolean
          can_view_attendee_info?: boolean
          can_view_rsvps?: boolean
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          invited_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          already_image_url: string | null
          bride_name: string | null
          caption_align: string
          caption_font_family: string
          caption_font_size: number
          caption_font_weight: number
          caption_number_color: string
          caption_show_box: boolean
          caption_show_number: boolean
          caption_text_color: string
          caption_x: number
          caption_y: number
          companions_enabled: boolean
          created_at: string
          event_date: string | null
          groom_name: string | null
          host_id: string
          id: string
          invitation_image_url: string | null
          notes: string | null
          number_in_filename: boolean
          number_on_image: boolean
          qr_bg_color: string
          qr_color: string
          qr_ecc: string
          qr_margin: number
          qr_size: number
          qr_x: number
          qr_y: number
          scan_date: string | null
          success_image_url: string | null
          title: string
          venue: string | null
          venue_map_url: string | null
        }
        Insert: {
          already_image_url?: string | null
          bride_name?: string | null
          caption_align?: string
          caption_font_family?: string
          caption_font_size?: number
          caption_font_weight?: number
          caption_number_color?: string
          caption_show_box?: boolean
          caption_show_number?: boolean
          caption_text_color?: string
          caption_x?: number
          caption_y?: number
          companions_enabled?: boolean
          created_at?: string
          event_date?: string | null
          groom_name?: string | null
          host_id: string
          id?: string
          invitation_image_url?: string | null
          notes?: string | null
          number_in_filename?: boolean
          number_on_image?: boolean
          qr_bg_color?: string
          qr_color?: string
          qr_ecc?: string
          qr_margin?: number
          qr_size?: number
          qr_x?: number
          qr_y?: number
          scan_date?: string | null
          success_image_url?: string | null
          title?: string
          venue?: string | null
          venue_map_url?: string | null
        }
        Update: {
          already_image_url?: string | null
          bride_name?: string | null
          caption_align?: string
          caption_font_family?: string
          caption_font_size?: number
          caption_font_weight?: number
          caption_number_color?: string
          caption_show_box?: boolean
          caption_show_number?: boolean
          caption_text_color?: string
          caption_x?: number
          caption_y?: number
          companions_enabled?: boolean
          created_at?: string
          event_date?: string | null
          groom_name?: string | null
          host_id?: string
          id?: string
          invitation_image_url?: string | null
          notes?: string | null
          number_in_filename?: boolean
          number_on_image?: boolean
          qr_bg_color?: string
          qr_color?: string
          qr_ecc?: string
          qr_margin?: number
          qr_size?: number
          qr_x?: number
          qr_y?: number
          scan_date?: string | null
          success_image_url?: string | null
          title?: string
          venue?: string | null
          venue_map_url?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          apology_message: string | null
          caption_text: string | null
          code: string
          companions: number
          created_at: string
          display_number: number | null
          event_id: string
          guest_name: string | null
          host_id: string
          id: string
          invitation_image_url: string | null
          max_scans: number
          phone: string | null
          responded_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          scan_code: string
          scan_count: number
          scanned_at: string | null
          scanned_by: string | null
        }
        Insert: {
          apology_message?: string | null
          caption_text?: string | null
          code?: string
          companions?: number
          created_at?: string
          display_number?: number | null
          event_id: string
          guest_name?: string | null
          host_id: string
          id?: string
          invitation_image_url?: string | null
          max_scans?: number
          phone?: string | null
          responded_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          scan_code?: string
          scan_count?: number
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Update: {
          apology_message?: string | null
          caption_text?: string | null
          code?: string
          companions?: number
          created_at?: string
          display_number?: number | null
          event_id?: string
          guest_name?: string | null
          host_id?: string
          id?: string
          invitation_image_url?: string | null
          max_scans?: number
          phone?: string | null
          responded_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          scan_code?: string
          scan_count?: number
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          created_at: string
          display_name: string | null
          id: string
          invitation_quota: number
          is_assistant_account: boolean
          is_super_admin: boolean
        }
        Insert: {
          approval_status?: string
          created_at?: string
          display_name?: string | null
          id: string
          invitation_quota?: number
          is_assistant_account?: boolean
          is_super_admin?: boolean
        }
        Update: {
          approval_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          invitation_quota?: number
          is_assistant_account?: boolean
          is_super_admin?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_collab_send: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_invitation_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_collaborator: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "host" | "admin"
      rsvp_status: "pending" | "attending" | "declined"
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
  DefaultSchemaCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends DefaultSchemaCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = DefaultSchemaCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : DefaultSchemaCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][DefaultSchemaCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["host", "admin"],
      rsvp_status: ["pending", "attending", "declined"],
    },
  },
} as const
