const API_URL = 'https://5sz981rz6d.execute-api.us-east-1.amazonaws.com/prod';
let selectedProject = null;
let selectedProjectType = null;
let selectedChartMetric = 'events';

// Dropdown management
function toggleDropdown(id) {
    const menu = document.getElementById(id);
    menu.classList.toggle('hidden');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startDate').valueAsDate = new Date(Date.now() - 7*24*60*60*1000);
    document.getElementById('endDate').valueAsDate = new Date();
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
        }
    });
    
    loadProjects();
});

// Data loading
async function loadData() {
    const projectId = selectedProject;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!projectId) {
        alert('Please select a project');
        return;
    }

    setLoadingState();

    try {
        const token = localStorage.getItem('idToken');
        const response = await fetch(`${API_URL}/query?project_id=${projectId}&start=${startDate}&end=${endDate}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error('Failed to load data');
        
        const data = await response.json();
        
        renderMetrics(data.events, startDate, endDate);
        window.chartData = data.events;
        renderChart();
        renderAllCharts(data.events, startDate, endDate);
        renderAllTables(data.events);
        renderNavigationAnalysis(data.events);
        renderEventsTable(data.events);
    } catch (err) {
        document.getElementById('eventsTable').innerHTML = `<div class="empty-state">Error: ${err.message}</div>`;
    }
}

function setLoadingState() {
    const spinner = '<span class="spinner"></span>';
    const spinnerContainer = '<div class="spinner-container"><span class="spinner"></span></div>';
    
    ['totalEvents', 'pageviews', 'avgSessionDuration', 'uniqueScreens', 'topSource', 
     'pagesPerSession', 'returnRate', 'engagementRate', 'avgActiveTime', 'avgScrollDepth',
     'sessionFrequency', 'topCountry', 'topLanguage'].forEach(id => {
        document.getElementById(id).innerHTML = spinner;
    });
    
    ['eventsTable', 'eventsChart', 'trafficSourcesChart', 'sessionDurationChart', 
     'entryPagesTable', 'exitPagesTable', 'countriesTable', 'searchQueriesTable', 
     'engagingPagesTable', 'newVsReturningChart', 'userGrowthChart',
     'navigationPathsTable', 'pathFlowChart', 'dropOffPointsTable', 'backButtonChart'].forEach(id => {
        document.getElementById(id).innerHTML = spinnerContainer;
    });
}

function renderEventsTable(events) {
    if (events.length === 0) {
        document.getElementById('eventsTable').innerHTML = '<div class="empty-state">No events found for this date range.</div>';
        return;
    }

    const sorted = events.sort((a, b) => parseInt(b.sk) - parseInt(a.sk));
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
                <button onclick="changePage(${currentPage + 1})}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;
        document.getElementById('eventsTable').innerHTML = table;
    }
    
    window.changePage = (page) => {
        currentPage = page;
        renderTable();
    };
    
    renderTable();
}

function selectChartMetric(metric, displayName) {
    selectedChartMetric = metric;
    document.getElementById('chartMetricTrigger').innerHTML = `<span>${displayName}</span> <span>▼</span>`;
    document.getElementById('chartMetricMenu').classList.add('hidden');
    renderChart();
}
