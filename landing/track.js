/**
 * Analytics Tracking Script
 * 
 * Features:
 * - Pageview tracking with navigation path analysis
 * - Session management with journey tracking
 * - User engagement metrics (scroll, active time, interactions)
 * - Search query tracking
 * - Attribution tracking (UTM parameters)
 * 
 * Navigation Path Analysis:
 * - Tracks prev_path for each pageview to build user journeys
 * - Maintains session journey history (up to 50 pages)
 * - Captures journey_depth and pages_visited for UX analysis
 * - Enables back button detection and drop-off point analysis
 * 
 * Manual Tracking API:
 * - window.trackPageview(path) - Track SPA navigation
 * - window.trackSearch(query, resultsCount) - Track search queries
 * - window.trackEngagementNow() - Force engagement tracking
 */
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
  const VISITOR_KEY = '_aq_vid';
  const VISITOR_EXPIRY = 365 * 24 * 60 * 60 * 1000;
  const LAST_VISIT_KEY = '_aq_last_visit';

  function getVisitorId() {
    let stored = localStorage.getItem(VISITOR_KEY);
    if (stored) {
      const { id, created } = JSON.parse(stored);
      if (Date.now() - created < VISITOR_EXPIRY) return id;
    }
    const newId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ id: newId, created: Date.now() }));
    return newId;
  }

  function isReturningVisitor() {
    const sessions = sessionStorage.getItem('_aq_session_count');
    return sessions && parseInt(sessions) > 0;
  }

  function getDaysSinceLastVisit() {
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (!lastVisit) return null;
    const daysSince = Math.floor((Date.now() - parseInt(lastVisit)) / (24 * 60 * 60 * 1000));
    return daysSince;
  }

  function updateLastVisit() {
    localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
  }

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
    const count = parseInt(sessionStorage.getItem('_aq_session_count') || '0');
    sessionStorage.setItem('_aq_session_count', (count + 1).toString());
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
    const visitorId = getVisitorId();
    const journey = getJourney();
    const attribution = getAttribution();
    const daysSinceLastVisit = getDaysSinceLastVisit();
    
    // Build event with navigation path data for UX analysis
    const event = {
      project_id: PROJECT_ID,
      source_type: SOURCE_TYPE,
      event_type: eventType,
      timestamp: Date.now(),
      session_id: sessionId,
      visitor_id: visitorId,
      is_returning: isReturningVisitor(),
      days_since_last_visit: daysSinceLastVisit,
      path: window.location.pathname,
      referrer: document.referrer || null,
      screen: window.screen.width + 'x' + window.screen.height,
      journey_depth: journey.length,
      prev_path: journey.length > 0 ? journey[journey.length - 1].path : null, // For navigation path analysis
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
  const isEntryPage = !sessionStorage.getItem('_aq_entry_tracked');
  if (isEntryPage) {
    sessionStorage.setItem('_aq_entry_tracked', '1');
    updateLastVisit(); // Update last visit timestamp on new session
  }
  
  // Track current page in journey before sending pageview
  const journey = getJourney();
  const prevPath = journey.length > 0 ? journey[journey.length - 1].path : null;
  addToJourney(window.location.pathname);
  
  track('pageview', { 
    is_entry: isEntryPage,
    pages_visited: journey.length + 1
  });
  
  // Auto-detect search from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('q') || urlParams.get('search') || urlParams.get('query') || urlParams.get('s');
  if (searchQuery) {
    const resultsCount = document.querySelectorAll('.search-result, [class*="search-result"], [class*="result-item"]').length;
    track('search', { search_query: searchQuery.slice(0, 100).toLowerCase().trim(), search_results_count: resultsCount });
  }

  // Auto-detect search form submissions
  setTimeout(() => {
    document.querySelectorAll('form[role="search"], .search-form, form[class*="search"]').forEach(form => {
      form.addEventListener('submit', (e) => {
        const input = form.querySelector('input[type="search"], input[name*="search"], input[name="q"], input[name="query"]');
        if (input && input.value) {
          track('search', { search_query: input.value.slice(0, 100).toLowerCase().trim() });
        }
      });
    });
  }, 1000);

  // Content engagement depth tracking
  let engagementStart = Date.now();
  let activeTime = 0;
  let lastActive = Date.now();
  let isActive = true;
  let maxScroll = 0;
  let interactions = 0;

  function updateActiveTime() {
    if (isActive) {
      activeTime += Date.now() - lastActive;
    }
    lastActive = Date.now();
  }

  function trackEngagement() {
    updateActiveTime();
    const totalTime = Math.floor((Date.now() - engagementStart) / 1000);
    const activeSeconds = Math.floor(activeTime / 1000);
    const engagementRate = totalTime > 0 ? Math.round((activeSeconds / totalTime) * 100) : 0;
    
    if (totalTime > 0) {
      track('engagement', {
        total_time: totalTime,
        active_time: activeSeconds,
        engagement_rate: engagementRate,
        max_scroll: maxScroll,
        interactions: interactions
      });
    }
  }

  function updateScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight > 0) {
      const scrolled = Math.round((window.scrollY / scrollHeight) * 100);
      if (scrolled > maxScroll) maxScroll = Math.min(scrolled, 100);
    }
  }

  window.addEventListener('scroll', () => {
    updateScroll();
    isActive = true;
    updateActiveTime();
  }, { passive: true });

  ['click', 'keydown', 'mousemove'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (evt === 'click') interactions++;
      isActive = true;
      updateActiveTime();
    }, { passive: true });
  });

  ['blur', 'visibilitychange'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (document.hidden || evt === 'blur') {
        updateActiveTime();
        isActive = false;
      } else {
        lastActive = Date.now();
        isActive = true;
      }
    });
  });

  setInterval(trackEngagement, 10000);

  // Expose manual tracking API
  window.trackSearch = function(query, resultsCount = 0) {
    if (query) {
      track('search', { search_query: query.slice(0, 100).toLowerCase().trim(), search_results_count: resultsCount });
    }
  };
  
  // Expose manual pageview tracking for SPAs
  window.trackPageview = function(path) {
    const currentPath = path || window.location.pathname;
    const journey = getJourney();
    addToJourney(currentPath);
    track('pageview', { 
      path: currentPath,
      pages_visited: journey.length
    });
  };
  
  // Expose manual engagement tracking for testing
  window.trackEngagementNow = trackEngagement;
  
  setInterval(updateSession, 60000);
  window.addEventListener('beforeunload', () => {
    trackEngagement();
    const journey = getJourney();
    const startTime = parseInt(sessionStorage.getItem(SESSION_START_KEY) || Date.now());
    const duration = Math.floor((Date.now() - startTime) / 1000);
    track('session_end', { pages_visited: journey.length, session_duration: duration });
  });
})();
