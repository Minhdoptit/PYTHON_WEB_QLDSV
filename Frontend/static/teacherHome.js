// teacherHome.js - Dynamic API version
const API_BASE = '/teacher';
let currentClassId = null;

// Utility functions (giữ nguyên)
function notify(msg, type='success'){
    const c = document.getElementById('notif-container');
    if(!c) return;
    const n = document.createElement('div');
    n.className = 'notification' + (type==='error'?' error':'');
    n.textContent = msg;
    c.appendChild(n);
    setTimeout(()=>{ try{ n.remove(); }catch(e){} }, 3000);
}

function escapeHtml(s){
    if(s===null||s===undefined) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function computeAverage(grades){
    const a = grades?.attendance ?? 0;
    const m = grades?.mid ?? 0;
    const f = grades?.final ?? 0;
    return Math.round((a*0.2 + m*0.3 + f*0.5)*10)/10;
}

// API helper
async function fetchAPI(endpoint, options = {}){
    const token = localStorage.getItem('token');
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if(!response.ok){
        if(response.status === 401){
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

// Load classes
async function loadClasses(){
    try{
        const classes = await fetchAPI('/classes');
        renderClassCards(classes);
    }catch(error){
        console.error('Error loading classes:', error);
        notify('Lỗi khi tải danh sách lớp', 'error');
    }
}

// Render class cards
function renderClassCards(classes){
    const grid = document.getElementById('classes-grid');
    if(!grid) return;

    if(!classes.length){
        grid.innerHTML = '<div style="padding:1rem;"><em>Chưa có lớp học nào.</em></div>';
        return;
    }

    grid.innerHTML = classes.map(c => `
        <div class="class-card" onclick="openClassModal(${c.id})">
            <h3>${escapeHtml(c.name)}</h3>
            <div class="class-meta"><strong>Môn:</strong> ${escapeHtml(c.subject)}</div>
            <div class="class-meta"><strong>SV:</strong> ${c.student_count}</div>
        </div>
    `).join('');
}

// Open class modal
async function openClassModal(classId){
    currentClassId = classId;
    try{
        const students = await fetchAPI(`/students/${classId}`);
        renderStudentTable(students);
        document.getElementById('class-modal').classList.remove('hidden');
    }catch(error){
        console.error('Error loading students:', error);
        notify('Lỗi khi tải danh sách sinh viên', 'error');
    }
}

function closeModal(){
    currentClassId = null;
    document.getElementById('class-modal').classList.add('hidden');
}

// Render student table
function renderStudentTable(students){
    const tbody = document.getElementById('student-tbody');
    if(!tbody) return;

    if(!students.length){
        tbody.innerHTML = '<tr><td colspan="8"><em>Chưa có sinh viên.</em></td></tr>';
        return;
    }

    tbody.innerHTML = students.map((s, idx) => {
        const att = s.grades?.attendance ?? '';
        const mid = s.grades?.mid ?? '';
        const fin = s.grades?.final ?? '';
        const avg = (att==='' && mid==='' && fin==='') ? '-' : computeAverage(s.grades);

        return `<tr>
            <td>${idx+1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.student_code)}</td>
            <td><input class="input-grade" value="${att}"
                onchange="updateGrade(${s.id}, 'attendance', this.value)"></td>
            <td><input class="input-grade" value="${mid}"
                onchange="updateGrade(${s.id}, 'mid', this.value)"></td>
            <td><input class="input-grade" value="${fin}"
                onchange="updateGrade(${s.id}, 'final', this.value)"></td>
            <td>${avg}</td>
        </tr>`;
    }).join('');
}

// Update grade
async function updateGrade(studentId, field, value){
    if(!currentClassId) return;

    const raw = value.trim();
    if(raw === '') return;

    const num = Number(raw);
    if(Number.isNaN(num)) return;

    const grade = Math.max(0, Math.min(10, Math.round(num*10)/10));

    try{
        await fetchAPI(`/grade/${studentId}/${currentClassId}`, {
            method: 'PUT',
            body: JSON.stringify({ grade })
        });
        notify('Cập nhật điểm thành công');
        openClassModal(currentClassId);
    }catch(error){
        console.error('Error updating grade:', error);
        notify('Lỗi khi cập nhật điểm', 'error');
    }
}

function logout(){
    localStorage.removeItem('token');
    window.location.href = '/login';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadClasses();
});
