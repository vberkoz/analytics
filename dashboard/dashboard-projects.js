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
        `<a href="#" onclick="selectProject('${p.projectId}', '${p.name}', '${p.type}'); return false;">${p.name} (${p.type})</a>`
    ).join('');
    
    if (data.projects.length > 0) {
        selectProject(data.projects[0].projectId, data.projects[0].name, data.projects[0].type);
    } else {
        trigger.removeAttribute('style');
        trigger.className = 'dropdown-trigger dropdown-input';
        trigger.innerHTML = '<span>No Projects</span> <span>▼</span>';
        document.getElementById('eventsTable').innerHTML = '<div class="empty-state">No projects yet. Click "+ Add Project" to get started.</div>';
    }
}

function selectProject(projectId, name, type) {
    selectedProject = projectId;
    selectedProjectType = type;
    const trigger = document.getElementById('projectTrigger');
    trigger.removeAttribute('style');
    trigger.className = 'dropdown-trigger dropdown-input';
    trigger.innerHTML = `<span>${name} (${type})</span> <span>▼</span>`;
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
