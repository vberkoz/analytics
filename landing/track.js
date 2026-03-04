(function() {
  const script = document.currentScript;
  const PROJECT_ID = script.getAttribute('data-project');
  const SOURCE_TYPE = script.getAttribute('data-source') || 'landing'; // landing, multipage, webapp
  const API_URL = 'https://5sz981rz6d.execute-api.us-east-1.amazonaws.com/prod/event';

  function track(eventType, data = {}) {
    const event = {
      project_id: PROJECT_ID,
      source_type: SOURCE_TYPE,
      event_type: eventType,
      timestamp: Date.now(),
      path: window.location.pathname,
      referrer: document.referrer || null,
      screen: window.screen.width + 'x' + window.screen.height,
      ...data
    };
    navigator.sendBeacon(API_URL, JSON.stringify(event));
  }

  track('pageview');
  window.addEventListener('beforeunload', () => track('session_end'));
})();
