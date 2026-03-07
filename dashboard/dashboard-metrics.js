function renderMetrics(events, startDate, endDate) {
    // Get all stats containers
    const statsContainers = document.querySelectorAll('.stats');
    
    if (selectedProjectType === 'landing') {
        // Hide second stats container for landing
        if (statsContainers[1]) statsContainers[1].style.display = 'none';
        
        // Show and render landing page metrics in first container
        if (statsContainers[0]) {
            statsContainers[0].style.display = 'grid';
            renderLandingMetrics(events);
        }
    } else {
        // Restore multipage metrics structure if needed
        if (statsContainers[0] && statsContainers[0].querySelector('#landingPageviews')) {
            // Need to restore original multipage structure
            statsContainers[0].innerHTML = `
                <div class="stat">
                    <h3>Total Events</h3>
                    <div class="value" id="totalEvents">-</div>
                </div>
                <div class="stat">
                    <h3>Pageviews</h3>
                    <div class="value" id="pageviews">-</div>
                </div>
                <div class="stat">
                    <h3>Avg Session</h3>
                    <div class="value" id="avgSessionDuration">-</div>
                </div>
                <div class="stat">
                    <h3>Pages/Session</h3>
                    <div class="value" id="pagesPerSession">-</div>
                </div>
                <div class="stat">
                    <h3>Return Rate</h3>
                    <div class="value" id="returnRate">-</div>
                </div>
                <div class="stat">
                    <h3>Unique Screens</h3>
                    <div class="value" id="uniqueScreens">-</div>
                </div>
                <div class="stat">
                    <h3>Top Source</h3>
                    <div class="value" id="topSource">-</div>
                </div>
            `;
        }
        
        // Show both stats containers for multipage
        statsContainers.forEach(el => el.style.display = 'grid');
        
        // Render multipage metrics
        renderMultipageMetrics(events);
    }
}

