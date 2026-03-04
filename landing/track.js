(function() {
  const script = document.currentScript;
  const PROJECT_ID = script.getAttribute('data-project');
  const SOURCE_TYPE = script.getAttribute('data-source') || 'landing';
  const API_URL = 'https://5sz981rz6d.execute-api.us-east-1.amazonaws.com/prod/event';

  const SESSION_KEY = '_aq_sid';
  const JOURNEY_KEY = '_aq_journey';
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  function getSessionId() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const { id, lastActive } = JSON.parse(stored);
      if (Date.now() - lastActive < SESSION_TIMEOUT) {
        return id;
      }
    }
    const newId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: newId, lastActive: Date.now() }));
    sessionStorage.removeItem(JOURNEY_KEY);
    return newId;
  }

  function updateSession() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      session.lastActive = Date.now();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  function getJourney() {
    const journey = sessionStorage.getItem(JOURNEY_KEY);
    return journey ? JSON.parse(journey) : [];
  }

  function addToJourney(path) {
    const journey = getJourney();
    journey.push({ path, ts: Date.now() });
    if (journey.length > 50) journey.shift();
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(journey));
  }

  function track(eventType, data = {}) {
    const sessionId = getSessionId();
    const journey = getJourney();
    const event = {
      project_id: PROJECT_ID,
      source_type: SOURCE_TYPE,
      event_type: eventType,
      timestamp: Date.now(),
      session_id: sessionId,
      path: window.location.pathname,
      referrer: document.referrer || null,
      screen: window.screen.width + 'x' + window.screen.height,
      journey_depth: journey.length,
      prev_path: journey.length > 0 ? journey[journey.length - 1].path : null,
      ...data
    };
    navigator.sendBeacon(API_URL, JSON.stringify(event));
  }

  const sessionId = getSessionId();
  addToJourney(window.location.pathname);
  track('pageview');
  
  setInterval(updateSession, 60000);
  window.addEventListener('beforeunload', () => {
    const journey = getJourney();
    track('session_end', { pages_visited: journey.length });
  });
})();
