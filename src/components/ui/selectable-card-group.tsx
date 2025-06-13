import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardDescription } from '@/components/ui/card'; // Assuming CardDescription might be used
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // For conditional class names

interface SelectableCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectableCardGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectableCardOption[];
  className?: string;
  cardClassName?: string;
  itemClassName?: string; // Not directly used by RadioGroupItem, but could be useful for Label or Card content
}

export const SelectableCardGroup: React.FC<SelectableCardGroupProps> = ({
  value,
  onValueChange,
  options,
  className,
  cardClassName,
  itemClassName, // Consider how to best apply this if needed for content within the card
}) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={cn("grid gap-4", className)} // Default grid, customizable
    >
      {options.map((option) => (
        <Card
          key={option.value}
          className={cn(
            "p-4 cursor-pointer transition-all border-2",
            value === option.value
              ? "border-primary bg-accent/10"
              : "border-transparent hover:shadow-md",
            cardClassName
          )}
          onClick={() => onValueChange(option.value)} // Allow clicking the card itself to select
        >
          <div className="flex items-center space-x-3"> {/* Increased space for icon */}
            {option.icon && <div className="flex-shrink-0 w-6 h-6">{option.icon}</div>}
            <RadioGroupItem value={option.value} id={option.value} className={cn(itemClassName)} />
            <div className="flex flex-col">
              <Label htmlFor={option.value} className="cursor-pointer">
                {option.label}
              </Label>
              {option.description && (
                <CardDescription className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </CardDescription>
              )}
            </div>
          </div>
        </Card>
      ))}
    </RadioGroup>
  );
};
