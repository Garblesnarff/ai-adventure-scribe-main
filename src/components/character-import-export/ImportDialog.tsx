/**
 * ImportDialog Component
 *
 * Provides UI for importing characters from JSON files:
 * - File picker for JSON files
 * - Drag-and-drop support
 * - JSON validation
 * - Preview character data
 * - Rename on import option
 * - Import button with loading state
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileJson,
  Check,
  AlertTriangle,
  X,
  User,
  Shield,
  Sword,
  Star,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useTRPC, useTRPCUtils } from '@/infrastructure/api/trpc-hooks';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: (characterId: string) => void;
}

interface CharacterPreview {
  version: string;
  character: {
    name: string;
    description?: string;
    race?: string;
    class?: string;
    level?: number;
    alignment?: string;
    background?: string;
    [key: string]: any;
  };
  stats?: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  exportedAt?: string;
}

/**
 * Main ImportDialog component
 */
export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onOpenChange,
  onImportSuccess,
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterData, setCharacterData] = useState<CharacterPreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');

  // Import mutation
  const importMutation = trpc.characters.import.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Character Imported',
        description: `Character "${importName || characterData?.character.name}" has been imported successfully.`,
      });
      utils.characters.list.invalidate();
      if (onImportSuccess && data?.id) {
        onImportSuccess(data.id);
      }
      handleClose();
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import character. Please check the file format.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setSelectedFile(null);
    setCharacterData(null);
    setValidationError(null);
    setImportName('');
    onOpenChange(false);
  };

  const validateAndParseJSON = (content: string): CharacterPreview | null => {
    try {
      const parsed = JSON.parse(content);

      // Basic validation
      if (!parsed.character || !parsed.character.name) {
        setValidationError('Invalid character file: Missing required character data');
        return null;
      }

      // Check version (optional)
      if (!parsed.version) {
        toast({
          title: 'Warning',
          description: 'This character file does not specify a version. Import may be incomplete.',
        });
      }

      setValidationError(null);
      return parsed as CharacterPreview;
    } catch (error) {
      setValidationError('Invalid JSON file format');
      return null;
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a JSON file.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedData = validateAndParseJSON(content);
      if (parsedData) {
        setCharacterData(parsedData);
        setImportName(parsedData.character.name);
      }
    };
    reader.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to read file.',
        variant: 'destructive',
      });
    };
    reader.readAsText(file);
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = () => {
    if (!characterData) {
      toast({
        title: 'No Character Data',
        description: 'Please select a valid character file to import.',
        variant: 'destructive',
      });
      return;
    }

    // Prepare import data with optional name override
    const importData = {
      ...characterData,
      character: {
        ...characterData.character,
        name: importName || characterData.character.name,
      },
    };

    importMutation.mutate(importData);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Character
          </DialogTitle>
          <DialogDescription>
            Import a character from a JSON file. You can export characters from the character
            sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Area */}
          {!characterData && (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer',
                isDragging
                  ? 'border-infinite-purple bg-infinite-purple/10'
                  : 'border-border hover:border-infinite-purple/50 hover:bg-accent/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <FileJson className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">
                Drop your character file here
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse for a JSON file
              </p>
              <Button variant="outline" type="button">
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </Button>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-sm text-destructive">Validation Error</div>
                <div className="text-sm text-destructive/80 mt-1">{validationError}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedFile(null);
                  setValidationError(null);
                  setCharacterData(null);
                }}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Character Preview */}
          {characterData && !validationError && (
            <div className="space-y-4">
              {/* Success indicator */}
              <div className="flex items-start gap-3 p-4 bg-infinite-teal/10 border border-infinite-teal/30 rounded-lg">
                <Check className="h-5 w-5 text-infinite-teal flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">File Validated</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Character data is valid and ready to import
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    setCharacterData(null);
                  }}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Character Info */}
              <div className="border rounded-lg p-4 bg-accent/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Character Preview
                </h4>

                <div className="space-y-3">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Name</div>
                      <div className="font-medium">{characterData.character.name}</div>
                    </div>
                    {characterData.character.race && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Race</div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-infinite-purple" />
                          {characterData.character.race}
                        </div>
                      </div>
                    )}
                    {characterData.character.class && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Class</div>
                        <div className="flex items-center gap-1">
                          <Sword className="h-3 w-3 text-infinite-gold" />
                          {characterData.character.class}
                        </div>
                      </div>
                    )}
                    {characterData.character.level && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Level</div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-infinite-teal" />
                          {characterData.character.level}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {characterData.character.description && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Description</div>
                      <div className="text-sm line-clamp-2">
                        {characterData.character.description}
                      </div>
                    </div>
                  )}

                  {/* Stats Preview */}
                  {characterData.stats && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Ability Scores</div>
                      <div className="grid grid-cols-6 gap-2">
                        {Object.entries(characterData.stats).map(([stat, value]) => (
                          <div
                            key={stat}
                            className="text-center p-2 bg-background rounded border"
                          >
                            <div className="text-xs font-medium uppercase">
                              {stat.slice(0, 3)}
                            </div>
                            <div className="text-sm font-bold">{value || 10}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export info */}
                  {characterData.exportedAt && (
                    <div className="text-xs text-muted-foreground">
                      Exported: {new Date(characterData.exportedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Rename Option */}
              <div className="space-y-2">
                <Label htmlFor="import-name">Character Name (Optional Rename)</Label>
                <Input
                  id="import-name"
                  placeholder={characterData.character.name}
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to keep the original name
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!characterData || !!validationError || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : 'Import Character'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
