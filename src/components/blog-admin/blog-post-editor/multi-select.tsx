import { X } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select items...',
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(value.filter((i) => i !== item));
  };

  const handleSelect = (item: string) => {
    if (value.includes(item)) {
      handleUnselect(item);
    } else {
      onChange([...value, item]);
    }
  };

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[40px] h-auto"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selectedLabels.map((label) => (
              <Badge
                variant="secondary"
                key={label}
                className="mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  const option = options.find((opt) => opt.label === label);
                  if (option) {
                    handleUnselect(option.value);
                  }
                }}
              >
                {label}
                <button
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const option = options.find((opt) => opt.label === label);
                      if (option) {
                        handleUnselect(option.value);
                      }
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const option = options.find((opt) => opt.label === label);
                    if (option) {
                      handleUnselect(option.value);
                    }
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem key={option.value} onSelect={() => handleSelect(option.value)}>
                <div
                  className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                    value.includes(option.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible'
                  }`}
                >
                  <span className="h-4 w-4 flex items-center justify-center">✓</span>
                </div>
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
