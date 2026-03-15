import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import Toast from '../components/shared/Toast'
import { useToast } from '../hooks/useToast'

import DashboardPanel from '../components/panels/DashboardPanel'
import ChatPanel from '../components/panels/ChatPanel'
import QGenPanel from '../components/panels/QGenPanel'
import EvalPanel from '../components/panels/EvalPanel'
import InteractivePracticePanel from '../components/panels/InteractivePracticePanel'
import CurriculumPanel from '../components/panels/CurriculumPanel'
import { QMasterPanel } from '../components/panels/QMasterPanel'
import { InstitutePanel, AnalyticsPanel } from '../components/panels/OtherPanels'

// ── Panel slot: fills the full content area, scrolls independently ────────
// Using position:absolute + inset:0 is the most reliable cross-browser way
// to make a panel fill its parent without causing double-scroll on mobile.
// The parent container is position:relative + overflow:hidden.
function PanelSlot({ active, children }) {
  return (
    <div style={{
      position:   'absolute',
      inset:      0,
      overflowY:  'auto',
      overflowX:  'hidden',
      // hardware-accelerated scroll on iOS/Android
      WebkitOverflowScrolling: 'touch',
      display:    active ? 'block' : 'none',
    }}>
      {children}
    </div>
  )
}

export default function AppPage() {
  const { activePanel, refreshData } = useApp()
  const { toast, showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { refreshData() }, [])

  const p = { showToast }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content column */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />

        {/* Panel container — position:relative so PanelSlot can use absolute positioning */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <PanelSlot active={activePanel === 'dashboard'           }><DashboardPanel           {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'curriculum'          }><CurriculumPanel          {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'chat'                }><ChatPanel                {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'qgen'                }><QGenPanel                {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'eval'                }><EvalPanel                {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'qmaster'             }><QMasterPanel             {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'interactive-practice'}><InteractivePracticePanel {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'institute'           }><InstitutePanel           {...p} /></PanelSlot>
          <PanelSlot active={activePanel === 'analytics'           }><AnalyticsPanel           {...p} /></PanelSlot>
        </div>
      </div>

      {/* Toast is always fixed top-right — never inside any scroll container */}
      <Toast {...toast} />
    </div>
  )
}
