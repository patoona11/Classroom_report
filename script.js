const SHEET_URL = "https://docs.google.com/spreadsheets/d/11j3QJ9IQlG3NX3UGJKsPjyuFXGdYWhSvaOI0geRLcIo/gviz/tq?tqx=out:csv";

let allData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchTeacher = document.getElementById('searchTeacher');
const searchBranch = document.getElementById('searchBranch');
const searchCourse = document.getElementById('searchCourse');
const totalClassesEl = document.getElementById('totalClasses');
const totalTeachersEl = document.getElementById('totalTeachers');
const lastUpdateTimeEl = document.getElementById('lastUpdateTime');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    
    // Add event listeners for search
    searchTeacher.addEventListener('input', debounce(filterData, 300));
    searchBranch.addEventListener('input', debounce(filterData, 300));
    searchCourse.addEventListener('input', debounce(filterData, 300));
});

function fetchData() {
    Papa.parse(SHEET_URL, {
        download: true,
        header: true, // Use first row as keys
        complete: function(results) {
            console.log("Raw Data:", results.data);
            if (!results.data || results.data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: orange;">พบข้อมูลแต่ตารางว่างเปล่า</td></tr>`;
                return;
            }
            
            // Find keys dynamically
            const keys = Object.keys(results.data[0]);
            const teacherKey = keys.find(k => k.includes('อาจารย์ผู้สอน'));
            const branchKey = keys.find(k => k.includes('สาขาวิชา'));
            const courseKey = keys.find(k => k.includes('ชื่อรายวิชา'));
            
            // Filter out empty rows based on teacher name
            const validData = results.data.filter(row => teacherKey && row[teacherKey] && row[teacherKey].trim() !== '');
            
            if (validData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: orange;">ไม่พบข้อมูลอาจารย์ผู้สอน โปรดตรวจสอบรูปแบบคอลัมน์ใน Google Sheets</td></tr>`;
                return;
            }
            
            allData = validData.map(row => {
                return {
                    ...row,
                    _teacherKey: teacherKey,
                    _branchKey: branchKey,
                    _courseKey: courseKey
                };
            });
            
            filteredData = [...allData];
            
            updateStats();
            updateLastUpdateTime();
            renderTable(filteredData);
        },
        error: function(err) {
            console.error("Error fetching data:", err);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">เกิดข้อผิดพลาดในการดึงข้อมูล กรุณาลองใหม่อีกครั้ง</td></tr>`;
        }
    });
}

function updateStats() {
    const total = allData.length;
    totalClassesEl.textContent = total;
    
    const uniqueTeachers = new Set();
    allData.forEach(row => {
        const teacher = row[row._teacherKey];
        if (teacher) {
            uniqueTeachers.add(teacher.trim());
        }
    });
    totalTeachersEl.textContent = uniqueTeachers.size;
    
    // Calculate percentage based on 818 target and divide by 10 as requested
    const percentage = (((total * 100) / 818) / 10).toFixed(2);
    const percentageEl = document.getElementById('percentageValue');
    if (percentageEl) {
        percentageEl.textContent = `${percentage}%`;
    }
}

function updateLastUpdateTime() {
    const now = new Date();
    lastUpdateTimeEl.textContent = now.toLocaleTimeString('th-TH');
}

function filterData() {
    const teacherQuery = searchTeacher.value.toLowerCase().replace(/\s+/g, '');
    const branchQuery = searchBranch.value.toLowerCase().replace(/\s+/g, '');
    const courseQuery = searchCourse.value.toLowerCase().replace(/\s+/g, '');
    
    filteredData = allData.filter(row => {
        const teacher = (row[row._teacherKey] || '').toLowerCase().replace(/\s+/g, '');
        const branch = (row[row._branchKey] || '').toLowerCase().replace(/\s+/g, '');
        const course = (row[row._courseKey] || '').toLowerCase().replace(/\s+/g, '');
        
        return teacher.includes(teacherQuery) && 
               branch.includes(branchQuery) && 
               course.includes(courseQuery);
    });
    
    currentPage = 1;
    renderTable(filteredData);
}

function renderTable(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    
    paginatedData.forEach(row => {
        const tr = document.createElement('tr');
        
        const teacher = row[row._teacherKey] || '-';
        const branch = row[row._branchKey] || '-';
        const course = row[row._courseKey] || '-';
        
        const keys = Object.keys(row);
        const levelKey = keys.find(k => k.includes('ระดับชั้น'));
        const level = levelKey ? (row[levelKey] || '-') : '-';
        // Note: CSV header has spaces padding around some column names, we need to handle potential exact match or use the closest ones
        // In the CSV preview: "  รหัสเข้าห้องเรียน (Class Code)  " and "  ลิงก์ห้องเรียน Google Classroom  "
        // Let's find the correct keys dynamically in case of trailing spaces
        
        const codeKey = keys.find(k => k.includes('รหัสเข้าห้องเรียน'));
        const linkKey = keys.find(k => k.includes('ลิงก์ห้องเรียน'));
        
        const code = codeKey ? (row[codeKey] || '-') : '-';
        const link = linkKey ? (row[linkKey] || '') : '';
        
        let linkHTML = '-';
        if (link && link.startsWith('http')) {
            linkHTML = `<a href="${link}" target="_blank" class="btn-link"><i class="ri-external-link-line"></i> เข้าเรียน</a>`;
        }
        
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500; color: var(--dark);">${teacher}</div>
            </td>
            <td><span class="badge badge-branch">${branch}</span></td>
            <td><div style="max-width: 250px; white-space: normal; line-height: 1.4;">${course}</div></td>
            <td><span class="badge badge-level">${level}</span></td>
            <td><code style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 6px;">${code}</code></td>
            <td>${linkHTML}</td>
        `;
        tableBody.appendChild(tr);
    });
    
    renderPagination(data.length);
}

function renderPagination(totalRows) {
    const paginationEl = document.getElementById('pagination');
    paginationEl.innerHTML = '';
    
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (totalPages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i> ก่อนหน้า';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationEl.appendChild(prevBtn);
    
    const infoSpan = document.createElement('span');
    infoSpan.className = 'page-info';
    infoSpan.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    paginationEl.appendChild(infoSpan);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = 'ถัดไป <i class="ri-arrow-right-s-line"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationEl.appendChild(nextBtn);
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable(filteredData);
    }
}

// Utility: Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
