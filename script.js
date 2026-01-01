// تحقق من الدخول (لم يتغير)
if (window.location.pathname.includes('index.html') && !localStorage.getItem('loggedIn')) {
    window.location.href = 'login.html';
}

// تسجيل الدخول (لم يتغير)
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('loggedIn', 'true');
            window.location.href = 'index.html';
        } else {
            document.getElementById('error').textContent = 'بيانات خاطئة!';
        }
    });
}

// ملاحظة: تم نقل مستمعي الأحداث لـ logout و nav داخل DOMContentLoaded لتجنب إضافة مستمعين مكررين عند تحميل السكربت قبل DOM.

// تحميل البيانات من LocalStorage (لم يتغير)
let students = JSON.parse(localStorage.getItem('students')) || [];
let attendance = JSON.parse(localStorage.getItem('attendance')) || {};

// عرض الطلاب (مصحح: إنشاء canvas آمن لكل طالب مع احتياطات وتجاوب عند فشل المكتبة)
function renderStudents() {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) {
        console.error('tbody غير موجود في الجدول');
        return;
    }
    tbody.innerHTML = ''; // مسح الجدول قبل إعادة الرسم
    students.forEach((student) => {
        const row = document.createElement('tr');
        row.dataset.id = student.code; // data-id لتحديد الطالب بدقة

        const tdName = document.createElement('td');
        tdName.textContent = student.name;

        const tdCode = document.createElement('td');
        tdCode.textContent = student.code;

        const tdQr = document.createElement('td');
        const qrContainer = document.createElement('div');
        qrContainer.className = 'qr-container';
        const canvas = document.createElement('canvas');
        canvas.className = 'qr-canvas';
        // تأكد من أبعاد الـ canvas
        const qrSize = 120;
        canvas.width = qrSize;
        canvas.height = qrSize;
        canvas.style.width = qrSize + 'px';
        canvas.style.height = qrSize + 'px';
        qrContainer.appendChild(canvas);
        tdQr.appendChild(qrContainer);

        const tdDownload = document.createElement('td');
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'تحميل';
        tdDownload.appendChild(downloadBtn);

        const tdDelete = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'حذف';
        tdDelete.appendChild(deleteBtn);

        row.appendChild(tdName);
        row.appendChild(tdCode);
        row.appendChild(tdQr);
        row.appendChild(tdDownload);
        row.appendChild(tdDelete);

        tbody.appendChild(row);

        // توليد QR داخل الـ canvas/حاوية المضافة مع دعم QRCodeStyling وفالباك
        (function generate() {
            const text = String(student.code);
            try {
                // Prefer styled QR if available
                if (typeof QRCodeStyling !== 'undefined') {
                    // remove previous renders
                    qrContainer.querySelectorAll('svg,canvas,img').forEach(n => n.remove());
                    const qr = new QRCodeStyling({
                        width: qrSize,
                        height: qrSize,
                        data: text,
                        dotsOptions: { color: '#000', type: 'rounded' },
                        backgroundOptions: { color: '#ffffff' }
                    });
                    qr.append(qrContainer);
                    row._qrInstance = qr; // keep for download
                    console.debug('QR (styled) generated for', text);
                    return;
                }

                // Fallback to existing QR lib
                if (typeof QRCode !== 'undefined') {
                    if (typeof QRCode.toCanvas === 'function') {
                        QRCode.toCanvas(canvas, text, { width: qrSize }, function(err) {
                            if (err) {
                                console.error('toCanvas فشل:', err);
                                if (typeof QRCode.toDataURL === 'function') {
                                    QRCode.toDataURL(text, { width: qrSize }, function(e2, url) {
                                        if (e2) return console.error('toDataURL فشل:', e2);
                                        const img = new Image();
                                        img.onload = () => {
                                            const ctx = canvas.getContext('2d');
                                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                        };
                                        img.src = url;
                                    });
                                }
                            } else {
                                console.debug('QR generated for', text);
                            }
                        });
                    } else if (typeof QRCode.toDataURL === 'function') {
                        QRCode.toDataURL(text, { width: qrSize }, function(e, url) {
                            if (e) return console.error('toDataURL فشل:', e);
                            const img = new Image();
                            img.onload = () => {
                                const ctx = canvas.getContext('2d');
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            };
                            img.src = url;
                            img.className = 'qr-img';
                            img.style.display = 'none';
                            qrContainer.appendChild(img);
                            console.debug('QR generated (dataURL) for', text);
                        });
                    } else {
                        console.error('مكتبة QR موجودة لكن لا تدعم toCanvas أو toDataURL');
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = '#eee';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = '#333';
                        ctx.textAlign = 'center';
                        ctx.font = '12px sans-serif';
                        ctx.fillText('QR غير متوفر', canvas.width/2, canvas.height/2);
                    }
                } else {
                    console.error('مكتبة QR غير متوفرة (QRCode undefined)');
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#eee';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#c00';
                    ctx.textAlign = 'center';
                    ctx.font = '12px sans-serif';
                    ctx.fillText('مكتبة QR مفقودة', canvas.width/2, canvas.height/2);
                }
            } catch (err) {
                console.error('خطأ أثناء توليد QR:', err);
            }
        })();
    });
}

