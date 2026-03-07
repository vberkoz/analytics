function renderAllTables(events) {
    if (selectedProjectType === 'landing') {
        renderCTAClicksTable(events);
        renderCountriesTable(events);
        renderEngagingPagesTable(events);
        // Hide multipage-specific tables
        document.getElementById('entryPagesTable').parentElement.style.display = 'none';
        document.getElementById('exitPagesTable').parentElement.style.display = 'none';
        document.getElementById('searchQueriesTable').parentElement.style.display = 'none';
        document.getElementById('navigationPathsTable').parentElement.style.display = 'none';
        document.getElementById('pathFlowChart').parentElement.style.display = 'none';
        document.getElementById('dropOffPointsTable').parentElement.parentElement.style.display = 'none';
        document.getElementById('timezonesTable').parentElement.style.display = 'none';
        document.getElementById('languagesTable').parentElement.style.display = 'none';
    } else {
        renderEntryPagesTable(events);
        renderExitPagesTable(events);
        renderCountriesTable(events);
        renderSearchQueriesTable(events);
        renderEngagingPagesTable(events);
        renderTimezonesTable(events);
        renderLanguagesTable(events);
        // Show all tables
        document.querySelectorAll('.events').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.widgets-row').forEach(el => el.style.display = 'grid');
    }
}

function renderCTAClicksTable(events) {
    const ctaClicks = {};
    events.forEach(e => {
        if (e.event_type === 'cta_click' && e.cta_text) {
            const key = e.cta_text;
            if (!ctaClicks[key]) {
                ctaClicks[key] = { count: 0, type: e.cta_type, href: e.cta_href };
            }
            ctaClicks[key].count++;
        }
    });
    
    const ctaData = Object.entries(ctaClicks)
        .map(([text, data]) => ({ text, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    
    if (ctaData.length > 0) {
        const ctaTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>CTA Text</th>
                            <th>Type</th>
                            <th>Clicks</th>
                            <th>Destination</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ctaData.map(c => `
                            <tr>
                                <td>${c.text}</td>
                                <td>${c.type}</td>
                                <td>${c.count}</td>
                                <td>${c.href ? (c.href.length > 40 ? c.href.substring(0, 37) + '...' : c.href) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('searchQueriesTable').innerHTML = ctaTable;
        document.getElementById('searchQueriesTable').parentElement.querySelector('h2').textContent = 'CTA Clicks';
        document.getElementById('searchQueriesTable').parentElement.style.display = 'block';
    } else {
        document.getElementById('searchQueriesTable').innerHTML = '<div class="empty-state">No CTA clicks yet.</div>';
        document.getElementById('searchQueriesTable').parentElement.querySelector('h2').textContent = 'CTA Clicks';
        document.getElementById('searchQueriesTable').parentElement.style.display = 'block';
    }
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

function renderTimezonesTable(events) {
    const timezones = {};
    events.forEach(e => {
        if (e.timezone) {
            timezones[e.timezone] = (timezones[e.timezone] || 0) + 1;
        }
    });
    
    const timezoneData = Object.entries(timezones)
        .map(([tz, count]) => ({
            timezone: tz,
            count,
            percentage: ((count / events.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    if (timezoneData.length > 0) {
        const timezoneTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>Timezone</th>
                            <th>Events</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${timezoneData.map(t => `
                            <tr>
                                <td>${t.timezone}</td>
                                <td>${t.count}</td>
                                <td>${t.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('timezonesTable').innerHTML = timezoneTable;
    } else {
        document.getElementById('timezonesTable').innerHTML = '<div class="empty-state">No timezone data available.</div>';
    }
}

function renderLanguagesTable(events) {
    const languages = {};
    events.forEach(e => {
        if (e.language) {
            languages[e.language] = (languages[e.language] || 0) + 1;
        }
    });
    
    const languageData = Object.entries(languages)
        .map(([lang, count]) => ({
            language: lang,
            count,
            percentage: ((count / events.length) * 100).toFixed(1)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    const languageNames = {
        'en': 'English', 'en-US': 'English (US)', 'en-GB': 'English (UK)',
        'es': 'Spanish', 'es-ES': 'Spanish (Spain)', 'es-MX': 'Spanish (Mexico)',
        'fr': 'French', 'fr-FR': 'French (France)', 'fr-CA': 'French (Canada)',
        'de': 'German', 'de-DE': 'German (Germany)',
        'it': 'Italian', 'it-IT': 'Italian (Italy)',
        'pt': 'Portuguese', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)',
        'ja': 'Japanese', 'ja-JP': 'Japanese (Japan)',
        'zh': 'Chinese', 'zh-CN': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
        'ko': 'Korean', 'ko-KR': 'Korean (Korea)',
        'ru': 'Russian', 'ru-RU': 'Russian (Russia)',
        'ar': 'Arabic', 'ar-SA': 'Arabic (Saudi Arabia)',
        'hi': 'Hindi', 'hi-IN': 'Hindi (India)',
        'nl': 'Dutch', 'nl-NL': 'Dutch (Netherlands)',
        'pl': 'Polish', 'pl-PL': 'Polish (Poland)',
        'sv': 'Swedish', 'sv-SE': 'Swedish (Sweden)',
        'da': 'Danish', 'da-DK': 'Danish (Denmark)',
        'fi': 'Finnish', 'fi-FI': 'Finnish (Finland)',
        'no': 'Norwegian', 'no-NO': 'Norwegian (Norway)'
    };
    
    if (languageData.length > 0) {
        const languageTable = `
            <div class="table-wrapper">
                <table class="fit-content">
                    <thead>
                        <tr>
                            <th>Language</th>
                            <th>Events</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${languageData.map(l => `
                            <tr>
                                <td>${languageNames[l.language] || l.language}</td>
                                <td>${l.count}</td>
                                <td>${l.percentage}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('languagesTable').innerHTML = languageTable;
    } else {
        document.getElementById('languagesTable').innerHTML = '<div class="empty-state">No language data available.</div>';
    }
}
