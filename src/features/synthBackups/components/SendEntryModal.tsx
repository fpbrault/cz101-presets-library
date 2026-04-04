import Button from '@/components/Button'
import SelectInput from '@/components/SelectInput'
import ModalShell from '@/components/ModalShell'
import { SynthBackup } from '@/lib/synthBackupManager'
import { SendModalState } from '@/features/synthBackups/components/SynthBackupsPage.types'

interface SendEntryModalProps {
  selectedBackup: SynthBackup
  sendModalState: SendModalState
  setSendModalState: (state: SendModalState | null) => void
  onSendEntryToSlot: (
    backupId: string,
    entryIndex: number,
    bank: 'internal' | 'cartridge',
    slot: number,
  ) => void
}

export default function SendEntryModal({
  selectedBackup,
  sendModalState,
  setSendModalState,
  onSendEntryToSlot,
}: SendEntryModalProps) {
  return (
    <ModalShell panelClassName="p-4 shadow-lg bg-base-100 rounded-xl w-[24rem]">
        <h2 className="mb-4 text-xl">Send Entry To Slot</h2>
        <div className="flex flex-col gap-3">
          <label className="form-control">
            <span className="label-text">Bank</span>
            <SelectInput
              data-testid="send-entry-bank"
              value={sendModalState.bank}
              onChange={(event) =>
                setSendModalState({
                  ...sendModalState,
                  bank: event.target.value as 'internal' | 'cartridge',
                })
              }
            >
              <option value="internal">Internal</option>
              <option value="cartridge">Cartridge</option>
            </SelectInput>
          </label>

          <label className="form-control">
            <span className="label-text">Slot</span>
            <SelectInput
              data-testid="send-entry-slot"
              value={sendModalState.slot}
              onChange={(event) =>
                setSendModalState({
                  ...sendModalState,
                  slot: Number(event.target.value),
                })
              }
            >
              {Array.from({ length: 16 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </SelectInput>
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setSendModalState(null)}>
            Cancel
          </Button>
          <Button
            variant="info"
            data-testid="send-entry-confirm"
            onClick={() => {
              onSendEntryToSlot(
                selectedBackup.id,
                sendModalState.entryIndex,
                sendModalState.bank,
                sendModalState.slot,
              )
              setSendModalState(null)
            }}
          >
            Send
          </Button>
        </div>
    </ModalShell>
  )
}