// حذف طالب (لم يتغير)
function deleteStudent(code) {
    students = students.filter(s => s.code !== code); // فلترة المصفوفة
    localStorage.setItem('students', JSON.stringify(students));
    renderStudents(); // إعادة رسم الجدول
}

// تحميل QR (محدّث: البحث عن canvas داخل الصف عبر data-id أو img كبديل)
function downloadQR(code) {
    const rows = document.querySelectorAll('#studentsTable tbody tr');
    let targetRow = null;
    rows.forEach(r => { if (r.dataset.id === code) targetRow = r; });
    if (!targetRow) { console.error('صف الطالب غير موجود للرمز:', code); return; }

    // If we used QRCodeStyling instance, use its getRawData to make a PNG
    const inst = targetRow._qrInstance;
    if (inst && typeof inst.getRawData === 'function') {
        inst.getRawData('png').then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `qr-${code}.png`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }).catch(err => {
            console.error('فشل إنشاء blob من QR instance:', err);
        });
        return;
    }

    const canvas = targetRow.querySelector('canvas.qr-canvas');
    if (canvas) {
        try {
            const link = document.createElement('a');
            link.download = `qr-${code}.png`;
            link.href = canvas.toDataURL();
            link.click();
            return;
        } catch (err) {
            console.error('فشل تحويل الـ canvas إلى بيانات:', err);
        }
    }

    const svg = targetRow.querySelector('svg');
    if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement('a');
        link.download = `qr-${code}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        return;
    }

    const img = targetRow.querySelector('img.qr-img');
    if (img && img.src) {
        const link = document.createElement('a');
        link.download = `qr-${code}.png`;
        link.href = img.src;
        link.click();
        return;
    }

    console.error('QR صورة أو canvas غير موجودة للتحميل للرمز:', code);
}

// إضافة طالب (لم يتغير)
window.addEventListener('DOMContentLoaded', function() {
    console.log('DOM جاهز، بدء ربط الأحداث');
    document.getElementById('studentForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('تم النقر على زر إضافة الطالب');
        const name = document.getElementById('studentName').value;
        const code = document.getElementById('studentCode').value;
        if (name && code) {
            students.push({ name, code });
            localStorage.setItem('students', JSON.stringify(students));
            renderStudents();
            this.reset();
        }
    });

    // مولّد QR سريع: إنشاء ومعاينة وتحميل من نص/رمز مُدخل (الآن يدعم QRCodeStyling إن توفّرت)
    document.getElementById('generateBtn')?.addEventListener('click', function() {
        const text = document.getElementById('qrTextInput').value.trim();
        if (!text) return alert('الرجاء إدخال نص أو رمز لتوليد QR.');
        const canvas = document.getElementById('qrPreviewCanvas');
        const previewDiv = canvas.parentElement; // .qr-preview
        const size = 200;
        // نظف المعاينة القديمة
        previewDiv.querySelectorAll('svg,canvas,img').forEach(n => n.remove());
        canvas.width = size;
        canvas.height = size;
        try {
            if (typeof QRCodeStyling !== 'undefined') {
                const qr = new QRCodeStyling({
                    width: size,
                    height: size,
                    data: text,
                    dotsOptions: { color: '#000', type: 'rounded' },
                    backgroundOptions: { color: '#ffffff' },
                });
                qr.append(previewDiv);
                // حفظ المرجع للتحميل لاحقاً
                previewDiv._qrInstance = qr;
            } else if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
                QRCode.toCanvas(canvas, text, { width: size }, function(err) {
                    if (err) {
                        console.error('فشل إنشاء QR:', err);
                        alert('فشل إنشاء QR.');
                    }
                });
                previewDiv._qrInstance = null;
            } else if (typeof QRCode !== 'undefined' && typeof QRCode.toDataURL === 'function') {
                QRCode.toDataURL(text, { width: size }, function(e, url) {
                    if (e) { console.error('فشل toDataURL:', e); alert('فشل إنشاء QR.'); return; }
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0,0,canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                    img.src = url;
                    previewDiv.appendChild(img);
                    previewDiv._qrInstance = null;
                });
            } else {
                alert('مكتبة QR غير متوفرة.');
            }
        } catch (err) {
            console.error('خطأ عند إنشاء QR:', err);
            alert('حدث خطأ أثناء إنشاء QR.');
        }
    });

    document.getElementById('downloadPreviewBtn')?.addEventListener('click', function() {
        const canvas = document.getElementById('qrPreviewCanvas');
        const previewDiv = canvas.parentElement;
        const text = document.getElementById('qrTextInput').value.trim() || 'qr';
        // if styling instance present and supports getRawData
        if (previewDiv._qrInstance && typeof previewDiv._qrInstance.getRawData === 'function') {
            previewDiv._qrInstance.getRawData('png').then(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = `qr-${text}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            }).catch(err => {
                console.error('فشل الحصول على بيانات QR:', err);
                alert('فشل تحميل المعاينة.');
            });
            return;
        }
        // if svg present, download as svg
        const svg = previewDiv.querySelector('svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.download = `qr-${text}.svg`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }
        try {
            const link = document.createElement('a');
            link.download = `qr-${text}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error('فشل تحميل المعاينة:', err);
            alert('فشل تحميل المعاينة.');
        }
    });

    // event delegation للأزرار الديناميكية (لم يتغير)
    document.getElementById('studentsTable').addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-btn')) {
            const code = e.target.closest('tr').dataset.id; // الحصول على code من data-id
            deleteStudent(code);
        } else if (e.target.classList.contains('download-btn')) {
            const code = e.target.closest('tr').dataset.id;
            downloadQR(code);
        }
    });

    // زر حذف جميع الطلاب (لم يتغير)
    document.getElementById('deleteAllStudentsBtn')?.addEventListener('click', function() {
        if (confirm('هل أنت متأكد من حذف جميع الطلاب؟ هذا الإجراء لا يمكن التراجع عنه.')) {
            students = []; // مسح المصفوفة
            localStorage.setItem('students', JSON.stringify(students));
            renderStudents(); // مسح الجدول
        }
    });

    // باقي addEventListener (محدّث)
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        localStorage.removeItem('loggedIn');
        window.location.href = 'login.html';
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(this.dataset.section).classList.add('active');
            this.classList.add('active');
        });
    });

    // عرض البيانات الحالية عند التحميل
    renderStudents();
    if (typeof renderAttendance === 'function') renderAttendance();

    document.getElementById('markPresentBtn')?.addEventListener('click', function() {
        const code = document.getElementById('manualCode').value;
        const student = students.find(s => s.code === code);
        if (student) {
            const today = new Date().toDateString();
            if (!attendance[today]) attendance[today] = [];
            if (!attendance[today].includes(code)) {
                attendance[today].push(code);
                localStorage.setItem('attendance', JSON.stringify(attendance));
                renderAttendance();
            }
        }
    });

    let stream;
    document.getElementById('openCameraBtn')?.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            document.getElementById('camera').srcObject = stream;
            scanQR();
        } catch (err) {
            alert('خطأ في الوصول إلى الكاميرا: ' + err.message);
        }
    });

    document.getElementById('generatePdfBtn')?.addEventListener('click', function() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const today = new Date().toDateString();
        const presentCodes = attendance[today] || [];
        const absent = students.filter(s => !presentCodes.includes(s.code));

        doc.text('تقرير الحضور اليومي', 10, 10);
        doc.text(`التاريخ: ${today}`, 10, 18);

        doc.text('الطلاب الحاضرون:', 10, 28);
        presentCodes.forEach((code, i) => {
            const student = students.find(s => s.code === code);
            const name = student ? student.name : code;
            doc.text(`${i+1}. ${name}`, 10, 36 + i*8);
        });

        doc.text('الطلاب الغائبون:', 10, 40 + Math.max(presentCodes.length, 1)*8);
        absent.forEach((s, i) => {
            doc.text(`${i+1}. ${s.name}`, 10, 48 + Math.max(presentCodes.length, 1)*8 + i*8);
        });

        doc.save(`attendance-${today}.pdf`);
    });

    // --------------------
    // عرض الحضور في الواجهة
    function renderAttendance() {
        const today = new Date().toDateString();
        const presentCodes = attendance[today] || [];
        const ul = document.getElementById('presentList');
        if (!ul) return;
        ul.innerHTML = '';
        presentCodes.forEach(code => {
            const li = document.createElement('li');
            const student = students.find(s => s.code === code);
            li.textContent = student ? `${student.name} (${code})` : code;
            ul.appendChild(li);
        });

        // تحديث محتوى التقرير السريع إن وُجد
        const reportDiv = document.getElementById('reportContent');
        if (reportDiv) {
            const countText = `(${presentCodes.length}) طالب حاضر اليوم`;
            reportDiv.textContent = countText;
        }
    }

    // --------------------
    // مسح الحضور لليوم
    document.getElementById('resetAttendanceBtn')?.addEventListener('click', function() {
        const today = new Date().toDateString();
        if (confirm('هل أنت متأكد من إعادة تعيين الحضور اليومي؟')) {
            delete attendance[today];
            localStorage.setItem('attendance', JSON.stringify(attendance));
            renderAttendance();
        }
    });

    // --------------------
    // مسح وتشغيل الكاميرا + مسح QR
    let scannerActive = false;
    let scanLoopId = null;
    const lastScanTimes = {}; // لتفادي المسح المستمر لنفس الكود

    function stopCamera() {
        scannerActive = false;
        if (scanLoopId) {
            cancelAnimationFrame(scanLoopId);
            scanLoopId = null;
        }
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        const video = document.getElementById('camera');
        if (video) video.srcObject = null;
        const openBtn = document.getElementById('openCameraBtn');
        if (openBtn) openBtn.textContent = 'فتح الكاميرا';
    }

    async function scanQR() {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        if (!video || !canvas || !stream) return;
        const ctx = canvas.getContext('2d');
        scannerActive = true;

        const loop = () => {
            if (!scannerActive) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    if (code && code.data) {
                        const now = Date.now();
                        const data = code.data.trim();
                        const last = lastScanTimes[data] || 0;
                        if (now - last > 2000) { // سماح بفاصل 2 ثانية
                            lastScanTimes[data] = now;
                            // تسجيل الحضور إن وجد الطالب
                            const student = students.find(s => s.code === data);
                            if (student) {
                                const today = new Date().toDateString();
                                if (!attendance[today]) attendance[today] = [];
                                if (!attendance[today].includes(data)) {
                                    attendance[today].push(data);
                                    localStorage.setItem('attendance', JSON.stringify(attendance));
                                    renderAttendance();
                                }
                                // إشارة سريعة للمسح الناجح
                                video.classList.add('scan-success');
                                setTimeout(() => video.classList.remove('scan-success'), 200);
                            }
                        }
                    }
                } catch (err) {
                    // تجاهل أخطاء تحليل الصورة
                    console.error('خطأ في قراءة الإطار:', err);
                }
            }
            scanLoopId = requestAnimationFrame(loop);
        };
        loop();
    }

    // تعديل زر فتح الكاميرا ليصبح toggle
    document.getElementById('openCameraBtn')?.addEventListener('click', async function() {
        const openBtn = this;
        if (stream) {
            stopCamera();
            return;
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            const video = document.getElementById('camera');
            video.srcObject = stream;
            openBtn.textContent = 'إيقاف الكاميرا';
            scanQR();
        } catch (err) {
            alert('خطأ في الوصول إلى الكاميرا: ' + err.message);
        }
    });

    // عرض الحضور المبدئي
    renderAttendance();
});