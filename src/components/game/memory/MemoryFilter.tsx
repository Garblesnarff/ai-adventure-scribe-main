import React from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { MEMORY_CATEGORIES } from './memoryConstants';

interface MemoryFilterProps {
  selectedType: string | null;
  onTypeSelect: (type: string | null) => void;
}

/**
 * MemoryFilter Component
 * Provides filtering controls for memory types
 * @param {string | null} selectedType - Currently selected memory type
 * @param {Function} onTypeSelect - Callback for when a type is selected
 */
export const MemoryFilter: React.FC<MemoryFilterProps> = ({ selectedType, onTypeSelect }) => {
  return (
    <div className="p-4 border-b flex gap-2 overflow-x-auto">
      <Button
        variant={selectedType === null ? "default" : "outline"}
        size="sm"
        onClick={() => onTypeSelect(null)}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        All
      </Button>
      {MEMORY_CATEGORIES.map((category) => (
        <Button
          key={category.type}
          variant={selectedType === category.type ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeSelect(category.type)}
          className="flex items-center gap-2"
        >
          {category.icon}
          {category.label}
        </Button>
      ))}
    </div>
  );
};