import Button from '@/components/ui/Button'
import SelectInput from '@/components/forms/SelectInput'
import { SynthBackup } from '@/lib/collections/synthBackupManager'

interface SynthBackupDetailsHeaderProps {
  selectedBackup: SynthBackup
  restoreBank: 'internal' | 'cartridge'
  isRestoring: boolean
  onRestoreBankChange: (bank: 'internal' | 'cartridge') => void
  onRestoreBackupToSynth: (backupId: string, bank: 'internal' | 'cartridge') => void
  onExportBackup: (backupId: string) => void
  onDeleteBackup: (backupId: string) => void
}

export default function SynthBackupDetailsHeader({
  selectedBackup,
  restoreBank,
  isRestoring,
  onRestoreBankChange,
  onRestoreBackupToSynth,
  onExportBackup,
  onDeleteBackup,
}: SynthBackupDetailsHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-base-content/10 bg-base-200/50">
      <div>
        <div className="text-lg font-bold">{selectedBackup.name}</div>
        <div className="text-xs opacity-70">
          {new Date(selectedBackup.createdAt).toLocaleString()} •{' '}
          {selectedBackup.entries.length} slots
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-52">
          <SelectInput
            selectSize="sm"
            value={restoreBank}
            onChange={(event) =>
              onRestoreBankChange(event.target.value as 'internal' | 'cartridge')
            }
          >
            <option value="internal">Restore to Internal</option>
            <option value="cartridge">Restore to Cartridge</option>
          </SelectInput>
        </div>
        <Button
          variant="accent"
          size="sm"
          disabled={isRestoring}
          onClick={() => onRestoreBackupToSynth(selectedBackup.id, restoreBank)}
        >
          {isRestoring ? 'Restoring...' : 'Restore To Synth'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onExportBackup(selectedBackup.id)}
        >
          Export JSON
        </Button>
        <Button
          variant="error"
          size="sm"
          onClick={() => onDeleteBackup(selectedBackup.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}
