import React from 'react';
import { 
  MapPin, User, Calendar, Package, FileText, 
  MessageSquare, Activity, Eye, Cloud, Star 
} from 'lucide-react';
import { MemoryCategory, MemorySubcategory } from './types';

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  {
    type: 'location',
    label: 'Locations',
    icon: <MapPin className="h-4 w-4" />,
    subcategories: ['current_location', 'previous_location']
  },
  {
    type: 'character',
    label: 'Characters',
    icon: <User className="h-4 w-4" />,
    subcategories: ['npc', 'player']
  },
  {
    type: 'event',
    label: 'Events',
    icon: <Calendar className="h-4 w-4" />,
    subcategories: ['player_action', 'npc_action']
  },
  {
    type: 'item',
    label: 'Items',
    icon: <Package className="h-4 w-4" />,
    subcategories: ['item']
  },
  {
    type: 'general',
    label: 'General',
    icon: <FileText className="h-4 w-4" />,
    subcategories: ['general']
  }
];

export const SUBCATEGORY_ICONS: Record<MemorySubcategory, React.ReactNode> = {
  'current_location': <MapPin className="h-4 w-4" />,
  'previous_location': <MapPin className="h-4 w-4 text-muted-foreground" />,
  'npc': <User className="h-4 w-4" />,
  'player': <Star className="h-4 w-4" />,
  'player_action': <Activity className="h-4 w-4" />,
  'npc_action': <Activity className="h-4 w-4 text-muted-foreground" />,
  'dialogue': <MessageSquare className="h-4 w-4" />,
  'description': <Eye className="h-4 w-4" />,
  'environment': <Cloud className="h-4 w-4" />,
  'item': <Package className="h-4 w-4" />,
  'general': <FileText className="h-4 w-4" />
};