function renderLandingMetrics(events) {
    // Create landing-specific stats container
    const statsContainer = document.querySelector('.stats');
    statsContainer.style.display = 'grid';
    statsContainer.innerHTML = `
        <div class="stat">
            <h3>Total Pageviews</h3>
            <div class="value" id="landingPageviews">-</div>
        </div>
        <div class="stat">
            <h3>Avg Page Load</h3>
            <div class="value" id="avgPageLoad">-</div>
        </div>
        <div class="stat">
            <h3>CTA Clicks</h3>
            <div class="value" id="ctaClicks">-</div>
        </div>
        <div class="stat">
            <h3>Conversion Rate</h3>
            <div class="value" id="conversionRate">-</div>
        </div>
        <div class="stat">
            <h3>Avg Time on Page</h3>
            <div class="value" id="avgTimeOnPage">-</div>
        </div>
        <div class="stat">
            <h3>Bounce Rate</h3>
            <div class="value" id="bounceRate">-</div>
        </div>
        <div class="stat">
            <h3>Avg Scroll Depth</h3>
            <div class="value" id="landingScrollDepth">-</div>
        </div>
        <div class="stat">
            <h3>Top CTA</h3>
            <div class="value" id="topCTA">-</div>
        </div>
        <div class="stat">
            <h3>Top Source</h3>
            <div class="value" id="landingTopSource">-</div>
        </div>
    `;
    
    // Calculate landing metrics
    const pageviews = events.filter(e => e.event_type === 'pageview').length;
    document.getElementById('landingPageviews').textContent = pageviews;
    
    // Avg page load time
    const perfEvents = events.filter(e => e.event_type === 'page_load_performance' && parseInt(e.total_load_time) > 0);
    if (perfEvents.length > 0) {
        const avgLoadTime = Math.floor(perfEvents.reduce((sum, e) => sum + parseInt(e.total_load_time), 0) / perfEvents.length);
        if (avgLoadTime < 1000) {
            document.getElementById('avgPageLoad').textContent = `${avgLoadTime}ms`;
        } else {
            document.getElementById('avgPageLoad').textContent = `${(avgLoadTime / 1000).toFixed(2)}s`;
        }
    } else {
        document.getElementById('avgPageLoad').textContent = 'N/A';
    }
    
    // CTA clicks
    const ctaClicks = events.filter(e => e.event_type === 'cta_click');
    document.getElementById('ctaClicks').textContent = ctaClicks.length;
    
    // Conversion rate (CTA clicks / pageviews)
    const conversionRate = pageviews > 0 ? ((ctaClicks.length / pageviews) * 100).toFixed(1) : '0.0';
    document.getElementById('conversionRate').textContent = `${conversionRate}%`;
    
    // Avg time on page
    const engagements = events.filter(e => e.event_type === 'engagement' && parseInt(e.total_time) > 0);
    if (engagements.length > 0) {
        const avgTime = Math.floor(engagements.reduce((sum, e) => sum + parseInt(e.total_time), 0) / engagements.length);
        const mins = Math.floor(avgTime / 60);
        const secs = avgTime % 60;
        document.getElementById('avgTimeOnPage').textContent = `${mins}m ${secs}s`;
    } else {
        document.getElementById('avgTimeOnPage').textContent = 'N/A';
    }
    
    // Bounce rate (single page sessions)
    const sessionPages = {};
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.session_id) {
            sessionPages[e.session_id] = (sessionPages[e.session_id] || 0) + 1;
        }
    });
    const totalSessions = Object.keys(sessionPages).length;
    const bouncedSessions = Object.values(sessionPages).filter(count => count === 1).length;
    const bounceRate = totalSessions > 0 ? ((bouncedSessions / totalSessions) * 100).toFixed(1) : '0.0';
    document.getElementById('bounceRate').textContent = `${bounceRate}%`;
    
    // Avg scroll depth
    if (engagements.length > 0) {
        const avgScroll = Math.floor(engagements.reduce((sum, e) => sum + (parseInt(e.max_scroll) || 0), 0) / engagements.length);
        document.getElementById('landingScrollDepth').textContent = `${avgScroll}%`;
    } else {
        document.getElementById('landingScrollDepth').textContent = 'N/A';
    }
    
    // Top CTA
    const ctaTexts = {};
    ctaClicks.forEach(e => {
        if (e.cta_text) {
            ctaTexts[e.cta_text] = (ctaTexts[e.cta_text] || 0) + 1;
        }
    });
    const topCTA = Object.entries(ctaTexts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('topCTA').textContent = topCTA ? topCTA[0].slice(0, 20) : 'N/A';
    
    // Top source
    const sources = {};
    events.forEach(e => {
        if (e.utm_source) {
            const key = `${e.utm_source}/${e.utm_medium}`;
            sources[key] = (sources[key] || 0) + 1;
        }
    });
    const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('landingTopSource').textContent = topSource ? topSource[0] : 'N/A';
}

