/**
 * MainLayout
 * ----------------------------------------------------------------------------
 * Shell layout for every authenticated page. Wires up the global providers:
 *
 *   - ThemeProvider — dark/light mode
 *   - ShopProvider  — active shop and shop switching (multi-shop layer)
 *
 * Renders the persistent Sidebar + Navbar chrome and a flash-message Toast.
 * ----------------------------------------------------------------------------
 */
import Navbar from "@/Components/Navbar";
import Sidebar from "@/Components/Sidebar";
import Toast from "@/Components/Toast";
import { ShopProvider } from "@/Contexts/ShopContext";
import { ThemeProvider } from "@/Contexts/ThemeContext";

/**
 * @param {{ children: React.ReactNode, pageTitle?: string }} props
 * @returns {JSX.Element}
 */
export default function MainLayout({ children, pageTitle = "Overview", isSidebarCollapsed = false }) {
    return (
        <ThemeProvider>
            <ShopProvider>
                <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
                    {!isSidebarCollapsed && <Sidebar />}

                    <div className={isSidebarCollapsed ? "w-full" : "ml-64"}>
                        {!isSidebarCollapsed && <Navbar pageTitle={pageTitle} />}

                        <main className={isSidebarCollapsed ? "p-2" : "p-6"}>{children}</main>
                    </div>

                    {/* Global Toast notifications — reads flash messages from Inertia shared props */}
                    <Toast />
                </div>
            </ShopProvider>
        </ThemeProvider>
    );
}
