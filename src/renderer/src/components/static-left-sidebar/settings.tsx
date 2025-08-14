import { SettingsIcon } from "lucide-react"
import { Button } from "../ui/button"
import { useSettings } from "@renderer/hooks/settings"

export const SettingsButton = () => {
    const { open, setOpen } = useSettings() as {
        open: boolean,
        setOpen: (open: boolean) => void
    }

    return (
        <Button onClick={() => setOpen(!open)} className="hover:cursor-pointer">
            <SettingsIcon />
        </Button>
    )
}