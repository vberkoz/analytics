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
    document.getElementById('projectTrigger').innerHTML = '<span class="spinner"></span>';
    
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
        document.getElementById('projectTrigger').innerHTML = '<span>No Projects</span> <span>▼</span>';
        document.getElementById('eventsTable').innerHTML = '<div class="empty-state">No projects yet. Click "+ Add Project" to get started.</div>';
    }
}

function selectProject(projectId, name) {
    selectedProject = projectId;
    document.getElementById('projectTrigger').innerHTML = `<span>${name}</span> <span>▼</span>`;
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
    document.getElementById('eventsTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';
    document.getElementById('exitPagesTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';

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

        // Exit page analysis
        const exitPages = {};
        const pageViews = {};
        data.events.forEach(e => {
            if (e.event_type === 'pageview') {
                pageViews[e.path] = (pageViews[e.path] || 0) + 1;
            }
            if (e.event_type === 'session_end') {
                exitPages[e.path] = (exitPages[e.path] || 0) + 1;
            }
        });
        
        const exitData = Object.entries(exitPages)
            .map(([path, exits]) => ({
                path,
                exits,
                views: pageViews[path] || exits,
                rate: ((exits / (pageViews[path] || exits)) * 100).toFixed(1)
            }))
            .sort((a, b) => b.exits - a.exits)
            .slice(0, 10);
        
        if (exitData.length > 0) {
            const exitTable = `
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Page</th>
                                <th>Exits</th>
                                <th>Pageviews</th>
                                <th>Exit Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${exitData.map(e => `
                                <tr>
                                    <td>${e.path}</td>
                                    <td>${e.exits}</td>
                                    <td>${e.views}</td>
                                    <td>${e.rate}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            document.getElementById('exitPagesTable').innerHTML = exitTable;
        } else {
            document.getElementById('exitPagesTable').innerHTML = '<div class="empty-state">No exit data available.</div>';
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