function renderMultipageMetrics(events) {
    // Show both stats containers for multipage
    document.querySelectorAll('.stats').forEach(el => el.style.display = 'grid');
    
    document.getElementById('totalEvents').textContent = events.length;
    document.getElementById('pageviews').textContent = events.filter(e => e.event_type === 'pageview').length;
    document.getElementById('uniqueScreens').textContent = new Set(events.map(e => e.screen)).size;

    // Session duration
    const sessionEnds = events.filter(e => e.event_type === 'session_end' && parseInt(e.session_duration) > 0);
    const avgDuration = sessionEnds.length > 0 
        ? Math.floor(sessionEnds.reduce((sum, e) => sum + parseInt(e.session_duration), 0) / sessionEnds.length)
        : 0;
    const minutes = Math.floor(avgDuration / 60);
    const seconds = avgDuration % 60;
    document.getElementById('avgSessionDuration').textContent = `${minutes}m ${seconds}s`;

    // Attribution
    const sources = {};
    events.forEach(e => {
        if (e.utm_source) {
            const key = `${e.utm_source}/${e.utm_medium}`;
            sources[key] = (sources[key] || 0) + 1;
        }
    });
    const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('topSource').textContent = topSource ? topSource[0] : 'N/A';

    // Pages per session
    const sessionPages = {};
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.session_id) {
            sessionPages[e.session_id] = (sessionPages[e.session_id] || 0) + 1;
        }
    });
    const sessions = Object.values(sessionPages);
    const avgPages = sessions.length > 0 
        ? (sessions.reduce((sum, count) => sum + count, 0) / sessions.length).toFixed(1)
        : '0.0';
    document.getElementById('pagesPerSession').textContent = avgPages;

    // Return rate
    const visitors = {};
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.visitor_id) {
            if (!visitors[e.visitor_id]) {
                visitors[e.visitor_id] = { sessions: new Set(), isReturning: e.is_returning };
            }
            visitors[e.visitor_id].sessions.add(e.session_id);
        }
    });
    const visitorList = Object.values(visitors);
    const returningVisitorCount = visitorList.filter(v => v.sessions.size > 1 || v.isReturning).length;
    const returnRate = visitorList.length > 0 ? ((returningVisitorCount / visitorList.length) * 100).toFixed(1) : '0.0';
    document.getElementById('returnRate').textContent = `${returnRate}%`;

    // Engagement metrics
    const engagements = events.filter(e => e.event_type === 'engagement' && parseInt(e.total_time) > 0);
    if (engagements.length > 0) {
        const avgEngRate = (engagements.reduce((sum, e) => sum + (parseInt(e.engagement_rate) || 0), 0) / engagements.length).toFixed(0);
        const avgActive = Math.floor(engagements.reduce((sum, e) => sum + (parseInt(e.active_time) || 0), 0) / engagements.length);
        const avgScroll = Math.floor(engagements.reduce((sum, e) => sum + (parseInt(e.max_scroll) || 0), 0) / engagements.length);
        
        document.getElementById('engagementRate').textContent = `${avgEngRate}%`;
        const mins = Math.floor(avgActive / 60);
        const secs = avgActive % 60;
        document.getElementById('avgActiveTime').textContent = `${mins}m ${secs}s`;
        document.getElementById('avgScrollDepth').textContent = `${avgScroll}%`;
    } else {
        document.getElementById('engagementRate').textContent = 'N/A';
        document.getElementById('avgActiveTime').textContent = 'N/A';
        document.getElementById('avgScrollDepth').textContent = 'N/A';
    }

    // Session frequency - average days between visits
    const visitsWithFrequency = events.filter(e => 
        e.event_type === 'pageview' && 
        e.is_entry && 
        e.days_since_last_visit !== null && 
        e.days_since_last_visit !== undefined &&
        parseInt(e.days_since_last_visit) >= 0
    );
    
    if (visitsWithFrequency.length > 0) {
        const avgFrequency = visitsWithFrequency.reduce((sum, e) => sum + parseInt(e.days_since_last_visit), 0) / visitsWithFrequency.length;
        if (avgFrequency < 1) {
            document.getElementById('sessionFrequency').textContent = '< 1 day';
        } else if (avgFrequency < 7) {
            document.getElementById('sessionFrequency').textContent = `${avgFrequency.toFixed(1)} days`;
        } else {
            const weeks = (avgFrequency / 7).toFixed(1);
            document.getElementById('sessionFrequency').textContent = `${weeks} weeks`;
        }
    } else {
        document.getElementById('sessionFrequency').textContent = 'N/A';
    }

    // Top country
    const countries = {};
    events.forEach(e => {
        if (e.country && e.country !== 'XX') {
            countries[e.country] = (countries[e.country] || 0) + 1;
        }
    });
    const topCountry = Object.entries(countries).sort((a, b) => b[1] - a[1])[0];
    const countryNames = {
        'US': '🇺🇸 US', 'GB': '🇬🇧 UK', 'DE': '🇩🇪 DE', 'FR': '🇫🇷 FR', 'CA': '🇨🇦 CA',
        'AU': '🇦🇺 AU', 'JP': '🇯🇵 JP', 'CN': '🇨🇳 CN', 'IN': '🇮🇳 IN', 'BR': '🇧🇷 BR'
    };
    document.getElementById('topCountry').textContent = topCountry ? (countryNames[topCountry[0]] || topCountry[0]) : 'N/A';

    // Top language
    const languages = {};
    events.forEach(e => {
        if (e.language) {
            const lang = e.language.split('-')[0];
            languages[lang] = (languages[lang] || 0) + 1;
        }
    });
    const topLang = Object.entries(languages).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('topLanguage').textContent = topLang ? topLang[0].toUpperCase() : 'N/A';
}
