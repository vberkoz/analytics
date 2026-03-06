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
    
    for (let d = new Date(chartStartDate); d <= chartEndDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dataByDate[dateStr] = { events: 0, users: new Set(), pageviews: 0, sessions: new Set(), engagements: [], durations: [] };
    }
    
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

function renderAllCharts(events, startDate, endDate) {
    renderNewVsReturningChart(events);
    renderUserGrowthChart(events, startDate, endDate);
    renderTrafficSourcesChart(events);
    renderSessionDurationChart(events);
}

function renderNewVsReturningChart(events) {
    const newUsers = new Set();
    const returningUsers = new Set();
    
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.visitor_id) {
            if (e.is_returning) {
                returningUsers.add(e.visitor_id);
            } else {
                newUsers.add(e.visitor_id);
            }
        }
    });
    
    const newCount = newUsers.size;
    const returningCount = returningUsers.size;
    const totalUsers = newCount + returningCount;
    
    if (totalUsers > 0) {
        const newPct = ((newCount / totalUsers) * 100).toFixed(1);
        const returningPct = ((returningCount / totalUsers) * 100).toFixed(1);
        
        const size = 300;
        const cx = size / 2;
        const cy = size / 2;
        const radius = 100;
        const innerRadius = 60;
        
        let paths = '';
        
        if (newCount > 0 && returningCount > 0) {
            const newAngle = (newCount / totalUsers) * 360;
            const newStart = -90 * Math.PI / 180;
            const newEnd = (-90 + newAngle) * Math.PI / 180;
            const retStart = newEnd;
            const retEnd = (270) * Math.PI / 180;
            
            const newX1 = cx + radius * Math.cos(newStart);
            const newY1 = cy + radius * Math.sin(newStart);
            const newX2 = cx + radius * Math.cos(newEnd);
            const newY2 = cy + radius * Math.sin(newEnd);
            const newX3 = cx + innerRadius * Math.cos(newEnd);
            const newY3 = cy + innerRadius * Math.sin(newEnd);
            const newX4 = cx + innerRadius * Math.cos(newStart);
            const newY4 = cy + innerRadius * Math.sin(newStart);
            
            const retX1 = cx + radius * Math.cos(retStart);
            const retY1 = cy + radius * Math.sin(retStart);
            const retX2 = cx + radius * Math.cos(retEnd);
            const retY2 = cy + radius * Math.sin(retEnd);
            const retX3 = cx + innerRadius * Math.cos(retEnd);
            const retY3 = cy + innerRadius * Math.sin(retEnd);
            const retX4 = cx + innerRadius * Math.cos(retStart);
            const retY4 = cy + innerRadius * Math.sin(retStart);
            
            const newLargeArc = newAngle > 180 ? 1 : 0;
            const retLargeArc = (360 - newAngle) > 180 ? 1 : 0;
            
            paths = `<path d="M ${newX1} ${newY1} A ${radius} ${radius} 0 ${newLargeArc} 1 ${newX2} ${newY2} L ${newX3} ${newY3} A ${innerRadius} ${innerRadius} 0 ${newLargeArc} 0 ${newX4} ${newY4} Z" fill="#10b981" stroke="white" stroke-width="2"/><path d="M ${retX1} ${retY1} A ${radius} ${radius} 0 ${retLargeArc} 1 ${retX2} ${retY2} L ${retX3} ${retY3} A ${innerRadius} ${innerRadius} 0 ${retLargeArc} 0 ${retX4} ${retY4} Z" fill="#4f46e5" stroke="white" stroke-width="2"/>`;
        } else if (newCount > 0) {
            paths = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#10b981" stroke="white" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="white"/>`;
        } else {
            paths = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#4f46e5" stroke="white" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="white"/>`;
        }
        
        const chart = `
            <div style="display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;">
                <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    ${paths}
                </svg>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:16px;height:16px;background:#10b981;border-radius:2px;"></div>
                        <span style="font-size:14px;color:#333;">New: ${newCount} (${newPct}%)</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="width:16px;height:16px;background:#4f46e5;border-radius:2px;"></div>
                        <span style="font-size:14px;color:#333;">Returning: ${returningCount} (${returningPct}%)</span>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('newVsReturningChart').innerHTML = chart;
    } else {
        document.getElementById('newVsReturningChart').innerHTML = '<div class="empty-state">No user data available.</div>';
    }
}

function renderUserGrowthChart(events, startDate, endDate) {
    const chartStartDate = new Date(startDate);
    const chartEndDate = new Date(endDate);
    const growthByDate = {};
    
    for (let d = new Date(chartStartDate); d <= chartEndDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        growthByDate[dateStr] = { new: new Set(), returning: new Set() };
    }
    
    events.forEach(e => {
        if (e.event_type === 'pageview' && e.visitor_id) {
            const date = new Date(parseInt(e.sk)).toISOString().split('T')[0];
            if (growthByDate[date]) {
                if (e.is_returning) {
                    growthByDate[date].returning.add(e.visitor_id);
                } else {
                    growthByDate[date].new.add(e.visitor_id);
                }
            }
        }
    });
    
    const dates = Object.keys(growthByDate).sort();
    const newCounts = dates.map(d => growthByDate[d].new.size);
    const returningCounts = dates.map(d => growthByDate[d].returning.size);
    const maxCount = Math.max(...newCounts, ...returningCounts, 1);
    
    if (dates.length > 0) {
        const width = 800;
        const height = 250;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        const newPoints = dates.map((date, i) => {
            const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - (newCounts[i] / maxCount) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
        
        const returningPoints = dates.map((date, i) => {
            const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - (returningCounts[i] / maxCount) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
        
        const chart = `
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%;">
                <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ddd" stroke-width="1"/>
                <polyline points="${newPoints}" fill="none" stroke="#10b981" stroke-width="2"/>
                <polyline points="${returningPoints}" fill="none" stroke="#4f46e5" stroke-width="2"/>
                ${dates.map((date, i) => {
                    const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
                    const newY = padding + chartHeight - (newCounts[i] / maxCount) * chartHeight;
                    const retY = padding + chartHeight - (returningCounts[i] / maxCount) * chartHeight;
                    return `<circle cx="${x}" cy="${newY}" r="3" fill="#10b981"/><circle cx="${x}" cy="${retY}" r="3" fill="#4f46e5"/>`;
                }).join('')}
                ${dates.map((date, i) => {
                    if (dates.length <= 7 || i % Math.ceil(dates.length / 7) === 0) {
                        const x = padding + (i / (dates.length - 1 || 1)) * chartWidth;
                        const [y, m, d] = date.split('-');
                        return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#666">${d}.${m}.${y}</text>`;
                    }
                    return '';
                }).join('')}
                <text x="10" y="${padding}" font-size="12" fill="#666">${maxCount}</text>
                <text x="10" y="${height - padding}" font-size="12" fill="#666">0</text>
                <text x="${padding + 20}" y="${padding - 10}" font-size="12" fill="#10b981">● New</text>
                <text x="${padding + 90}" y="${padding - 10}" font-size="12" fill="#4f46e5">● Returning</text>
            </svg>
        `;
        document.getElementById('userGrowthChart').innerHTML = chart;
    } else {
        document.getElementById('userGrowthChart').innerHTML = '<div class="empty-state">No growth data available.</div>';
    }
}

function renderTrafficSourcesChart(events) {
    const utmSources = {};
    events.forEach(e => {
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
}

function renderSessionDurationChart(events) {
    const durations = events
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
}
