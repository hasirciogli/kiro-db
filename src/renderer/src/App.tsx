import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'
import { Button } from './components/ui/button'
import { ThemeProvider } from './components/theme-provider'
import { StaticLayoutSidebarItem } from './components/static-left-sidebar/item'
import { StaticLeftBar } from './components/static-left-sidebar/layout'
import { SettingsDialogBase } from './components/settings'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <main className="w-full h-full bg-primary">
        <StaticLeftBar />
      </main>

      {/* Modals or others */}
      <SettingsDialogBase />
    </ThemeProvider>
  )
}

export default App
