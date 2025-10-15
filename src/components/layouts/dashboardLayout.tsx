import { useState } from 'react';
import {  useDispatch } from 'react-redux';
import {  userLogout } from '../../redux/slices/userSlice';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { ProtectedRoute } from '../layouts/protectedRoutes';
import { LogoutModal } from '../models/logoutModel';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const backgroundImage = '/logo.png';

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    dispatch(userLogout());
    setShowLogoutModal(false);
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard/pages/mainpage', icon: '/mage_dashboard-2.png', current: router.pathname === '/dashboard' },
    { name: 'Add Integration', href: '/dashboard/pages/start', icon: '/f7_doc-text.png', current: router.pathname === '/profile' },
    { name: 'Connections', href: '/dashboard/pages/uploadLeaseform', icon: '/step.png', current: router.pathname === '/news-alerts' },
    { name: 'Credentials', href: '/dashboard/pages/credientials', icon: '/step.png', current: router.pathname === '/news-alerts' },
  ];

  const userSetting = [
    { name: 'Logout', href: '#', icon: '/img9.png', current: router.pathname === '/profile' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Logout Modal */}
        <LogoutModal
          isOpen={showLogoutModal}
          onConfirm={confirmLogout}
          onCancel={cancelLogout}
        />

        {/* Sidebar for desktop */}
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
            <Image
              alt="Logo"
              src={backgroundImage}
              width={200}
              height={100}
            />
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`${item.current
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150`}
                  >
                    <Image src={item.icon as string} alt={item.name} width={32} height={32} className="mr-3" />
                    {item.name}
                  </a>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  {userSetting.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => {
                        if (item.name === 'Logout') {
                          e.preventDefault();
                          handleLogout();
                        }
                      }}
                      className={`${item.current
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer`}
                    >
                      <Image src={item.icon} alt={item.name} width={32} height={32} className="mr-3" />
                      {item.name}
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        <div className={`md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 flex z-40">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <span className="text-white text-xl">✕</span>
                </button>
              </div>
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                {/* Mobile Logo */}
                <div className="flex-shrink-0 flex items-center px-4 mb-5">
                  <Image
                    alt="Logo"
                    src={backgroundImage}
                    width={150}
                    height={75}
                  />
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`${item.current
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors duration-150`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Image src={item.icon} alt={item.name} width={40} height={40} className="mr-3" />
                      {item.name}
                    </a>
                  ))}

                  {/* Mobile User Settings */}
                  <div className="border-t border-gray-200 pt-2 mt-4">
                    {userSetting.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={(e) => {
                          if (item.name === 'Logout') {
                            e.preventDefault();
                            handleLogout();
                          }
                          setSidebarOpen(false);
                        }}
                        className={`${item.current
                          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors duration-150 cursor-pointer`}
                      >
                        <Image src={item.icon} alt={item.name} width={40} height={30} className="mr-3" />
                        {item.name}
                      </a>
                    ))}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="md:pl-64 flex flex-col flex-1">
          {/* Mobile header */}
          <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
            <button
              className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <span className="text-2xl">☰</span>
            </button>
          </div>

          {/* Page header */}
          <div className="bg-white shadow">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                {/* Left - Page Title */}
                <h1 className="text-xl font-bold text-gray-900">
                  {navigation.find(item => item.current)?.name || 'Dashboard'}
                </h1>
              </div>
            </div>
          </div>
          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};