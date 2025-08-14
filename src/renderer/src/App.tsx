import { ThemeProvider } from './components/theme-provider'
import { StaticLeftBar } from './components/static-left-sidebar/layout'
import { SettingsDialogBase } from './components/settings'
import { AddConnectionDialog } from './components/connections/AddConnectionDialog'
import { DatabaseSidebar } from './components/database/DatabaseSidebar'
import { MainContainer } from './components/main/MainContainer'
import { Toaster } from './components/ui/sonner'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <main className="w-full h-full bg-primary flex">
        <StaticLeftBar />
        <DatabaseSidebar />
        <MainContainer />
      </main>

      {/* Modals or others */}
      <SettingsDialogBase />
      <AddConnectionDialog />
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  )
}

export default App
