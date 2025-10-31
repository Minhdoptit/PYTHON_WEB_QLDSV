// Load profile on DOM ready
// (the form submit handler is attached at the bottom of this file)
// Ensure user is authenticated (login.js also runs global auth checks)
if (!localStorage.getItem('token')) {
    window.location.href = '/login';
}

// ====== HÀM ĐĂNG XUẤT ======
// ✨ [SỬA] Thêm hàm logout() để xóa token và đăng xuất
function logout() {
    console.log("🚪 Đang đăng xuất...");
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    console.log("✅ Đã xóa token");
    window.location.href = "/login";
}

// ====== HÀM TIỆN ÍCH ======
// ✨ [SỬA] Thêm hàm getToken() - lấy token từ localStorage
function getToken() {
    return localStorage.getItem('token');
}

// ✨ [SỬA] Thêm hàm getAuthHeaders() - tạo headers Authorization
function getAuthHeaders() {
    const token = getToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}


function makeNotif(message, isError = false, timeout = 3500) {
    const n = document.createElement('div');
    n.className = 'notification' + (isError ? ' error' : '');
    n.textContent = message;
    document.getElementById('notif-container').appendChild(n);
    setTimeout(() => n.remove(), timeout);
}

function handleError(err) {
    console.error(err);
    const msg = (err && err.message) ? err.message : 'Đã xảy ra lỗi';
    makeNotif(msg, true);
}

// ✨ [SỬA] Uncomment và fix hàm fetchProfile() - lấy dữ liệu user từ API


async function fetchProfile() {
    try {
        console.log('📥 Đang lấy dữ liệu profile...'); // ✨ [DEBUG]

        // Gọi API GET /api/me để lấy thông tin user hiện tại
        const res = await fetch('/api/me', { headers: getAuthHeaders() });

        console.log('📊 fetchProfile response status:', res.status); // ✨ [DEBUG]

        if (!res.ok) {
            console.error('❌ fetchProfile error status:', res.status); // ✨ [DEBUG]
            throw new Error('Không thể lấy thông tin người dùng');
        }

        const data = await res.json();
        console.log('✅ User data loaded:', data); // ✨ [DEBUG] Log full data

        // ✨ [SỬA] Điền sidebar với thông tin từ API
        // Fill sidebar
        document.getElementById('username').textContent = data.username || '-';
        document.getElementById('user-role').textContent = data.role || '-';
        document.getElementById('student-code').textContent = (data.student_profile && data.student_profile.student_code) || (data.teacher_profile && data.teacher_profile.teacher_id) || '-';
        document.getElementById('birthdate-display').textContent = (data.student_profile && data.student_profile.birthdate) || '-';

        // ✨ [SỬA] Điền form tự động từ dữ liệu API
        // Fill form
        document.getElementById('fullName').value = data.full_name || '';
        document.getElementById('email').value = data.email || '';

        // ✨ [SỬA] Hiển thị form khác nhau tùy theo role
        // Show role-specific sections
        if (data.role === 'student') {
            document.getElementById('studentFields').style.display = 'block';
            document.getElementById('teacherFields').style.display = 'none';
            if (data.student_profile) {
                document.getElementById('studentCode').value = data.student_profile.student_code || '';
                if (data.student_profile.birthdate) document.getElementById('birthdate').value = data.student_profile.birthdate;
            }
        } else if (data.role === 'teacher') {
            document.getElementById('teacherFields').style.display = 'block';
            document.getElementById('studentFields').style.display = 'none';
            if (data.teacher_profile) {
                document.getElementById('department').value = data.teacher_profile.department || '';
                document.getElementById('title').value = data.teacher_profile.title || '';
            }
        } else {
            document.getElementById('studentFields').style.display = 'none';
            document.getElementById('teacherFields').style.display = 'none';
        }

        console.log('✅ Form filled successfully'); // ✨ [DEBUG]

    } catch (err) {
        console.error('💥 fetchProfile error:', err); // ✨ [DEBUG]
        handleError(err);
    }
}

// ✨ [SỬA] Fix hàm updateProfile() - dùng getAuthHeaders() thay vì hardcode

async function updateProfile(body) {
    try {
        console.log('📤 Gửi dữ liệu cập nhật:', body); // ✨ [DEBUG] Log payload

        // Gọi API PUT /api/me để cập nhật profile
        const res = await fetch('/api/me', {
            method: 'PUT',
             headers: getAuthHeaders(), // ✨ [SỬA] Sử dụng getAuthHeaders() helper
            body: JSON.stringify(body)
        });

        console.log('📊 Response status:', res.status); // ✨ [DEBUG] Log status


        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error('❌ API error:', errData); // ✨ [DEBUG] Log error
            throw new Error(errData.detail || `HTTP ${res.status}: Cập nhật thất bại`);
        }

        const responseData = await res.json();
        console.log('✅ API response:', responseData); // ✨ [DEBUG] Log success response

        makeNotif('Cập nhật hồ sơ thành công');

         // ✨ [SỬA] Thêm flag để studentHome reload data khi quay lại
        sessionStorage.setItem('reloadStudentData', 'true');
        console.log('✅ Set reloadStudentData flag');


        await fetchProfile();
    } catch (err) {

        console.error('💥 updateProfile error:', err); // ✨ [DEBUG] Chi tiết lỗi
        handleError(err);
    }
}

document.addEventListener('DOMContentLoaded', () => fetchProfile());

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    console.log('📝 Form submitted'); // ✨ [DEBUG]

    // ✨ [DEBUG] Validate required fields
    const fullName = document.getElementById('fullName').value;
    if (!fullName || fullName.trim() === '') {
        makeNotif('❌ Họ tên không được để trống', true);
        console.warn('⚠️  Họ tên trống');
        return;
    }

    const payload = {
        full_name: fullName,
        email: document.getElementById('email').value
    };
    const np = document.getElementById('newPassword').value;
    if (np) payload.password = np;

    // role-specific
    if (document.getElementById('studentFields').style.display !== 'none') {
        const b = document.getElementById('birthdate').value;
        if (b) payload.birthdate = b;
    }
    if (document.getElementById('teacherFields').style.display !== 'none') {
        payload.department = document.getElementById('department').value || null;
        payload.title = document.getElementById('title').value || null;
    }
    console.log('📤 Payload to send:', payload); // ✨ [DEBUG]

    await updateProfile(payload);
});
