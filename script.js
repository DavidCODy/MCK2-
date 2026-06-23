const STORAGE_KEY = 'training_msk2_records';
const ADMIN_PASSWORD = 'admin123'; // смените на свой

let records = [];
let isAdmin = false;

// ---------- ЗАГРУЗКА / СОХРАНЕНИЕ ----------
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try { records = JSON.parse(stored); } catch(e) { records = []; }
    } else {
        // демо-записи для первого запуска
        records = [
            { wine: "AFI Воронцовский", employee: "Простосердова Александра Дмитриевна", event: "Дегустация Bordeaux", type: "Дегустация", status: "Пройдено", date: new Date().toLocaleDateString() },
            { wine: "Sky House", employee: "Емелин Станислав", event: "Тренинг по скриптам", type: "Тренинг по продажам", status: "Запланировано", date: new Date().toLocaleDateString() }
        ];
        saveData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---------- ОТРИСОВКА SELECT'ОВ ----------
function renderSelects() {
    const wineSelect = document.getElementById('wineSelect');
    const empSelect = document.getElementById('employeeSelect');

    wineSelect.innerHTML = '<option value="">— выберите —</option>';
    WINERIES.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        wineSelect.appendChild(opt);
    });

    wineSelect.addEventListener('change', function() {
        const selectedWine = this.value;
        empSelect.innerHTML = '<option value="">— выберите —</option>';
        if (selectedWine && EMPLOYEES[selectedWine]) {
            EMPLOYEES[selectedWine].forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp;
                opt.textContent = emp;
                empSelect.appendChild(opt);
            });
        }
    });

    // Фильтр статистики
    const filterWine = document.getElementById('filterWine');
    filterWine.innerHTML = '<option value="__all">🌐 Все винотеки (территория)</option>';
    WINERIES.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        filterWine.appendChild(opt);
    });
    filterWine.addEventListener('change', updateStats);
}

// ---------- ДОБАВЛЕНИЕ ЗАПИСИ ----------
function addRecord() {
    const wine = document.getElementById('wineSelect').value;
    const employee = document.getElementById('employeeSelect').value;
    const eventName = document.getElementById('eventInput').value.trim();
    const type = document.getElementById('typeSelect').value;
    const status = document.getElementById('statusSelect').value;
    const dateValue = document.getElementById('dateInput').value; // строка YYYY-MM-DD

    if (!wine || !employee || !eventName) {
        alert('Заполните все поля: Винотека, Сотрудник, Мероприятие');
        return;
    }

    // Если дата не выбрана – используем сегодняшнюю
    let displayDate;
    if (dateValue) {
        // Преобразуем YYYY-MM-DD в локальный формат (например, DD.MM.YYYY)
        const parts = dateValue.split('-');
        displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
    } else {
        displayDate = new Date().toLocaleDateString();
    }

    const newRecord = {
        wine,
        employee,
        event: eventName,
        type,
        status,
        date: displayDate,
        // сохраняем также исходную дату для сортировки (опционально)
        rawDate: dateValue || new Date().toISOString().split('T')[0]
    };
    records.push(newRecord);
    saveData();

    // Очищаем поля (кроме даты – оставляем как есть или сбрасываем)
    document.getElementById('eventInput').value = '';
    // Можно сбросить дату:
    // document.getElementById('dateInput').value = '';
    renderAll();
}
// ---------- ИЗМЕНЕНИЕ СТАТУСА ----------
function changeStatus(index, newStatus) {
    if (index >= 0 && index < records.length) {
        records[index].status = newStatus;
        saveData();
        renderAll();
    }
}

// ---------- УДАЛЕНИЕ (только админ) ----------
function deleteRecord(index) {
    if (!isAdmin) {
        document.getElementById('adminStatus').textContent = '❌ Требуется авторизация администратора!';
        return;
    }
    if (confirm('Удалить запись?')) {
        records.splice(index, 1);
        saveData();
        renderAll();
    }
}

