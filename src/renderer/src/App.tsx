import { ThemeProvider } from './components/theme-provider'
import { StaticLeftBar } from './components/static-left-sidebar/layout'
import { SettingsDialogBase } from './components/settings'
import { AddConnectionDialog } from './components/connections/AddConnectionDialog'

function App(): React.JSX.Element {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <main className="w-full h-full bg-primary">
        <StaticLeftBar />
      </main>

      {/* Modals or others */}
      <SettingsDialogBase />
      <AddConnectionDialog />
    </ThemeProvider>
  )
}

export default App
