// Navigation Path Analysis - UX Optimization
// Analyzes user navigation patterns to identify common paths, drop-off points, and UX issues

function renderNavigationAnalysis(events) {
    if (selectedProjectType === 'landing') {
        // Hide navigation analysis for landing pages
        return;
    }
    renderNavigationPaths(events);
    renderPathFlow(events);
    renderDropOffPoints(events);
    renderBackButtonUsage(events);
}

function renderNavigationPaths(events) {
    const container = document.getElementById('navigationPathsTable');
    if (!container) return;

    // Group events by session to build paths
    const sessions = {};
    events.filter(e => e.event_type === 'pageview').forEach(e => {
        if (!e.session_id) return;
        if (!sessions[e.session_id]) {
            sessions[e.session_id] = [];
        }
        sessions[e.session_id].push({
            path: e.path,
            timestamp: parseInt(e.sk),
            prev_path: e.prev_path
        });
    });

    // Sort events within each session by timestamp
    Object.keys(sessions).forEach(sid => {
        sessions[sid].sort((a, b) => a.timestamp - b.timestamp);
    });

    // Build path sequences (limit to first 5 pages per session for common patterns)
    const pathSequences = {};
    Object.values(sessions).forEach(session => {
        if (session.length < 2) return; // Need at least 2 pages for a path
        const sequence = session.slice(0, 5).map(p => p.path).join(' → ');
        pathSequences[sequence] = (pathSequences[sequence] || 0) + 1;
    });

    // Sort by frequency
    const sortedPaths = Object.entries(pathSequences)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    if (sortedPaths.length === 0) {
        container.innerHTML = '<div class="empty-state">No navigation paths found</div>';
        return;
    }

    const totalSessions = Object.keys(sessions).length;
    const html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Navigation Path</th>
                        <th>Sessions</th>
                        <th>% of Total</th>
                        <th>Avg Steps</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPaths.map(([path, count]) => {
                        const steps = path.split(' → ').length;
                        const percentage = ((count / totalSessions) * 100).toFixed(1);
                        return `
                            <tr>
                                <td class="path-cell">${escapeHtml(path)}</td>
                                <td>${count}</td>
                                <td>${percentage}%</td>
                                <td>${steps}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

function renderPathFlow(events) {
    const container = document.getElementById('pathFlowChart');
    if (!container) return;

    // Build page transitions (from -> to)
    const transitions = {};
    const pageViews = events.filter(e => e.event_type === 'pageview' && e.prev_path);
    
    pageViews.forEach(e => {
        const from = e.prev_path || '(entry)';
        const to = e.path;
        const key = `${from}|||${to}`;
        transitions[key] = (transitions[key] || 0) + 1;
    });

    // Get top transitions
    const sortedTransitions = Object.entries(transitions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

    if (sortedTransitions.length === 0) {
        container.innerHTML = '<div class="empty-state">No path flow data available</div>';
        return;
    }

    // Build Sankey-style visualization data
    const nodes = new Set();
    sortedTransitions.forEach(([key]) => {
        const [from, to] = key.split('|||');
        nodes.add(from);
        nodes.add(to);
    });

    const nodeList = Array.from(nodes);
    const maxFlow = sortedTransitions[0][1];

    const html = `
        <div class="flow-chart">
            <div class="flow-header">
                <span>From Page</span>
                <span>Flow</span>
                <span>To Page</span>
                <span>Users</span>
            </div>
            ${sortedTransitions.map(([key, count]) => {
                const [from, to] = key.split('|||');
                const width = Math.max(20, (count / maxFlow) * 100);
                return `
                    <div class="flow-row">
                        <div class="flow-from">${escapeHtml(from)}</div>
                        <div class="flow-bar-container">
                            <div class="flow-bar" style="width: ${width}%"></div>
                        </div>
                        <div class="flow-to">${escapeHtml(to)}</div>
                        <div class="flow-count">${count}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    container.innerHTML = html;
}

function renderDropOffPoints(events) {
    const container = document.getElementById('dropOffPointsTable');
    if (!container) return;

    // Analyze where users exit (last page in session)
    const sessions = {};
    events.filter(e => e.event_type === 'pageview').forEach(e => {
        if (!e.session_id) return;
        if (!sessions[e.session_id]) {
            sessions[e.session_id] = [];
        }
        sessions[e.session_id].push({
            path: e.path,
            timestamp: parseInt(e.sk)
        });
    });

    // Find exit pages (last page in each session)
    const exitPages = {};
    const pageDepths = {};
    
    Object.values(sessions).forEach(session => {
        if (session.length === 0) return;
        session.sort((a, b) => a.timestamp - b.timestamp);
        const exitPage = session[session.length - 1].path;
        exitPages[exitPage] = (exitPages[exitPage] || 0) + 1;
        
        // Track average depth before exit
        if (!pageDepths[exitPage]) {
            pageDepths[exitPage] = [];
        }
        pageDepths[exitPage].push(session.length);
    });

    // Calculate exit rate per page
    const pageViews = {};
    events.filter(e => e.event_type === 'pageview').forEach(e => {
        pageViews[e.path] = (pageViews[e.path] || 0) + 1;
    });

    const exitData = Object.entries(exitPages).map(([path, exits]) => {
        const views = pageViews[path] || exits;
        const exitRate = (exits / views) * 100;
        const avgDepth = pageDepths[path].reduce((a, b) => a + b, 0) / pageDepths[path].length;
        return { path, exits, views, exitRate, avgDepth };
    });

    // Sort by exit rate (highest concern)
    const sortedExits = exitData.sort((a, b) => b.exitRate - a.exitRate).slice(0, 15);

    if (sortedExits.length === 0) {
        container.innerHTML = '<div class="empty-state">No drop-off data available</div>';
        return;
    }

    const html = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Page</th>
                        <th>Exits</th>
                        <th>Views</th>
                        <th>Exit Rate</th>
                        <th>Avg Depth</th>
                        <th>Concern</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedExits.map(item => {
                        const concern = item.exitRate > 70 ? 'High' : item.exitRate > 40 ? 'Medium' : 'Low';
                        const concernClass = concern.toLowerCase();
                        return `
                            <tr>
                                <td>${escapeHtml(item.path)}</td>
                                <td>${item.exits}</td>
                                <td>${item.views}</td>
                                <td>${item.exitRate.toFixed(1)}%</td>
                                <td>${item.avgDepth.toFixed(1)}</td>
                                <td><span class="concern-badge ${concernClass}">${concern}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

function renderBackButtonUsage(events) {
    const container = document.getElementById('backButtonChart');
    if (!container) return;

    // Detect back button usage by analyzing navigation patterns
    // Back button is indicated when prev_path matches a recent page in the journey
    const sessions = {};
    events.filter(e => e.event_type === 'pageview').forEach(e => {
        if (!e.session_id) return;
        if (!sessions[e.session_id]) {
            sessions[e.session_id] = [];
        }
        sessions[e.session_id].push({
            path: e.path,
            prev_path: e.prev_path,
            timestamp: parseInt(e.sk)
        });
    });

    let totalNavigations = 0;
    let backButtonCount = 0;
    const backPages = {};

    Object.values(sessions).forEach(session => {
        session.sort((a, b) => a.timestamp - b.timestamp);
        const history = [];
        
        session.forEach((page, idx) => {
            if (idx === 0) {
                history.push(page.path);
                return;
            }
            
            totalNavigations++;
            
            // Check if current page was visited before (back button indicator)
            const prevIndex = history.lastIndexOf(page.path);
            if (prevIndex !== -1 && prevIndex < history.length - 1) {
                backButtonCount++;
                backPages[page.path] = (backPages[page.path] || 0) + 1;
            }
            
            history.push(page.path);
        });
    });

    const backRate = totalNavigations > 0 ? ((backButtonCount / totalNavigations) * 100).toFixed(1) : '0.0';
    
    // Top pages where users go back
    const sortedBackPages = Object.entries(backPages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const html = `
        <div class="metric-summary">
            <div class="metric-item">
                <div class="metric-label">Back Button Rate</div>
                <div class="metric-value">${backRate}%</div>
                <div class="metric-detail">${backButtonCount} of ${totalNavigations} navigations</div>
            </div>
        </div>
        ${sortedBackPages.length > 0 ? `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Page Users Return From</th>
                            <th>Back Button Uses</th>
                            <th>% of Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedBackPages.map(([path, count]) => {
                            const percentage = ((count / backButtonCount) * 100).toFixed(1);
                            return `
                                <tr>
                                    <td>${escapeHtml(path)}</td>
                                    <td>${count}</td>
                                    <td>${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<div class="empty-state">No back button usage detected</div>'}
    `;
    container.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
