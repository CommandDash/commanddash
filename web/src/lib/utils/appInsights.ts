import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const instrumentationKey = import.meta.env.VITE_INSTRUMENTATION_KEY;

if (!instrumentationKey) {
  throw new Error('Instrumentation key is not defined in the environment variables');
}

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: instrumentationKey
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView(); // Manually call trackPageView to establish the current user/session/pageview

export default appInsights;