// ---------- ОБНОВЛЕНИЕ ТАБЛИЦЫ (ГЛАВНАЯ) ----------
function renderTable() {
    const tbody = document.getElementById('recordsBody');
    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Нет записей</td></tr>`;
        return;
    }

    let html = '';
    records.forEach((r, i) => {
        let badgeClass = 'badge-gray';
        if (r.status === 'Пройдено') badgeClass = 'badge-green';
        else if (r.status === 'Пропущено') badgeClass = 'badge-red';

        // Проверка на обязательное мероприятие
        const reqInfo = getRequiredEventInfo(r.event);
        let reqCell = '';
        if (reqInfo.isRequired && r.status === 'Пройдено') {
            reqCell = `<span title="Для аттестации грейд ${reqInfo.grade}" style="cursor:help; color:#2d6a2d; font-size:18px;">✅</span>`;
        } else if (reqInfo.isRequired) {
            reqCell = `<span title="Для аттестации грейд ${reqInfo.grade}" style="cursor:help; color:#b13a3a; font-size:18px;">❌</span>`;
        } else {
            reqCell = '—';
        }

        const statusOptions = ['Пройдено', 'Запланировано', 'Пропущено'];
        let selectHtml = `<select class="status-select" onchange="changeStatus(${i}, this.value)">`;
        statusOptions.forEach(st => {
            selectHtml += `<option value="${st}" ${st === r.status ? 'selected' : ''}>${st}</option>`;
        });
        selectHtml += `</select>`;

        html += `<tr>
            <td>${r.wine}</td>
            <td>${r.employee}</td>
            <td>${r.event}</td>
            <td>${r.type}</td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>${r.date || ''}</td>
            <td>${reqCell}</td>
            <td>${selectHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ---------- ТАБЛИЦА ДЛЯ АДМИНА ----------
function renderAdminTable() {
    const tbody = document.getElementById('adminRecordsBody');
    const wrap = document.getElementById('adminTableWrap');
    if (!isAdmin) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Нет записей</td></tr>`;
        return;
    }

    let html = '';
    records.forEach((r, i) => {
        let badgeClass = 'badge-gray';
        if (r.status === 'Пройдено') badgeClass = 'badge-green';
        else if (r.status === 'Пропущено') badgeClass = 'badge-red';

        html += `<tr>
            <td>${r.wine}</td>
            <td>${r.employee}</td>
            <td>${r.event}</td>
            <td>${r.type}</td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>${r.date || ''}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteRecord(${i})">🗑 Удалить</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ---------- СТАТИСТИКА ----------
function updateStats() {
    const filterValue = document.getElementById('filterWine').value;
    let filtered = [];
    if (filterValue === '__all') {
        filtered = records;
    } else {
        filtered = records.filter(r => r.wine === filterValue);
    }

    const total = filtered.length;
    const done = filtered.filter(r => r.status === 'Пройдено').length;
    const planned = filtered.filter(r => r.status === 'Запланировано').length;
    const missed = filtered.filter(r => r.status === 'Пропущено').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById('stTotal').textContent = total;
    document.getElementById('stDone').textContent = done;
    document.getElementById('stPlanned').textContent = planned;
    document.getElementById('stMissed').textContent = missed;
    document.getElementById('stPercent').textContent = percent + '%';

    const detail = document.getElementById('statsDetail');
    if (filterValue === '__all') {
        detail.textContent = `📌 По территории МСК2: ${total} записей, ${percent}% выполнения.`;
    } else {
        const totalAll = records.length;
        const percentAll = totalAll === 0 ? 0 : Math.round((records.filter(r => r.status === 'Пройдено').length / totalAll) * 100);
        detail.textContent = `📌 Винотека «${filterValue}»: ${total} записей, ${percent}% выполнения. По территории в целом: ${percentAll}%.`;
    }
}

// ---------- ОБЯЗАТЕЛЬНЫЕ МЕРОПРИЯТИЯ ----------
function getRequiredEventInfo(eventName) {
    const found = REQUIRED_EVENTS.find(e => e.name === eventName);
    return found ? { isRequired: true, grade: found.grade } : { isRequired: false };
}

function renderRequiredTable() {
    const tbody = document.getElementById('requiredTableBody');
    if (!tbody) return;

    if (REQUIRED_EVENTS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Нет обязательных мероприятий</td></tr>';
        return;
    }

    let html = '';
    REQUIRED_EVENTS.forEach(ev => {
        const passed = records.filter(r => r.event === ev.name && r.status === 'Пройдено').length;
        const total = records.filter(r => r.event === ev.name).length;
        const percent = total === 0 ? 0 : Math.round((passed / total) * 100);
        html += `<tr>
            <td>${ev.name}</td>
            <td><span class="badge ${ev.grade === 3 ? 'badge-green' : 'badge-red'}">Грейд ${ev.grade}</span></td>
            <td>${passed}</td>
            <td>${percent}%</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ---------- АДМИНИСТРИРОВАНИЕ ----------
function adminLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('adminStatus').textContent = '✅ Режим администратора активен. Можно удалять записи.';
        document.getElementById('adminStatus').style.color = '#2d6a2d';
        document.getElementById('adminLoginBtn').style.display = 'none';
        document.getElementById('adminLogoutBtn').style.display = 'inline-block';
        renderAdminTable();
    } else {
        document.getElementById('adminStatus').textContent = '❌ Неверный пароль';
        document.getElementById('adminStatus').style.color = '#b13a3a';
    }
}

function adminLogout() {
    isAdmin = false;
    document.getElementById('adminStatus').textContent = '';
    document.getElementById('adminLoginBtn').style.display = 'inline-block';
    document.getElementById('adminLogoutBtn').style.display = 'none';
    document.getElementById('adminTableWrap').style.display = 'none';
}

// ---------- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ----------
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            contents.forEach(c => c.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            renderAll();
        });
    });
}

// ---------- ОБЩАЯ ПЕРЕРИСОВКА ----------
function renderAll() {
    renderTable();
    renderAdminTable();
    updateStats();
    renderRequiredTable();
}

// ---------- ЗАПУСК ----------
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderSelects();
    renderAll();
    initTabs();

    document.getElementById('addBtn').addEventListener('click', addRecord);
    document.getElementById('adminLoginBtn').addEventListener('click', adminLogin);
    document.getElementById('adminLogoutBtn').addEventListener('click', adminLogout);

    document.getElementById('eventInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addRecord();
    });

    // Устанавливаем фильтр по умолчанию
    document.getElementById('filterWine').value = '__all';
    updateStats();
});