(function() {
  const script = document.currentScript;
  const PROJECT_ID = script.getAttribute('data-project');
  const SOURCE_TYPE = script.getAttribute('data-source') || 'landing';
  const API_URL = 'https://5sz981rz6d.execute-api.us-east-1.amazonaws.com/prod/event';

  const SESSION_KEY = '_aq_sid';
  const JOURNEY_KEY = '_aq_journey';
  const ATTRIBUTION_KEY = '_aq_attr';
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  const SESSION_START_KEY = '_aq_start';

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
    sessionStorage.setItem(SESSION_START_KEY, Date.now());
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

  function getAttribution() {
    let attr = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (attr) return JSON.parse(attr);
    
    const params = new URLSearchParams(window.location.search);
    attr = {
      source: params.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direct'),
      medium: params.get('utm_medium') || (document.referrer ? 'referral' : 'none'),
      campaign: params.get('utm_campaign') || null,
      term: params.get('utm_term') || null,
      content: params.get('utm_content') || null,
      referrer: document.referrer || null,
      landing_page: window.location.pathname + window.location.search
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attr));
    return attr;
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
    const attribution = getAttribution();
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
      utm_source: attribution.source,
      utm_medium: attribution.medium,
      utm_campaign: attribution.campaign,
      utm_term: attribution.term,
      utm_content: attribution.content,
      landing_page: attribution.landing_page,
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
    const startTime = parseInt(sessionStorage.getItem(SESSION_START_KEY) || Date.now());
    const duration = Math.floor((Date.now() - startTime) / 1000);
    track('session_end', { pages_visited: journey.length, session_duration: duration });
  });
})();
