// Move all the generated database types here
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          atmosphere: string | null
          campaign_length: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          era: string | null
          genre: string | null
          id: string
          location: string | null
          name: string
          setting_details: Json | null
          status: string | null
          thematic_elements: Json | null
          tone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          atmosphere?: string | null
          campaign_length?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          era?: string | null
          genre?: string | null
          id?: string
          location?: string | null
          name: string
          setting_details?: Json | null
          status?: string | null
          thematic_elements?: Json | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          atmosphere?: string | null
          campaign_length?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          era?: string | null
          genre?: string | null
          id?: string
          location?: string | null
          name?: string
          setting_details?: Json | null
          status?: string | null
          thematic_elements?: Json | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      character_equipment: {
        Row: {
          character_id: string | null
          created_at: string | null
          description: string | null
          equipped: boolean | null
          id: string
          item_name: string
          item_type: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          description?: string | null
          equipped?: boolean | null
          id?: string
          item_name: string
          item_type: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          description?: string | null
          equipped?: boolean | null
          id?: string
          item_name?: string
          item_type?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_equipment_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_stats: {
        Row: {
          armor_class: number
          character_id: string | null
          charisma: number
          constitution: number
          created_at: string | null
          current_hit_points: number
          dexterity: number
          id: string
          initiative_bonus: number | null
          intelligence: number
          max_hit_points: number
          speed: number | null
          strength: number
          temporary_hit_points: number | null
          updated_at: string | null
          wisdom: number
        }
        Insert: {
          armor_class: number
          character_id?: string | null
          charisma: number
          constitution: number
          created_at?: string | null
          current_hit_points: number
          dexterity: number
          id?: string
          initiative_bonus?: number | null
          intelligence: number
          max_hit_points: number
          speed?: number | null
          strength: number
          temporary_hit_points?: number | null
          updated_at?: string | null
          wisdom: number
        }
        Update: {
          armor_class?: number
          character_id?: string | null
          charisma?: number
          constitution?: number
          created_at?: string | null
          current_hit_points?: number
          dexterity?: number
          id?: string
          initiative_bonus?: number | null
          intelligence?: number
          max_hit_points?: number
          speed?: number | null
          strength?: number
          temporary_hit_points?: number | null
          updated_at?: string | null
          wisdom?: number
        }
        Relationships: [
          {
            foreignKeyName: "character_stats_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          alignment: string | null
          background: string | null
          class: string
          created_at: string | null
          description: string | null
          experience_points: number | null
          id: string
          level: number | null
          name: string
          race: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alignment?: string | null
          background?: string | null
          class: string
          created_at?: string | null
          description?: string | null
          experience_points?: number | null
          id?: string
          level?: number | null
          name: string
          race: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alignment?: string | null
          background?: string | null
          class?: string
          created_at?: string | null
          description?: string | null
          experience_points?: number | null
          id?: string
          level?: number | null
          name?: string
          race?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      combat_encounters: {
        Row: {
          combat_log: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          initiative_order: Json | null
          location_id: string | null
          session_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          combat_log?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          initiative_order?: Json | null
          location_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          combat_log?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          initiative_order?: Json | null
          location_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "combat_encounters_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combat_encounters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dialogue_history: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          session_id: string | null
          speaker_id: string | null
          speaker_type: string | null
          timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          session_id?: string | null
          speaker_id?: string | null
          speaker_type?: string | null
          timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          session_id?: string | null
          speaker_id?: string | null
          speaker_type?: string | null
          timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dialogue_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["timeline_category"]
          confidence_score: number
          created_at: string | null
          date: string
          description: string | null
          id: string
          impact_analysis: string | null
          timeline_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["timeline_category"]
          confidence_score: number
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          impact_analysis?: string | null
          timeline_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["timeline_category"]
          confidence_score?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          impact_analysis?: string | null
          timeline_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          campaign_id: string | null
          character_id: string | null
          created_at: string | null
          end_time: string | null
          id: string
          session_number: number | null
          start_time: string | null
          status: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          character_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          session_number?: number | null
          start_time?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          character_id?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          session_number?: number | null
          start_time?: string | null
          status?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_media: {
        Row: {
          content: string
          event_id: string
          generated_at: string | null
          id: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          event_id: string
          generated_at?: string | null
          id?: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          event_id?: string
          generated_at?: string | null
          id?: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_media_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          coordinates: Json | null
          created_at: string | null
          description: string | null
          id: string
          location_type: string | null
          name: string
          parent_location_id: string | null
          updated_at: string | null
          world_id: string | null
        }
        Insert: {
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string | null
          name: string
          parent_location_id?: string | null
          updated_at?: string | null
          world_id?: string | null
        }
        Update: {
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          location_type?: string | null
          name?: string
          parent_location_id?: string | null
          updated_at?: string | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          importance: number | null
          metadata: Json | null
          session_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          session_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          importance?: number | null
          metadata?: Json | null
          session_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      npcs: {
        Row: {
          class: string | null
          created_at: string | null
          current_location_id: string | null
          description: string | null
          id: string
          level: number | null
          name: string
          personality: string | null
          race: string | null
          stats: Json | null
          updated_at: string | null
          world_id: string | null
        }
        Insert: {
          class?: string | null
          created_at?: string | null
          current_location_id?: string | null
          description?: string | null
          id?: string
          level?: number | null
          name: string
          personality?: string | null
          race?: string | null
          stats?: Json | null
          updated_at?: string | null
          world_id?: string | null
        }
        Update: {
          class?: string | null
          created_at?: string | null
          current_location_id?: string | null
          description?: string | null
          id?: string
          level?: number | null
          name?: string
          personality?: string | null
          race?: string | null
          stats?: Json | null
          updated_at?: string | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "npcs_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npcs_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      Oversight: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      quest_progress: {
        Row: {
          character_id: string | null
          created_at: string | null
          current_objective: string | null
          id: string
          progress_data: Json | null
          quest_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          character_id?: string | null
          created_at?: string | null
          current_objective?: string | null
          id?: string
          progress_data?: Json | null
          quest_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          character_id?: string | null
          created_at?: string | null
          current_objective?: string | null
          id?: string
          progress_data?: Json | null
          quest_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          prerequisites: Json | null
          quest_type: string | null
          rewards: Json | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          prerequisites?: Json | null
          quest_type?: string | null
          rewards?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          prerequisites?: Json | null
          quest_type?: string | null
          rewards?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      timelines: {
        Row: {
          base_timeline_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_timeline_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_timeline_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timelines_base_timeline_id_fkey"
            columns: ["base_timeline_id"]
            isOneToOne: false
            referencedRelation: "timelines"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          source_file_path: string | null
          tibetan_title: string | null
          title: string
          translation_file_path: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          source_file_path?: string | null
          tibetan_title?: string | null
          title: string
          translation_file_path?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          source_file_path?: string | null
          tibetan_title?: string | null
          title?: string
          translation_file_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      world_factions: {
        Row: {
          created_at: string | null
          description: string | null
          faction_type: string | null
          id: string
          influence_level: number | null
          name: string
          relationships: Json | null
          updated_at: string | null
          world_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          faction_type?: string | null
          id?: string
          influence_level?: number | null
          name: string
          relationships?: Json | null
          updated_at?: string | null
          world_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          faction_type?: string | null
          id?: string
          influence_level?: number | null
          name?: string
          relationships?: Json | null
          updated_at?: string | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_factions_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      world_history: {
        Row: {
          affected_factions: Json | null
          created_at: string | null
          description: string | null
          event_date: string | null
          event_name: string
          id: string
          significance_level: number | null
          updated_at: string | null
          world_id: string | null
        }
        Insert: {
          affected_factions?: Json | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_name: string
          id?: string
          significance_level?: number | null
          updated_at?: string | null
          world_id?: string | null
        }
        Update: {
          affected_factions?: Json | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_name?: string
          id?: string
          significance_level?: number | null
          updated_at?: string | null
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_history_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          campaign_id: string | null
          climate_type: string | null
          created_at: string | null
          description: string | null
          id: string
          magic_level: string | null
          name: string
          technology_level: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          climate_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          magic_level?: string | null
          name: string
          technology_level?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          climate_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          magic_level?: string | null
          name?: string
          technology_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worlds_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      create_tools_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      media_type: "Newspaper" | "Document" | "Photo" | "Video" | "Audio"
      timeline_category:
        | "Technology"
        | "Political"
        | "Cultural"
        | "Economic"
        | "Military"
        | "Scientific"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

