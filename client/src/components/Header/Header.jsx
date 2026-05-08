import { useLocation } from 'react-router-dom';
import HeaderView from './HeaderView';

export default function Header({
  isConnected,
  lastUpdated,
  darkMode,
  setDarkMode,
}) {
  const location = useLocation();

  const pageTitles = {
    '/': 'Dashboard',
    '/controls': 'Control Panel',
    '/voice': 'Voice & Alerts',
  };

  const pageSubtitles = {
    '/': 'Real-time sensor monitoring',
    '/controls': 'Manage devices & automation',
    '/voice': 'Voice commands & emergency alerts',
  };

  const title = pageTitles[location.pathname] || 'Dashboard';
  const subtitle = pageSubtitles[location.pathname] || '';

  return (
    <HeaderView
      title={title}
      subtitle={subtitle}
      isConnected={isConnected}
      lastUpdated={lastUpdated}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
    />
  );
}
