import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import { useConnectionStore } from '../../stores/connection.store'
import { useBookmarkStore } from '../../stores/bookmark.store'
import { Loader2, User, Key, Check, AlertCircle, Trash2, FolderOpen } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ManualCredentials } from '@shared/types'

interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectionDialog({ open, onOpenChange }: ConnectionDialogProps): JSX.Element {
  const [isMasBuild, setIsMasBuild] = useState(false)
  const {
    profiles,
    savedCredentials,
    connecting,
    error,
    loadProfiles,
    loadSavedCredentials,
    connectProfile,
    connectManual
  } = useConnectionStore()
  const { load: loadBookmarks } = useBookmarkStore()

  useEffect(() => {
    if (open) {
      void window.api.isMasBuild().then(setIsMasBuild)
      loadProfiles()
      loadSavedCredentials()
      // Clear any previous error when dialog opens
      useConnectionStore.setState({ error: null })
    }
  }, [open, loadProfiles, loadSavedCredentials])

  const handleProfileConnect = async (name: string): Promise<void> => {
    await connectProfile(name)
    if (useConnectionStore.getState().connected) {
      loadBookmarks()
      onOpenChange(false)
    }
  }

  const handleManualConnect = async (creds: ManualCredentials): Promise<void> => {
    await connectManual(creds)
    if (useConnectionStore.getState().connected) {
      loadBookmarks()
      onOpenChange(false)
    }
  }

  const handleSavedCredentialConnect = async (id: string): Promise<void> => {
    await useConnectionStore.getState().connectSavedCredential(id)
    if (useConnectionStore.getState().connected) {
      loadBookmarks()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Connect to AWS</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-1">
          <Tabs defaultValue={isMasBuild ? 'manual' : 'profiles'} className="mt-2">
            <TabsList className={cn('grid w-full', isMasBuild ? 'grid-cols-1' : 'grid-cols-2')}>
              {!isMasBuild && (
                <TabsTrigger value="profiles">
                  <User className="h-4 w-4 mr-2" />
                  AWS Profiles
                </TabsTrigger>
              )}
              <TabsTrigger value="manual">
                <Key className="h-4 w-4 mr-2" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {!isMasBuild && (
              <TabsContent value="profiles" className="mt-4">
                <ProfileList
                  profiles={profiles}
                  connecting={connecting}
                  onConnect={handleProfileConnect}
                />
              </TabsContent>
            )}

            <TabsContent value="manual" className="mt-4">
              <ManualCredentialForm
                savedCredentials={savedCredentials}
                connecting={connecting}
                onConnect={handleManualConnect}
                onConnectSaved={handleSavedCredentialConnect}
              />
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Connection Failed</p>
                <p className="text-xs text-destructive/80 mt-0.5 break-words">{error}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProfileList({
  profiles,
  connecting,
  onConnect
}: {
  profiles: import('@shared/types').AwsProfile[]
  connecting: boolean
  onConnect: (name: string) => void
}): JSX.Element {
  const [selectedProfile, setSelectedProfile] = useState<string>('')

  if (profiles.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <p>No AWS profiles available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-48">
        <div className="space-y-1">
          {profiles.map((profile) => (
            <button
              key={profile.name}
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left',
                selectedProfile === profile.name && 'bg-accent ring-1 ring-primary'
              )}
              onClick={() => setSelectedProfile(profile.name)}
              onDoubleClick={() => onConnect(profile.name)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium">{profile.name}</div>
                {profile.region && (
                  <div className="text-xs text-muted-foreground">{profile.region}</div>
                )}
              </div>
              {selectedProfile === profile.name && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
      <Button
        className="w-full"
        disabled={!selectedProfile || connecting}
        onClick={() => onConnect(selectedProfile)}
      >
        {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Connect
      </Button>
    </div>
  )
}

function ManualCredentialForm({
  savedCredentials,
  connecting,
  onConnect,
  onConnectSaved
}: {
  savedCredentials: import('@shared/types').SavedCredential[]
  connecting: boolean
  onConnect: (creds: ManualCredentials) => void
  onConnectSaved: (id: string) => void
}): JSX.Element {
  const [label, setLabel] = useState('')
  const [accessKeyId, setAccessKeyId] = useState('')
  const [secretAccessKey, setSecretAccessKey] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [defaultBucket, setDefaultBucket] = useState('')
  const [defaultPrefix, setDefaultPrefix] = useState('')
  const [saveCredentials, setSaveCredentials] = useState(false)
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const { saveCreds, deleteCreds } = useConnectionStore()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const creds: ManualCredentials = {
      id: crypto.randomUUID(),
      label: label || `Manual (${accessKeyId.slice(0, 8)}...)`,
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken || undefined,
      region,
      defaultBucket: defaultBucket || undefined,
      defaultPrefix: defaultPrefix || undefined
    }
    if (saveCredentials) {
      await saveCreds(creds)
    }
    onConnect(creds)
  }

  const handleDeleteSaved = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.stopPropagation()
    await deleteCreds(id)
    if (selectedSavedId === id) {
      setSelectedSavedId(null)
      setLabel('')
      setAccessKeyId('')
      setRegion('us-east-1')
    }
  }

  const maskAccessKeyId = (keyId: string): string => {
    if (keyId.length <= 8) return keyId
    return `${keyId.slice(0, 4)}...${keyId.slice(-4)}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {savedCredentials.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Saved Credentials (double-click to connect)</label>
          <ScrollArea className="h-24 mt-1.5">
            <div className="space-y-1">
              {savedCredentials.map((sc) => (
                <div
                  key={sc.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors cursor-pointer group',
                    selectedSavedId === sc.id && 'bg-accent ring-1 ring-primary'
                  )}
                  onClick={() => setSelectedSavedId(sc.id)}
                  onDoubleClick={() => onConnectSaved(sc.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sc.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {maskAccessKeyId(sc.accessKeyId)} · {sc.region}
                    </div>
                    {sc.defaultBucket && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <FolderOpen className="h-3 w-3" />
                        <span className="truncate">
                          {sc.defaultBucket}{sc.defaultPrefix ? `/${sc.defaultPrefix}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedSavedId === sc.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <button
                    type="button"
                    className="p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                    onClick={(e) => handleDeleteSaved(e, sc.id)}
                    title="Delete saved credential"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
          {selectedSavedId && (
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              disabled={connecting}
              onClick={() => onConnectSaved(selectedSavedId)}
            >
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Connect with Saved Credentials
            </Button>
          )}
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My AWS Account"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Access Key ID *</label>
        <Input
          value={accessKeyId}
          onChange={(e) => setAccessKeyId(e.target.value)}
          placeholder="AKIA..."
          required
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Secret Access Key *</label>
        <Input
          type="password"
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Session Token (optional)</label>
        <Input
          type="password"
          value={sessionToken}
          onChange={(e) => setSessionToken(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Region *</label>
        <Input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="us-east-1"
          required
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="save-creds"
          checked={saveCredentials}
          onChange={(e) => setSaveCredentials(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="save-creds" className="text-xs text-muted-foreground">
          Save credentials securely
        </label>
      </div>
      {saveCredentials && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">Default location (optional) - auto-navigate on connect</p>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Default Bucket</label>
            <Input
              value={defaultBucket}
              onChange={(e) => setDefaultBucket(e.target.value)}
              placeholder="my-bucket"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Default Path</label>
            <Input
              value={defaultPrefix}
              onChange={(e) => setDefaultPrefix(e.target.value)}
              placeholder="path/to/folder/"
              className="mt-1"
            />
          </div>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={!accessKeyId || !secretAccessKey || connecting}>
        {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Connect
      </Button>
    </form>
  )
}
