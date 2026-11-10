import { useEffect, useState, type ReactElement } from 'react';
import { db } from '../db/dexie';
import { About } from '../screens/About';
import { Progress } from '../screens/Progress';
import { ReviewQueue } from '../screens/ReviewQueue';
import { Session } from '../screens/Session';
import { Settings } from '../screens/Settings';
import { Today } from '../screens/Today';
import { UnitDetail } from '../screens/UnitDetail';
import { Units } from '../screens/Units';
import { isStandalone, requestPersistence, usePwa } from './pwa';
import { TABS, tabOf, type Screen, type Tab } from './screens';
import { loadContent, updateStreak, useQuery } from './store';

const ICONS: Record<Tab, ReactElement> = {
  today: <path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 2" />,
  units: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />,
  progress: <path d="M5 20V10M12 20V4M19 20v-7" />,
  settings: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 4v6M8 14v6" />,
};
const LABELS: Record<Tab, string> = { today: 'Today', units: 'Units', progress: 'Progress', settings: 'Settings' };
const THEME_COLORS = { light: '#F7F1E5', dark: '#12201F' };

export function App(): ReactElement | null {
  const [screen, go] = useState<Screen>({ name: 'today' });
  const content = useQuery(loadContent);
  const settings = useQuery(() => db.settings());
  const pwa = usePwa();
  const theme = settings?.theme ?? 'auto';

  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      const own = m.media.includes('dark') ? 'dark' : 'light';
      m.content = THEME_COLORS[theme === 'auto' ? own : theme];
    });
  }, [theme]);

  useEffect(() => {
    void db.get<number | null>('firstUseAt', null).then((t) => { if (!t) void db.set('firstUseAt', Date.now()); });
    if (isStandalone()) void requestPersistence();
  }, []);
  const ready = !!content;
  useEffect(() => { if (content) void updateStreak(content); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!content || !settings) return null;
  const view = (): ReactElement => {
    switch (screen.name) {
      case 'today': return <Today content={content} settings={settings} go={go} offlineReady={pwa.offlineReady} />;
      case 'session': return <Session steps={screen.steps} content={content} settings={settings} go={go} />;
      case 'units': return <Units content={content} go={go} />;
      case 'unit': return <UnitDetail content={content} unitId={screen.unitId} go={go} />;
      case 'progress': return <Progress content={content} />;
      case 'review': return <ReviewQueue content={content} go={go} />;
      case 'settings': return <Settings settings={settings} go={go} />;
      case 'about': return <About go={go} />;
    }
  };

  return (
    <div className="app">
      {view()}
      {screen.name !== 'session' && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button key={t} aria-current={tabOf(screen) === t ? 'page' : undefined} onClick={() => go({ name: t } as Screen)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t]}</svg>
              {LABELS[t]}
            </button>
          ))}
        </nav>
      )}
      {pwa.needRefresh && screen.name !== 'session' && (
        <div className="toast" role="status">
          <span>Update available</span>
          <button className="link" onClick={pwa.update}>Reload</button>
        </div>
      )}
    </div>
  );
}
