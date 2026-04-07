import './App.css'
import { useEffect, useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { MidiChannelProvider } from '@/context/MidiChannelContext'
import { MidiPortProvider } from '@/context/MidiPortContext'
import PresetManager from '@/components/PresetManager'
import { queryClient } from '@/utils/queryClient'
import { SearchFilterProvider } from '@/context/SearchFilterContext'
import { ToastProvider, useToast } from '@/context/ToastContext'
import Button from '@/components/Button'
import { acceptFactoryPresetsOnboarding, declineFactoryPresetsOnboarding, ensureFactoryPresetsOnFirstUse } from '@/lib/presets/presetManager'
import { refreshOnlineAuthSession } from '@/lib/auth/onlineAuthSession'
import { saveOnlineSyncSettings } from '@/lib/sync/onlineSyncSettings'
import { configurePresetSyncAdapterFromSettings } from '@/lib/sync/remotePresetSyncAdapter'

function AppInner() {
  const { notifySuccess, notifyInfo } = useToast()
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

  useEffect(() => {
    // Handle OAuth popup callback — close popup and notify parent
    if (
      window.opener &&
      new URLSearchParams(window.location.search).get('auth_popup') === '1'
    ) {
      try {
        window.opener.postMessage(
          { type: 'auth_complete' },
          window.location.origin,
        )
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
      } else {
        notifyInfo('Factory presets are already in your library.')
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
            <h3 className="text-lg font-bold">
              Welcome to CZ101 Presets Library
            </h3>
            <p className="py-2 text-sm opacity-80">
              Load factory presets (Temple of CZ) into your local library? You
              can add them later from Settings.
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
