import './App.css'
import { useEffect, useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/MidiChannelContext'
import { MidiPortProvider } from '@/MidiPortContext'
import PresetManager from '@/PresetManager'
import { queryClient } from '@/queryClient'
import { SearchFilterProvider } from '@/SearchFilterContext'
import { configurePresetSyncAdapterFromSettings } from '@/lib/remotePresetSyncAdapter'
import {
  acceptFactoryPresetsOnboarding,
  declineFactoryPresetsOnboarding,
  ensureFactoryPresetsOnFirstUse,
} from '@/lib/presetManager'
import { refreshOnlineAuthSession } from '@/lib/onlineAuthSession'
import { saveOnlineSyncSettings } from '@/lib/onlineSyncSettings'
import { ToastProvider, useToast } from '@/ToastContext'
import Button from '@/components/Button'

function AppInner() {
  const { notifySuccess } = useToast()
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

  useEffect(() => {
    // Handle OAuth popup callback — close popup and notify parent
    if (
      window.opener &&
      new URLSearchParams(window.location.search).get('auth_popup') === '1'
    ) {
      try {
        window.opener.postMessage({ type: 'auth_complete' }, window.location.origin)
      } catch {}
      window.close()
      return
    }

    void (async () => {
      const session = await refreshOnlineAuthSession()
      saveOnlineSyncSettings({ enabled: Boolean(session?.userId) })
      configurePresetSyncAdapterFromSettings()

      const onboardingStatus = await ensureFactoryPresetsOnFirstUse()
      if (onboardingStatus === 'needs-confirmation') {
        setShowOnboardingModal(true)
      }
    })()
  }, [])

  const handleAcceptOnboarding = () => {
    setShowOnboardingModal(false)
    void (async () => {
      const loaded = await acceptFactoryPresetsOnboarding()
      if (loaded) {
        await queryClient.invalidateQueries({ queryKey: ['presets'] })
        notifySuccess('Factory presets loaded into your library.')
      }
    })()
  }

  const handleDeclineOnboarding = () => {
    declineFactoryPresetsOnboarding()
    setShowOnboardingModal(false)
  }

  return (
    <>
      <PresetManager />

      {showOnboardingModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Welcome to CZ101 Presets Library</h3>
            <p className="py-2 text-sm opacity-80">
              Load factory presets (Temple of CZ) into your local library? You can add them later
              from Settings.
            </p>
            <div className="modal-action">
              <Button variant="secondary" onClick={handleDeclineOnboarding}>
                Skip
              </Button>
              <Button variant="primary" onClick={handleAcceptOnboarding}>
                Load Factory Presets
              </Button>
            </div>
          </div>
        </dialog>
      )}
    </>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <MidiPortProvider>
          <MidiChannelProvider>
            <SearchFilterProvider>
              <AppInner />
            </SearchFilterProvider>
          </MidiChannelProvider>
        </MidiPortProvider>
      </QueryClientProvider>
    </ToastProvider>
  )
}
