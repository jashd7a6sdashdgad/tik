'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Mail,
  FileSpreadsheet,
  Search,
  Stethoscope,
  Settings,
  LogOut,
  Menu,
  X,
  Facebook,
  MessageCircle,
  Youtube,
  Globe,
  Brain,
  Sun,
  Camera,
  Share2,
  Moon,
  Shield
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/lib/translations';
// Removed VoiceInputButton - replaced with new VoiceAssistant

const getNavigation = (t: (key: string) => string) => [
  {
    key: 'dashboard',
    name: t('dashboard'),
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    key: 'chat',
    name: t('chat'),
    href: '/chat',
    icon: Search
  },
  {
    key: 'search',
    name: t('search') || 'Global Search',
    href: '/search',
    icon: Search
  },
  {
    key: 'think-tool',
    name: t('thinkTool'),
    href: '/think-tool',
    icon: Brain
  },
  {
    key: 'calendar',
    name: t('calendar'),
    href: '/calendar',
    icon: Calendar
  },
  {
    key: 'email',
    name: t('email'),
    href: '/email',
    icon: Mail
  },
  {
    key: 'expenses',
    name: t('expenses'),
    href: '/expenses',
    icon: FileSpreadsheet
  },
  {
    key: 'shopping',
    name: t('shoppingList'),
    href: '/shopping',
    icon: FileSpreadsheet
  },
  {
    key: 'contacts',
    name: t('contacts'),
    href: '/contacts',
    icon: FileSpreadsheet
  },
  {
    key: 'diary',
    name: t('diary'),
    href: '/diary',
    icon: FileSpreadsheet
  },
  {
    key: 'photos',
    name: t('photos'),
    href: '/photos',
    icon: Camera
  },
  {
    key: 'budget',
    name: t('budget'),
    href: '/budget',
    icon: FileSpreadsheet
  },
  {
    key: 'hotel-expenses',
    name: t('hotelExpenses'),
    href: '/hotel-expenses',
    icon: FileSpreadsheet
  },
  {
    key: 'tracking',
    name: t('tracking'),
    href: '/tracking',
    icon: Stethoscope
  },
  {
    key: 'social-media',
    name: 'Social Media',
    href: '/social-media',
    icon: Share2
  },
  {
    key: 'facebook',
    name: t('facebook'),
    href: '/facebook',
    icon: Facebook
  },
  {
    key: 'messenger',
    name: t('messenger'),
    href: '/messenger',
    icon: MessageCircle
  },
  {
    key: 'youtube',
    name: t('youtube'),
    href: '/youtube',
    icon: Youtube
  },
  {
    key: 'weather',
    name: t('weather'),
    href: '/weather',
    icon: Sun
  },
  {
    key: 'webScraper',
    name: t('webScraper'),
    href: '/web-scraper',
    icon: Globe
  },
  {
    key: 'islamic-settings',
    name: 'Islamic Settings',
    href: '/islamic-settings',
    icon: Moon
  },
  {
    key: 'security',
    name: t('security'),
    href: '/security',
    icon: Shield
  }
];

export function Navigation() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { language, isRTL } = useSettings();
  const { t } = useTranslation(language);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navigation = getNavigation(t);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-secondary border-r border-primary px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">
                {language === 'ar' ? 'المساعد الشخصي' : 'Personal Assistant'}
              </h1>
            </div>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all duration-300 ease-in-out relative overflow-hidden',
                            isActive
                              ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-105'
                              : 'text-black hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:shadow-primary/10 hover:scale-102',
                            'hover:translate-x-1'
                          )}
                        >
                          <item.icon className={cn(
                            "h-6 w-6 shrink-0 transition-all duration-300",
                            isActive 
                              ? "text-white transform rotate-3 scale-110" 
                              : "group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
                          )} />
                          <span className="transition-all duration-300 group-hover:translate-x-1">
                            {item.name}
                          </span>
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 animate-pulse"></div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              
              <li className="mt-auto">
                <div className="space-y-1">
                  <Link
                    href="/settings"
                    className={cn(
                      'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all duration-300 ease-in-out relative overflow-hidden',
                      pathname === '/settings'
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-105'
                        : 'text-black hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:shadow-primary/10 hover:scale-102 hover:translate-x-1'
                    )}
                  >
                    <Settings className={cn(
                      "h-6 w-6 shrink-0 transition-all duration-300",
                      pathname === '/settings'
                        ? "text-white transform rotate-3 scale-110" 
                        : "group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
                    )} />
                    <span className="transition-all duration-300 group-hover:translate-x-1">
                      {t('settings')}
                    </span>
                    {pathname === '/settings' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 animate-pulse"></div>
                    )}
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="group flex w-full gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold text-black hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:shadow-md hover:shadow-red-200/50 hover:scale-102 hover:translate-x-1 transition-all duration-300 ease-in-out"
                  >
                    <LogOut className="h-6 w-6 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:text-red-600" />
                    <span className="transition-all duration-300 group-hover:translate-x-1">
                      {t('signOut')}
                    </span>
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="lg:hidden">
        {/* Mobile menu button */}
        <div className="fixed top-0 left-0 z-50 flex h-16 w-full items-center gap-x-4 border-b border-secondary glass px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-black lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex items-center justify-between text-sm font-semibold leading-6 text-primary">
            <div className="flex items-center">
              {language === 'ar' ? 'المساعد الشخصي' : 'Personal Assistant'}
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            
            <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-secondary px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-primary">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-primary">
                    {language === 'ar' ? 'المساعد الشخصي' : 'Personal Assistant'}
                  </h1>
                </div>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-black"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <nav className="mt-6">
                <ul role="list" className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all duration-300 ease-in-out relative overflow-hidden',
                            isActive
                              ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-105'
                              : 'text-black hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:shadow-primary/10 hover:scale-102 hover:translate-x-1'
                          )}
                        >
                          <item.icon className={cn(
                            "h-6 w-6 shrink-0 transition-all duration-300",
                            isActive 
                              ? "text-white transform rotate-3 scale-110" 
                              : "group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
                          )} />
                          <span className="transition-all duration-300 group-hover:translate-x-1">
                            {item.name}
                          </span>
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 animate-pulse"></div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                  
                  <li className="mt-8">
                    <Link
                      href="/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all duration-300 ease-in-out relative overflow-hidden',
                        pathname === '/settings'
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 scale-105'
                          : 'text-black hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:shadow-md hover:shadow-primary/10 hover:scale-102 hover:translate-x-1'
                      )}
                    >
                      <Settings className={cn(
                        "h-6 w-6 shrink-0 transition-all duration-300",
                        pathname === '/settings'
                          ? "text-white transform rotate-3 scale-110" 
                          : "group-hover:text-primary group-hover:scale-110 group-hover:rotate-3"
                      )} />
                      <span className="transition-all duration-300 group-hover:translate-x-1">
                        {t('settings')}
                      </span>
                      {pathname === '/settings' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 animate-pulse"></div>
                      )}
                    </Link>
                  </li>
                  
                  <li>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="group flex w-full gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold text-black hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:shadow-md hover:shadow-red-200/50 hover:scale-102 hover:translate-x-1 transition-all duration-300 ease-in-out"
                    >
                      <LogOut className="h-6 w-6 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:text-red-600" />
                      <span className="transition-all duration-300 group-hover:translate-x-1">
                        {t('signOut')}
                      </span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Mobile top spacing */}
      <div className="lg:hidden h-16" />
    </>
  );
}