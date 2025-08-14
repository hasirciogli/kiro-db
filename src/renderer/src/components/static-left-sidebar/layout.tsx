import { StaticLayoutSidebarItem } from "./item"
import { SettingsButton } from "./settings"

export const StaticLeftBar = () => {
    return (
        <div className="flex flex-col w-14 border-r h-screen bg-sidebar-primary">
            {/* Slide Container */}
            <div className="flex h-full items-start overflow-y-scroll">
                <StaticLayoutSidebarItem />
            </div>


            {/* Footer */}
            <div className="flex w-full aspect-square items-center justify-center">
                <SettingsButton />
            </div>
        </div>
    )
}