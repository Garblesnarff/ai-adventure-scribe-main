/**
 * ShareCharacterDialog Component
 *
 * Provides UI for sharing characters with other users:
 * - User search/autocomplete
 * - Permission level selector (viewer/editor/owner)
 * - Token control and sheet editing checkboxes
 * - Add/revoke buttons
 * - Current permissions list with manage options
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Search,
  UserPlus,
  X,
  Eye,
  Edit,
  Crown,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useTRPC, useTRPCUtils } from '@/infrastructure/api/trpc-hooks';
import { PermissionLevel } from '@/types/character';

interface ShareCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterId: string;
  characterName?: string;
}

interface Permission {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  permissionLevel: PermissionLevel;
  grantedAt: string;
}

/**
 * Permission level badge with icon
 */
const PermissionBadge: React.FC<{ level: PermissionLevel }> = ({ level }) => {
  const config = {
    viewer: {
      icon: Eye,
      label: 'Viewer',
      variant: 'secondary' as const,
      color: 'text-blue-500',
    },
    editor: {
      icon: Edit,
      label: 'Editor',
      variant: 'purple' as const,
      color: 'text-purple-500',
    },
    owner: {
      icon: Crown,
      label: 'Owner',
      variant: 'gold' as const,
      color: 'text-amber-500',
    },
  };

  const { icon: Icon, label, variant, color } = config[level];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`h-3 w-3 ${color}`} />
      {label}
    </Badge>
  );
};

/**
 * Main ShareCharacterDialog component
 */
export const ShareCharacterDialog: React.FC<ShareCharacterDialogProps> = ({
  open,
  onOpenChange,
  characterId,
  characterName = 'this character',
}) => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>(
    PermissionLevel.VIEWER
  );
  const [canControlToken, setCanControlToken] = useState(false);
  const [canEditSheet, setCanEditSheet] = useState(false);

  // Fetch current permissions
  const {
    data: permissions,
    isLoading: loadingPermissions,
    refetch: refetchPermissions,
  } = trpc.characters.listPermissions.useQuery(
    { characterId },
    { enabled: open }
  );

  // Share mutation
  const shareMutation = trpc.characters.share.useMutation({
    onSuccess: () => {
      toast({
        title: 'Character Shared',
        description: 'Character has been shared successfully.',
      });
      refetchPermissions();
      setSelectedUserId('');
      setSearchQuery('');
      setPermissionLevel(PermissionLevel.VIEWER);
      setCanControlToken(false);
      setCanEditSheet(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share character. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = trpc.characters.updatePermission.useMutation({
    onSuccess: () => {
      toast({
        title: 'Permission Updated',
        description: 'User permission has been updated.',
      });
      refetchPermissions();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Revoke mutation
  const revokeMutation = trpc.characters.revokePermission.useMutation({
    onSuccess: () => {
      toast({
        title: 'Access Revoked',
        description: 'User access has been revoked.',
      });
      refetchPermissions();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke access. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleShare = () => {
    if (!selectedUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user to share with.',
        variant: 'destructive',
      });
      return;
    }

    shareMutation.mutate({
      characterId,
      targetUserId: selectedUserId,
      permission: permissionLevel,
    });
  };

  const handleRevoke = (userId: string) => {
    revokeMutation.mutate({
      characterId,
      targetUserId: userId,
    });
  };

  const handleUpdatePermission = (userId: string, newPermission: PermissionLevel) => {
    updatePermissionMutation.mutate({
      characterId,
      targetUserId: userId,
      permission: newPermission,
    });
  };

  // Mock user search - in production, this would query your user database
  const mockUsers = [
    { id: 'user1', name: 'John Smith', email: 'john@example.com' },
    { id: 'user2', name: 'Jane Doe', email: 'jane@example.com' },
    { id: 'user3', name: 'Bob Wilson', email: 'bob@example.com' },
  ];

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Character
          </DialogTitle>
          <DialogDescription>
            Share "{characterName}" with other users. Control their permission level and what they
            can do.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add User Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-accent/20">
            <h4 className="font-semibold text-sm">Add People</h4>

            {/* User Search */}
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* User suggestions */}
              {searchQuery && (
                <div className="border rounded-md max-h-48 overflow-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSearchQuery(user.name);
                        }}
                      >
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Permission Level */}
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <Select
                value={permissionLevel}
                onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PermissionLevel.VIEWER}>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">
                          Can view character sheet
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={PermissionLevel.EDITOR}>
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Editor</div>
                        <div className="text-xs text-muted-foreground">
                          Can edit character sheet
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value={PermissionLevel.OWNER}>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Owner</div>
                        <div className="text-xs text-muted-foreground">
                          Full control, can share and delete
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Permissions (for Editor/Owner) */}
            {permissionLevel !== PermissionLevel.VIEWER && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="token-control"
                    checked={canControlToken}
                    onCheckedChange={(checked) => setCanControlToken(checked === true)}
                  />
                  <Label
                    htmlFor="token-control"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Can control character token in battle maps
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sheet-edit"
                    checked={canEditSheet}
                    onCheckedChange={(checked) => setCanEditSheet(checked === true)}
                  />
                  <Label htmlFor="sheet-edit" className="text-sm font-normal cursor-pointer">
                    Can edit character sheet details
                  </Label>
                </div>
              </div>
            )}

            {/* Add Button */}
            <Button
              onClick={handleShare}
              disabled={!selectedUserId || shareMutation.isPending}
              className="w-full"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {shareMutation.isPending ? 'Sharing...' : 'Share Character'}
            </Button>
          </div>

          {/* Current Permissions List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              People with Access
            </h4>

            {loadingPermissions ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-accent/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : permissions && permissions.length > 0 ? (
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {permissions.map((permission: any) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {permission.userName || permission.userId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {permission.userEmail || `Shared ${new Date(permission.grantedAt).toLocaleDateString()}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={permission.permissionLevel}
                          onValueChange={(value) =>
                            handleUpdatePermission(permission.userId, value as PermissionLevel)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PermissionLevel.VIEWER}>Viewer</SelectItem>
                            <SelectItem value={PermissionLevel.EDITOR}>Editor</SelectItem>
                            <SelectItem value={PermissionLevel.OWNER}>Owner</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(permission.userId)}
                          disabled={revokeMutation.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-accent/10">
                No one has access yet. Share this character to collaborate.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareCharacterDialog;
