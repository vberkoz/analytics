const API_URL = 'https://5sz981rz6d.execute-api.us-east-1.amazonaws.com/prod';
let selectedProject = null;
let selectedProjectType = null;

// Project type selection
function selectProjectType(type, displayName) {
    selectedProjectType = type;
    document.getElementById('projectTypeTrigger').innerHTML = `<span>${displayName}</span> <span>▼</span>`;
    document.getElementById('projectTypeMenu').classList.add('hidden');
}

// Project management
async function loadProjects() {
    const token = localStorage.getItem('idToken');
    const trigger = document.getElementById('projectTrigger');
    trigger.removeAttribute('style');
    trigger.className = 'dropdown-trigger dropdown-input';
    trigger.innerHTML = '<span class="spinner"></span>';
    
    const response = await fetch(`${API_URL}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    
    const menu = document.getElementById('projectMenu');
    menu.innerHTML = data.projects.map(p => 
        `<a href="#" onclick="selectProject('${p.projectId}', '${p.name}'); return false;">${p.name}</a>`
    ).join('');
    
    if (data.projects.length > 0) {
        selectProject(data.projects[0].projectId, data.projects[0].name);
    } else {
        trigger.removeAttribute('style');
        trigger.className = 'dropdown-trigger dropdown-input';
        trigger.innerHTML = '<span>No Projects</span> <span>▼</span>';
        document.getElementById('eventsTable').innerHTML = '<div class="empty-state">No projects yet. Click "+ Add Project" to get started.</div>';
    }
}

function selectProject(projectId, name) {
    selectedProject = projectId;
    const trigger = document.getElementById('projectTrigger');
    trigger.removeAttribute('style');
    trigger.className = 'dropdown-trigger dropdown-input';
    trigger.innerHTML = `<span>${name}</span> <span>▼</span>`;
    document.getElementById('projectMenu').classList.add('hidden');
    loadData();
}

async function deleteProject() {
    if (!selectedProject || !confirm('Delete this project and all its analytics data?')) return;
    
    const token = localStorage.getItem('idToken');
    await fetch(`${API_URL}/projects/${selectedProject}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    
    selectedProject = null;
    await loadProjects();
}

// Modal management
function showAddProject() {
    document.getElementById('addProjectModal').classList.remove('hidden');
}

function hideAddProject() {
    document.getElementById('addProjectModal').classList.add('hidden');
    document.getElementById('newProjectId').value = '';
    document.getElementById('newProjectName').value = '';
    selectedProjectType = null;
    document.getElementById('projectTypeTrigger').innerHTML = '<span>Select Project Type</span> <span>▼</span>';
}

async function addProject() {
    const projectId = document.getElementById('newProjectId').value;
    const name = document.getElementById('newProjectName').value;
    const type = selectedProjectType;
    
    if (!projectId || !name || !type) {
        alert('Please fill all fields including project type');
        return;
    }

    const token = localStorage.getItem('idToken');
    await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, name, type }),
    });

    hideAddProject();
    await loadProjects();
    showTrackingCode(projectId, type);
}

function showTrackingCode(projectId, type) {
    const code = '<script data-project="' + projectId + '" data-source="' + type + '" src="https://analytics.vberkoz.com/track.js"><' + '/script>';
    document.getElementById('trackingCode').value = code;
    document.getElementById('trackingCodeModal').classList.remove('hidden');
}

function hideTrackingCode() {
    document.getElementById('trackingCodeModal').classList.add('hidden');
}

function copyTrackingCode() {
    const code = document.getElementById('trackingCode');
    code.select();
    document.execCommand('copy');
    alert('Tracking code copied!');
}

// Dropdown management
function toggleDropdown(id) {
    const menu = document.getElementById(id);
    menu.classList.toggle('hidden');
}

