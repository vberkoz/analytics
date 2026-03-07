// Debug version of track.js with console logging for scroll depth testing
// Replace track.js temporarily with this file to debug scroll depth tracking

(function() {
  const script = document.currentScript;
  const PROJECT_ID = script.getAttribute('data-project');
  const SOURCE_TYPE = script.getAttribute('data-source') || 'landing';
  
  console.log('[SCROLL DEBUG] Tracking initialized', { PROJECT_ID, SOURCE_TYPE });
  
  // Scroll depth milestone tracking
  const scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
  let engagementStart = Date.now();
  let maxScroll = 0;

  function updateScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = scrollHeight > 0 ? Math.round((window.scrollY / scrollHeight) * 100) : 0;
    
    console.log('[SCROLL DEBUG]', {
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      scrollableHeight: scrollHeight,
      scrolledPercent: scrolled,
      maxScroll: maxScroll
    });
    
    if (scrollHeight > 0) {
      if (scrolled > maxScroll) maxScroll = Math.min(scrolled, 100);
      
      // Track scroll depth milestones
      [25, 50, 75, 100].forEach(milestone => {
        if (scrolled >= milestone && !scrollMilestones[milestone]) {
          scrollMilestones[milestone] = true;
          const timeToDepth = Math.floor((Date.now() - engagementStart) / 1000);
          
          console.log('[SCROLL MILESTONE REACHED]', {
            depth: milestone,
            time_to_depth: timeToDepth,
            event_type: 'scroll_depth'
          });
          
          // In production, this would send to API
          // track('scroll_depth', { depth: milestone, time_to_depth: timeToDepth });
        }
      });
    } else {
      console.warn('[SCROLL DEBUG] Page not scrollable! scrollHeight:', document.documentElement.scrollHeight, 'innerHeight:', window.innerHeight);
    }
  }

  // Initial check
  setTimeout(() => {
    console.log('[SCROLL DEBUG] Initial page check');
    updateScroll();
  }, 1000);

  window.addEventListener('scroll', () => {
    updateScroll();
  }, { passive: true });
  
  console.log('[SCROLL DEBUG] Scroll listener attached. Try scrolling the page!');
})();
