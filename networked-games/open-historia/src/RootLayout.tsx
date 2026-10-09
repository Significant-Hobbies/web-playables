import { Outlet } from 'react-router-dom';

import { AnalyticsProvider } from '@/components/posthog-provider';
import { SaaSMakerFeedback } from '@/components/saasmaker-feedback';

export default function RootLayout() {
  return (
    <div className="font-sans antialiased">
      <AnalyticsProvider>
        <Outlet />
        <SaaSMakerFeedback />
      </AnalyticsProvider>
    </div>
  );
}