// Data loading
async function loadData() {
    const projectId = selectedProject;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!projectId) {
        alert('Please select a project');
        return;
    }

    document.getElementById('totalEvents').innerHTML = '<span class="spinner"></span>';
    document.getElementById('pageviews').innerHTML = '<span class="spinner"></span>';
    document.getElementById('avgSessionDuration').innerHTML = '<span class="spinner"></span>';
    document.getElementById('uniqueScreens').innerHTML = '<span class="spinner"></span>';
    document.getElementById('topSource').innerHTML = '<span class="spinner"></span>';
    document.getElementById('pagesPerSession').innerHTML = '<span class="spinner"></span>';
    document.getElementById('returnRate').innerHTML = '<span class="spinner"></span>';
    document.getElementById('engagementRate').innerHTML = '<span class="spinner"></span>';
    document.getElementById('avgActiveTime').innerHTML = '<span class="spinner"></span>';
    document.getElementById('avgScrollDepth').innerHTML = '<span class="spinner"></span>';
    document.getElementById('eventsTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('eventsChart').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('trafficSourcesChart').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('sessionDurationChart').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('entryPagesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('exitPagesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('countriesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('searchQueriesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('engagingPagesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';

    try {
        const token = localStorage.getItem('idToken');
        const response = await fetch(`${API_URL}/query?project_id=${projectId}&start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to load data');
        
        const data = await response.json();
        
        document.getElementById('totalEvents').textContent = data.events.length;
        document.getElementById('pageviews').textContent = data.events.filter(e => e.event_type === 'pageview').length;
        document.getElementById('uniqueScreens').textContent = new Set(data.events.map(e => e.screen)).size;

        // Session duration analysis
        const sessionEnds = data.events.filter(e => e.event_type === 'session_end' && parseInt(e.session_duration) > 0);
        const avgDuration = sessionEnds.length > 0 
            ? Math.floor(sessionEnds.reduce((sum, e) => sum + parseInt(e.session_duration), 0) / sessionEnds.length)
            : 0;
        const minutes = Math.floor(avgDuration / 60);
        const seconds = avgDuration % 60;
        document.getElementById('avgSessionDuration').textContent = `${minutes}m ${seconds}s`;

        // Attribution analysis
        const sources = {};
        data.events.forEach(e => {
            if (e.utm_source) {
                const key = `${e.utm_source}/${e.utm_medium}`;
                sources[key] = (sources[key] || 0) + 1;
            }
        });
        const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
        document.getElementById('topSource').textContent = topSource ? topSource[0] : 'N/A';

        // Pages per session analysis
        const sessionPages = {};
        data.events.forEach(e => {
            if (e.event_type === 'pageview' && e.session_id) {
                sessionPages[e.session_id] = (sessionPages[e.session_id] || 0) + 1;
            }
        });
        const sessions = Object.values(sessionPages);
        const avgPages = sessions.length > 0 
            ? (sessions.reduce((sum, count) => sum + count, 0) / sessions.length).toFixed(1)
            : '0.0';
        document.getElementById('pagesPerSession').textContent = avgPages;

        // Return visitor rate
        const visitors = {};
        data.events.forEach(e => {
            if (e.event_type === 'pageview' && e.visitor_id) {
                if (!visitors[e.visitor_id]) {
                    visitors[e.visitor_id] = { sessions: new Set(), isReturning: e.is_returning };
                }
                visitors[e.visitor_id].sessions.add(e.session_id);
            }
        });
        const visitorList = Object.values(visitors);
        const returningCount = visitorList.filter(v => v.sessions.size > 1 || v.isReturning).length;
        const returnRate = visitorList.length > 0 ? ((returningCount / visitorList.length) * 100).toFixed(1) : '0.0';
        document.getElementById('returnRate').textContent = `${returnRate}%`;

        // Store data globally for chart updates
        window.chartData = data.events;
        
        // Render initial chart
        renderChart();

        // Content engagement depth
        const engagements = data.events.filter(e => e.event_type === 'engagement' && parseInt(e.total_time) > 0);
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



        // Traffic sources donut chart
        const utmSources = {};
        data.events.forEach(e => {
            if (e.utm_source) {
                utmSources[e.utm_source] = (utmSources[e.utm_source] || 0) + 1;
            }
        });
        
        const sourceData = Object.entries(utmSources)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count);
        
        if (sourceData.length > 0) {
            const total = sourceData.reduce((sum, s) => sum + s.count, 0);
            const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
            
            const size = 300;
            const cx = size / 2;
            const cy = size / 2;
            const radius = 100;
            const innerRadius = 60;
            
            let currentAngle = -90;
            const paths = sourceData.map((s, i) => {
                const angle = (s.count / total) * 360;
                const startAngle = currentAngle * Math.PI / 180;
                const endAngle = (currentAngle + angle) * Math.PI / 180;
                
                const x1 = cx + radius * Math.cos(startAngle);
                const y1 = cy + radius * Math.sin(startAngle);
                const x2 = cx + radius * Math.cos(endAngle);
                const y2 = cy + radius * Math.sin(endAngle);
                const x3 = cx + innerRadius * Math.cos(endAngle);
                const y3 = cy + innerRadius * Math.sin(endAngle);
                const x4 = cx + innerRadius * Math.cos(startAngle);
                const y4 = cy + innerRadius * Math.sin(startAngle);
                
                const largeArc = angle > 180 ? 1 : 0;
                const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                
                currentAngle += angle;
                return `<path d="${path}" fill="${colors[i % colors.length]}" stroke="white" stroke-width="2"/>`;
            }).join('');
            
            const legend = sourceData.map((s, i) => {
                const pct = ((s.count / total) * 100).toFixed(1);
                return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:16px;height:16px;background:${colors[i % colors.length]};border-radius:2px;"></div><span style="font-size:14px;color:#333;">${s.source}: ${s.count} (${pct}%)</span></div>`;
            }).join('');
            
            const chart = `
                <div style="display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;">
                    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                        ${paths}
                    </svg>
                    <div>${legend}</div>
                </div>
            `;
            document.getElementById('trafficSourcesChart').innerHTML = chart;
        } else {
            document.getElementById('trafficSourcesChart').innerHTML = '<div class="empty-state">No traffic source data available.</div>';
        }

        // Session duration distribution bar chart
        const durations = data.events
            .filter(e => e.event_type === 'session_end' && parseInt(e.session_duration) > 0)
            .map(e => parseInt(e.session_duration));
        
        if (durations.length > 0) {
            const buckets = { '0-30s': 0, '30s-1m': 0, '1-2m': 0, '2-5m': 0, '5-10m': 0, '10m+': 0 };
            durations.forEach(d => {
                if (d < 30) buckets['0-30s']++;
                else if (d < 60) buckets['30s-1m']++;
                else if (d < 120) buckets['1-2m']++;
                else if (d < 300) buckets['2-5m']++;
                else if (d < 600) buckets['5-10m']++;
                else buckets['10m+']++;
            });
            
            const maxCount = Math.max(...Object.values(buckets));
            const width = 600;
            const height = 250;
            const padding = 40;
            const barWidth = (width - padding * 2) / Object.keys(buckets).length;
            
            const bars = Object.entries(buckets).map(([label, count], i) => {
                const barHeight = (count / maxCount) * (height - padding * 2);
                const x = padding + i * barWidth;
                const y = height - padding - barHeight;
                return `
                    <rect x="${x + 5}" y="${y}" width="${barWidth - 10}" height="${barHeight}" fill="#4f46e5"/>
                    <text x="${x + barWidth / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#666">${label}</text>
                    <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#333">${count}</text>
                `;
            }).join('');
            
            const chart = `
                <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;">
                    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
                    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
                    ${bars}
                </svg>
            `;
            document.getElementById('sessionDurationChart').innerHTML = chart;
        } else {
            document.getElementById('sessionDurationChart').innerHTML = '<div class="empty-state">No session duration data available.</div>';
        }

        // Entry page analysis
        const entryPages = {};
        data.events.forEach(e => {
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

        // Exit page analysis
        const exitPages = {};
        data.events.forEach(e => {
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

        // Country analysis
        const countries = {};
        data.events.forEach(e => {
            const country = e.country || 'XX';
            countries[country] = (countries[country] || 0) + 1;
        });
        
        const countryData = Object.entries(countries)
            .map(([code, count]) => ({
                code,
                count,
                percentage: ((count / data.events.length) * 100).toFixed(1)
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

        // Search queries analysis
        const searches = {};
        data.events.forEach(e => {
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

        // Top engaging pages
        const pageEngagement = {};
        data.events.forEach(e => {
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

        if (data.events.length === 0) {
            document.getElementById('eventsTable').innerHTML = '<div class="empty-state">No events found for this date range.</div>';
            return;
        }

        const sorted = data.events.sort((a, b) => parseInt(b.sk) - parseInt(a.sk));
        const perPage = 20;
        let currentPage = 1;
        
        function renderTable() {
            const start = (currentPage - 1) * perPage;
            const end = start + perPage;
            const page = sorted.slice(start, end);
            const totalPages = Math.ceil(sorted.length / perPage);
            
            const table = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Event Type</th>
                                <th>Path</th>
                                <th>Source</th>
                                <th>Campaign</th>
                                <th>Screen</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${page.map(e => `
                                <tr>
                                    <td>${new Date(parseInt(e.sk)).toLocaleString()}</td>
                                    <td>${e.event_type}</td>
                                    <td>${e.path}</td>
                                    <td>${e.utm_source ? `${e.utm_source}/${e.utm_medium}` : '-'}</td>
                                    <td>${e.utm_campaign || '-'}</td>
                                    <td>${e.screen}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="pagination">
                    <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                    <span>Page ${currentPage} of ${totalPages}</span>
                    <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
                </div>
            `;
            document.getElementById('eventsTable').innerHTML = table;
        }
        
        window.changePage = (page) => {
            currentPage = page;
            renderTable();
        };
        
        renderTable();
    } catch (err) {
        document.getElementById('eventsTable').innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startDate').valueAsDate = new Date(Date.now() - 7*24*60*60*1000);
    document.getElementById('endDate').valueAsDate = new Date();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
        }
    });
    
    loadProjects();
});

// Chart rendering
let selectedChartMetric = 'events';

function selectChartMetric(metric, displayName) {
    selectedChartMetric = metric;
    document.getElementById('chartMetricTrigger').innerHTML = `<span>${displayName}</span> <span>▼</span>`;
    document.getElementById('chartMetricMenu').classList.add('hidden');
    renderChart();
}

function renderChart() {
    const metric = selectedChartMetric;
    const data = window.chartData;
    
    if (!data || data.length === 0) {
        document.getElementById('eventsChart').innerHTML = '<div class="empty-state">No data available.</div>';
        return;
    }
    
    const chartStartDate = new Date(document.getElementById('startDate').value);
    const chartEndDate = new Date(document.getElementById('endDate').value);
    const dataByDate = {};
    
    // Initialize all dates
    for (let d = new Date(chartStartDate); d <= chartEndDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dataByDate[dateStr] = { events: 0, users: new Set(), pageviews: 0, sessions: new Set(), engagements: [], durations: [] };
    }
    
    // Aggregate data by date
    data.forEach(e => {
        const date = new Date(parseInt(e.sk)).toISOString().split('T')[0];
        if (dataByDate[date]) {
            dataByDate[date].events++;
            if (e.visitor_id) dataByDate[date].users.add(e.visitor_id);
            if (e.event_type === 'pageview') dataByDate[date].pageviews++;
            if (e.session_id) dataByDate[date].sessions.add(e.session_id);
            if (e.event_type === 'engagement' && parseInt(e.engagement_rate) > 0) {
                dataByDate[date].engagements.push(parseInt(e.engagement_rate));
            }
            if (e.event_type === 'session_end' && parseInt(e.session_duration) > 0) {
                dataByDate[date].durations.push(parseInt(e.session_duration));
            }
        }
    });
    
    const dates = Object.keys(dataByDate).sort();
    let counts, maxCount, title, formatValue;
    
    switch(metric) {
        case 'users':
            counts = dates.map(d => dataByDate[d].users.size);
            title = 'Active Users Over Time';
            formatValue = v => v;
            break;
        case 'pageviews':
            counts = dates.map(d => dataByDate[d].pageviews);
            title = 'Pageviews Over Time';
            formatValue = v => v;
            break;
        case 'sessions':
            counts = dates.map(d => dataByDate[d].sessions.size);
            title = 'Sessions Over Time';
            formatValue = v => v;
            break;
        case 'engagement':
            counts = dates.map(d => {
                const engs = dataByDate[d].engagements;
                return engs.length > 0 ? Math.round(engs.reduce((a, b) => a + b, 0) / engs.length) : 0;
            });
            title = 'Engagement Rate Over Time';
            formatValue = v => v + '%';
            break;
        case 'duration':
            counts = dates.map(d => {
                const durs = dataByDate[d].durations;
                return durs.length > 0 ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0;
            });
            title = 'Avg Session Duration Over Time';
            formatValue = v => Math.floor(v / 60) + 'm';
            break;
        default:
            counts = dates.map(d => dataByDate[d].events);
            title = 'Events Over Time';
            formatValue = v => v;
    }
    
    document.getElementById('chartTitle').textContent = title;
    maxCount = Math.max(...counts, 1);
    
    const width = 800;
    const height = 200;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const points = dates.map((date, i) => {
        const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight - (counts[i] / maxCount) * chartHeight;
        return `${x},${y}`;
    }).join(' ');
    
    const chart = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%;">
            <polyline points="${points}" fill="none" stroke="#4f46e5" stroke-width="2"/>
            ${dates.map((date, i) => {
                const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
                const y = padding + chartHeight - (counts[i] / maxCount) * chartHeight;
                return `<circle cx="${x}" cy="${y}" r="4" fill="#4f46e5"/>`;
            }).join('')}
            <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
            ${dates.map((date, i) => {
                if (dates.length <= 7 || i % Math.ceil(dates.length / 7) === 0) {
                    const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
                    const [y, m, d] = date.split('-');
                    return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#666">${d}.${m}.${y}</text>`;
                }
                return '';
            }).join('')}
            <text x="10" y="${padding}" font-size="12" fill="#666">${formatValue(maxCount)}</text>
            <text x="10" y="${height - padding}" font-size="12" fill="#666">0</text>
        </svg>
    `;
    document.getElementById('eventsChart').innerHTML = chart;
}