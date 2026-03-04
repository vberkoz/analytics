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

    document.getElementById('eventsTable').innerHTML = '<div class="spinner-container"><span class="spinner"></span></div>';

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
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event Type</th>
                            <th>Path</th>
                            <th>Referrer</th>
                            <th>Screen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${page.map(e => `
                            <tr>
                                <td>${new Date(parseInt(e.sk)).toLocaleString()}</td>
                                <td>${e.event_type}</td>
                                <td>${e.path}</td>
                                <td>${e.referrer || '-'}</td>
                                <td>${e.screen}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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