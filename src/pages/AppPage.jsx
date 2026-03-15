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

// UK Curriculum removed from routing per requirement 1

export default function AppPage() {
  const { me } = useAuth()
  const { activePanel, refreshData } = useApp()
  const { toast, showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { refreshData() }, [])

  const panelProps = { showToast }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />

        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ display: activePanel === 'dashboard'            ? 'block' : 'none', height:'100%', overflowY:'auto' }}><DashboardPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'curriculum'           ? 'block' : 'none', height:'100%', overflowY:'auto' }}><CurriculumPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'chat'                 ? 'block' : 'none', height:'100%', overflowY:'auto' }}><ChatPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'qgen'                 ? 'block' : 'none', height:'100%', overflowY:'auto' }}><QGenPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'eval'                 ? 'block' : 'none', height:'100%', overflowY:'auto' }}><EvalPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'qmaster'              ? 'block' : 'none', height:'100%', overflowY:'auto' }}><QMasterPanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'interactive-practice' ? 'block' : 'none', height:'100%', overflowY:'auto' }}><InteractivePracticePanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'institute'            ? 'block' : 'none', height:'100%', overflowY:'auto' }}><InstitutePanel {...panelProps} /></div>
          <div style={{ display: activePanel === 'analytics'            ? 'block' : 'none', height:'100%', overflowY:'auto' }}><AnalyticsPanel {...panelProps} /></div>
        </div>
      </div>

      <Toast {...toast} />
    </div>
  )
}
