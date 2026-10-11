import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function MainLayout({ children }) {
    return (
        <div>
            <Navbar />

            <div>
                <Sidebar />

                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}

export default MainLayout;