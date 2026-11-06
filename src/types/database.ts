export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type VehicleRole = 'owner' | 'viewer';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          created_by: string;
          nickname: string;
          model_name: string;
          model_year: number | null;
          vin: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          nickname?: string;
          model_name?: string;
          model_year?: number | null;
          vin?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          nickname?: string;
          model_name?: string;
          model_year?: number | null;
          vin?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_memberships: {
        Row: {
          vehicle_id: string;
          user_id: string;
          role: VehicleRole;
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          vehicle_id: string;
          user_id: string;
          role?: VehicleRole;
          granted_by?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      grant_vehicle_access: {
        Args: { p_vehicle_id: string; p_user_id: string; p_role: VehicleRole };
        Returns: undefined;
      };
      revoke_vehicle_access: {
        Args: { p_vehicle_id: string; p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: { vehicle_role: VehicleRole };
    CompositeTypes: Record<string, never>;
  };
}
