function renderAllTables(events) {
    renderEntryPagesTable(events);
    renderExitPagesTable(events);
    renderCountriesTable(events);
    renderSearchQueriesTable(events);
    renderEngagingPagesTable(events);
}

function renderEntryPagesTable(events) {
    const entryPages = {};
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.is_entry) {
            entryPages[e.path] = (entryPages[e.path] || 0) + 1;
        }
    });
    
    const entryData = Object.entries(entryPages)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    if (entryData.length > 0) {
        const maxCount = Math.max(...entryData.map(e => e.count));
        const barHeight = 30;
        const gap = 10;
        const labelWidth = 200;
        const chartWidth = 400;
        const height = entryData.length * (barHeight + gap) + 20;
        
        const bars = entryData.map((e, i) => {
            const barWidth = (e.count / maxCount) * chartWidth;
            const y = i * (barHeight + gap) + 10;
            const displayPath = e.path.length > 30 ? e.path.substring(0, 27) + '...' : e.path;
            return `
                <text x="0" y="${y + barHeight / 2 + 5}" font-size="14" fill="#333">${displayPath}</text>
                <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#4f46e5" rx="4"/>
                <text x="${labelWidth + barWidth + 8}" y="${y + barHeight / 2 + 5}" font-size="14" fill="#333">${e.count}</text>
            `;
        }).join('');
        
        const chart = `
            <svg width="100%" height="${height}" viewBox="0 0 ${labelWidth + chartWidth + 60} ${height}" style="max-width:100%;">
                ${bars}
            </svg>
        `;
        document.getElementById('entryPagesTable').innerHTML = chart;
    } else {
        document.getElementById('entryPagesTable').innerHTML = '<div class="empty-state">No entry page data available.</div>';
    }
}

function renderExitPagesTable(events) {
    const exitPages = {};
    events.forEach(e => {
        if (e.event_type === 'session_end') {
            exitPages[e.path] = (exitPages[e.path] || 0) + 1;
        }
    });
    
    const exitData = Object.entries(exitPages)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    if (exitData.length > 0) {
        const maxCount = Math.max(...exitData.map(e => e.count));
        const barHeight = 30;
        const gap = 10;
        const labelWidth = 200;
        const chartWidth = 400;
        const height = exitData.length * (barHeight + gap) + 20;
        
        const bars = exitData.map((e, i) => {
            const barWidth = (e.count / maxCount) * chartWidth;
            const y = i * (barHeight + gap) + 10;
            const displayPath = e.path.length > 30 ? e.path.substring(0, 27) + '...' : e.path;
            return `
                <text x="0" y="${y + barHeight / 2 + 5}" font-size="14" fill="#333">${displayPath}</text>
                <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#ef4444" rx="4"/>
                <text x="${labelWidth + barWidth + 8}" y="${y + barHeight / 2 + 5}" font-size="14" fill="#333">${e.count}</text>
            `;
        }).join('');
        
        const chart = `
            <svg width="100%" height="${height}" viewBox="0 0 ${labelWidth + chartWidth + 60} ${height}" style="max-width:100%;">
                ${bars}
            </svg>
        `;
        document.getElementById('exitPagesTable').innerHTML = chart;
    } else {
        document.getElementById('exitPagesTable').innerHTML = '<div class="empty-state">No exit data available.</div>';
    }
}

function renderCountriesTable(events) {
    const countries = {};
    events.forEach(e => {
        const country = e.country || 'XX';
        countries[country] = (countries[country] || 0) + 1;
    });
    
    const countryData = Object.entries(countries)
        .map(([code, count]) => ({
            code,
            count,
            percentage: ((count / events.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    const countryNames = {
        'US': '🇺🇸 United States', 'GB': '🇬🇧 United Kingdom', 'DE': '🇩🇪 Germany',
        'FR': '🇫🇷 France', 'CA': '🇨🇦 Canada', 'AU': '🇦🇺 Australia',
        'JP': '🇯🇵 Japan', 'CN': '🇨🇳 China', 'IN': '🇮🇳 India',
        'BR': '🇧🇷 Brazil', 'MX': '🇲🇽 Mexico', 'ES': '🇪🇸 Spain',
        'IT': '🇮🇹 Italy', 'NL': '🇳🇱 Netherlands', 'SE': '🇸🇪 Sweden',
        'PL': '🇵🇱 Poland', 'BE': '🇧🇪 Belgium', 'CH': '🇨🇭 Switzerland',
        'AT': '🇦🇹 Austria', 'NO': '🇳🇴 Norway', 'DK': '🇩🇰 Denmark',
        'FI': '🇫🇮 Finland', 'IE': '🇮🇪 Ireland', 'PT': '🇵🇹 Portugal',
        'XX': '🌍 Unknown'
    };
    
    if (countryData.length > 0) {
        const countryTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>Country</th>
                            <th>Events</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${countryData.map(c => `
                            <tr>
                                <td>${countryNames[c.code] || `🌍 ${c.code}`}</td>
                                <td>${c.count}</td>
                                <td>${c.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('countriesTable').innerHTML = countryTable;
    } else {
        document.getElementById('countriesTable').innerHTML = '<div class="empty-state">No country data available.</div>';
    }
}

function renderSearchQueriesTable(events) {
    const searches = {};
    events.forEach(e => {
        if (e.event_type === 'search' && e.search_query) {
            searches[e.search_query] = (searches[e.search_query] || 0) + 1;
        }
    });
    
    const searchData = Object.entries(searches)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    
    if (searchData.length > 0) {
        const searchTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>Search Query</th>
                            <th>Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${searchData.map(s => `
                            <tr>
                                <td>"${s.query}"</td>
                                <td>${s.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('searchQueriesTable').innerHTML = searchTable;
    } else {
        document.getElementById('searchQueriesTable').innerHTML = '<div class="empty-state">No search queries yet.</div>';
    }
}

function renderEngagingPagesTable(events) {
    const pageEngagement = {};
    events.forEach(e => {
        if (e.event_type === 'engagement' && e.path && parseInt(e.total_time) > 0) {
            if (!pageEngagement[e.path]) {
                pageEngagement[e.path] = { total: 0, active: 0, scroll: 0, count: 0 };
            }
            pageEngagement[e.path].total += parseInt(e.total_time) || 0;
            pageEngagement[e.path].active += parseInt(e.active_time) || 0;
            pageEngagement[e.path].scroll += parseInt(e.max_scroll) || 0;
            pageEngagement[e.path].count++;
        }
    });
    
    const engagingPages = Object.entries(pageEngagement)
        .map(([path, data]) => ({
            path,
            engRate: Math.round((data.active / data.total) * 100),
            avgActive: Math.floor(data.active / data.count),
            avgScroll: Math.floor(data.scroll / data.count),
            views: data.count
        }))
        .sort((a, b) => b.engRate - a.engRate)
        .slice(0, 10);
    
    if (engagingPages.length > 0) {
        const engagingTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>Engagement Rate</th>
                            <th>Avg Active Time</th>
                            <th>Avg Scroll</th>
                            <th>Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${engagingPages.map(p => {
                            const mins = Math.floor(p.avgActive / 60);
                            const secs = p.avgActive % 60;
                            return `
                                <tr>
                                    <td>${p.path}</td>
                                    <td>${p.engRate}%</td>
                                    <td>${mins}m ${secs}s</td>
                                    <td>${p.avgScroll}%</td>
                                    <td>${p.views}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('engagingPagesTable').innerHTML = engagingTable;
    } else {
        document.getElementById('engagingPagesTable').innerHTML = '<div class="empty-state">No engagement data yet.</div>';
    }
}
