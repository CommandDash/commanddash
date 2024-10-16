import { ApplicationInsights } from '@microsoft/applicationinsights-web';

// const instrumentationKey = import.meta.env.VITE_INSTRUMENTATION_KEY;
const instrumentationKey = '';


if (!instrumentationKey) {
  console.log('instrumentation key not found');
}

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: instrumentationKey
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView(); // Manually call trackPageView to establish the current user/session/pageview

export default appInsights;