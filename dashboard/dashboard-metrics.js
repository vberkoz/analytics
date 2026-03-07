function renderMetrics(events, startDate, endDate) {
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
}
