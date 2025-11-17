/**
 * ExportButton Component
 *
 * Provides a button to export character data as JSON:
 * - Export button on character sheet
 * - Downloads JSON file with character data
 * - Filename format: "CharacterName_YYYY-MM-DD.json"
 * - Success toast notification
 * - Loading state during export
 */

import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useTRPC } from '@/infrastructure/api/trpc-hooks';

interface ExportButtonProps {
  characterId: string;
  characterName?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

/**
 * Generate filename with current date
 */
const generateFilename = (characterName: string): string => {
  const sanitizedName = characterName.replace(/[^a-z0-9]/gi, '_');
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${sanitizedName}_${date}.json`;
};

/**
 * Download JSON data as file
 */
const downloadJSON = (data: any, filename: string) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * ExportButton component with dropdown options
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  characterId,
  characterName = 'Character',
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'pdf' = 'json') => {
    if (format === 'pdf') {
      toast({
        title: 'Coming Soon',
        description: 'PDF export will be available in a future update.',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Fetch character data via tRPC
      const characterData = await trpc.characters.export.query({ characterId });

      if (!characterData) {
        throw new Error('No character data received');
      }

      // Generate filename and download
      const filename = generateFilename(characterName);
      downloadJSON(characterData, filename);

      toast({
        title: 'Export Successful',
        description: `Character "${characterName}" has been exported to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to export character. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isExporting}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {showLabel && (
            <span className="ml-2">
              {isExporting ? 'Exporting...' : 'Export'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <Download className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Export as JSON</div>
            <div className="text-xs text-muted-foreground">
              For backup or transfer
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled>
          <Download className="mr-2 h-4 w-4" />
          <div>
            <div className="font-medium">Export as PDF</div>
            <div className="text-xs text-muted-foreground">Coming soon</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Simple export button without dropdown (just JSON)
 */
export const SimpleExportButton: React.FC<
  Omit<ExportButtonProps, 'showLabel'>
> = ({ characterId, characterName = 'Character', variant = 'outline', size = 'default', className }) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Fetch character data via tRPC
      const characterData = await trpc.characters.export.query({ characterId });

      if (!characterData) {
        throw new Error('No character data received');
      }

      // Generate filename and download
      const filename = generateFilename(characterName);
      downloadJSON(characterData, filename);

      toast({
        title: 'Export Successful',
        description: `Character exported as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to export character. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Exporting...</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span className="ml-2">Export</span>
        </>
      )}
    </Button>
  );
};

export default ExportButton;
