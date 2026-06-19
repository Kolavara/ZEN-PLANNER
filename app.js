/* ============================================================
   ZEN PLANNER — Application Engine (Supabase Edition)
   The Ultimate Undated Digital Planner by JDRAO
   ============================================================ */

const CURRENT_YEAR = new Date().getFullYear();

// ─── Constants & Dynamic Year Setup ─────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['MON','TUE','WED','THU','FRI','SAT','SUN'];

let DAYS_IN_MONTH = [];
let TOTAL_PAGES = 0;

function initYear() {
    DAYS_IN_MONTH = [];
    let daysInYear = 0;
    for(let m=1; m<=12; m++) {
        let d = new Date(CURRENT_YEAR, m, 0).getDate();
        DAYS_IN_MONTH.push(d);
        daysInYear += d;
    }
    // 1(cover) + 1(toc) + 12(months) + 12(goals) + 52(weeks) + daysInYear + 12(habits) + 10(cheats) + 60(notes)
    TOTAL_PAGES = 1 + 1 + 12 + 12 + 52 + daysInYear + 12 + 10 + 60;
}
initYear();

function pageIdToNumber(id) {
    if (id === 'cover') return 1;
    if (id === 'toc') return 2;
    let m;
    if ((m = id.match(/^month-(\d+)$/))) return 2 + parseInt(m[1]);
    if ((m = id.match(/^month-goals-(\d+)$/))) return 14 + parseInt(m[1]);
    if ((m = id.match(/^week-(\d+)$/))) return 26 + parseInt(m[1]);
    if ((m = id.match(/^day-(\d+)-(\d+)$/))) {
        const month = parseInt(m[1]), day = parseInt(m[2]);
        let dayNum = 0;
        for (let i = 0; i < month - 1; i++) dayNum += DAYS_IN_MONTH[i];
        dayNum += day;
        return 78 + dayNum;
    }
    const offsetAfterDays = 78 + DAYS_IN_MONTH.reduce((a,b)=>a+b, 0);
    if ((m = id.match(/^habit-(\d+)$/))) return offsetAfterDays + parseInt(m[1]);
    if ((m = id.match(/^cheat-(\d+)$/))) return offsetAfterDays + 12 + parseInt(m[1]);
    if ((m = id.match(/^notes-(\d+)$/))) return offsetAfterDays + 22 + parseInt(m[1]);
    return 1;
}

function pageNumberToId(num) {
    if (num <= 0) num = TOTAL_PAGES;
    if (num > TOTAL_PAGES) num = 1;
    if (num === 1) return 'cover';
    if (num === 2) return 'toc';
    if (num >= 3 && num <= 14) return `month-${num - 2}`;
    if (num >= 15 && num <= 26) return `month-goals-${num - 14}`;
    if (num >= 27 && num <= 78) return `week-${num - 26}`;
    
    const offsetAfterDays = 78 + DAYS_IN_MONTH.reduce((a,b)=>a+b, 0);
    
    if (num >= 79 && num <= offsetAfterDays) {
        let remaining = num - 78;
        for (let m = 0; m < 12; m++) {
            if (remaining <= DAYS_IN_MONTH[m]) return `day-${m + 1}-${remaining}`;
            remaining -= DAYS_IN_MONTH[m];
        }
    }
    if (num > offsetAfterDays && num <= offsetAfterDays + 12) return `habit-${num - offsetAfterDays}`;
    if (num > offsetAfterDays + 12 && num <= offsetAfterDays + 22) return `cheat-${num - (offsetAfterDays + 12)}`;
    if (num > offsetAfterDays + 22 && num <= TOTAL_PAGES) return `notes-${num - (offsetAfterDays + 22)}`;
    return 'cover';
}

// ─── Supabase Data Sync ─────────────────────────────────────
const DataSync = {
    cache: {},
    isLoaded: false,
    _debounceTimers: {},

    async loadAll() {
        const user = getCurrentUser();
        if (!user) return;
        
        try {
            const { data, error } = await supabaseClient
                .from('planner_data')
                .select('page_id, field_id, content')
                .eq('user_id', user.id);
                
            if (error) {
                console.error('Error fetching data:', error);
                if (error.code === '42P01') {
                    alert('Supabase Setup Required!\n\nThe "planner_data" table does not exist. Please run setup.sql in your Supabase SQL Editor.');
                }
                return;
            }
            
            this.cache = {};
            if (data) {
                data.forEach(row => {
                    this.cache[`${row.page_id}_${row.field_id}`] = row.content;
                });
            }
            this.isLoaded = true;
        } catch(e) {
            console.error('Load error:', e);
        }
    },
    
    get(pageId, fieldId, fallback = '') {
        const key = `${pageId}_${fieldId}`;
        const val = this.cache[key];
        if (val !== undefined && val !== null) {
            try { return JSON.parse(val); } catch { return val; }
        }
        return fallback;
    },
    
    set(pageId, fieldId, value) {
        const key = `${pageId}_${fieldId}`;
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        this.cache[key] = strValue;
        
        clearTimeout(this._debounceTimers[key]);
        this._debounceTimers[key] = setTimeout(async () => {
            const user = getCurrentUser();
            if (!user) return;
            
            try {
                const { error } = await supabaseClient.from('planner_data').upsert({
                    user_id: user.id,
                    page_id: pageId,
                    field_id: fieldId,
                    content: strValue,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, page_id, field_id' });
                
                if (error) console.error('Supabase write error:', error);
            } catch(e) {
                console.error('Save error:', e);
            }
        }, 800);
    }
};

// ─── Editable Field Factory ─────────────────────────────────
function createEditable(pageId, fieldId, placeholder = '', multiline = true) {
    const el = document.createElement('div');
    el.className = 'editable' + (multiline ? '' : ' editable-line');
    el.contentEditable = 'true';
    el.setAttribute('data-placeholder', placeholder);
    el.setAttribute('data-field', `${pageId}_${fieldId}`);
    
    const saved = DataSync.get(pageId, fieldId, '');
    if (saved) el.innerHTML = saved;
    
    el.addEventListener('input', () => {
        DataSync.set(pageId, fieldId, el.innerHTML);
    });
    el.addEventListener('keydown', (e) => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); }
    });
    return el;
}

// ─── Navigation State ───────────────────────────────────────
let currentPageId = 'cover';

function navigate(pageId) {
    if (!pageId) pageId = 'cover';
    window.location.hash = pageId;
}

function handleHashChange() {
    if (!DataSync.isLoaded) return; // wait for data sync
    const hash = window.location.hash.slice(1) || 'cover';
    currentPageId = hash;
    renderPage(hash);
    updateTabs(hash);
    updateBreadcrumbs(hash);
    updatePageCounter(hash);
}

function getMonthFromPageId(id) {
    let m;
    if ((m = id.match(/^month-(\d+)$/))) return parseInt(m[1]);
    if ((m = id.match(/^month-goals-(\d+)$/))) return parseInt(m[1]);
    if ((m = id.match(/^day-(\d+)-/))) return parseInt(m[1]);
    if ((m = id.match(/^habit-(\d+)$/))) return parseInt(m[1]);
    if ((m = id.match(/^week-(\d+)$/))) {
        const w = parseInt(m[1]);
        if (w <= 4) return 1; if (w <= 8) return 2; if (w <= 13) return 3;
        if (w <= 17) return 4; if (w <= 22) return 5; if (w <= 26) return 6;
        if (w <= 30) return 7; if (w <= 35) return 8; if (w <= 39) return 9;
        if (w <= 43) return 10; if (w <= 48) return 11; return 12;
    }
    return 0;
}

// ─── Tab Navigation ─────────────────────────────────────────
function buildTabs() {
    const nav = document.getElementById('month-tabs');
    let html = '';
    for (let i = 0; i < 12; i++) {
        html += `<a class="month-tab" data-nav="month-${i + 1}" title="${MONTHS[i]}">${MONTHS_SHORT[i]}</a>`;
    }
    html += `<a class="month-tab section-tab" data-nav="habit-1" title="Habit Trackers">HAB</a>`;
    html += `<a class="month-tab section-tab" data-nav="cheat-1" title="Cheat Sheets">REF</a>`;
    html += `<a class="month-tab section-tab" data-nav="notes-1" title="Notes">NOT</a>`;
    nav.innerHTML = html;
    nav.addEventListener('click', (e) => {
        const tab = e.target.closest('.month-tab');
        if (tab) navigate(tab.dataset.nav);
    });
}

function updateTabs(pageId) {
    const monthNum = getMonthFromPageId(pageId);
    document.querySelectorAll('.month-tab').forEach(tab => {
        tab.classList.remove('active');
        const navTarget = tab.dataset.nav;
        if (navTarget === `month-${monthNum}`) tab.classList.add('active');
        if (pageId.startsWith('habit') && navTarget === 'habit-1') tab.classList.add('active');
        if (pageId.startsWith('cheat') && navTarget === 'cheat-1') tab.classList.add('active');
        if (pageId.startsWith('notes') && navTarget === 'notes-1') tab.classList.add('active');
    });
}

// ─── Breadcrumbs ────────────────────────────────────────────
function updateBreadcrumbs(pageId) {
    const bc = document.getElementById('breadcrumbs');
    let crumbs = [{ label: '⌂ Home', target: 'cover' }];

    if (pageId === 'toc') {
        crumbs.push({ label: 'Table of Contents', target: null });
    } else if (pageId.startsWith('month-goals-')) {
        const m = parseInt(pageId.split('-')[2]);
        crumbs.push({ label: MONTHS[m - 1], target: `month-${m}` });
        crumbs.push({ label: 'Goals', target: null });
    } else if (pageId.startsWith('month-')) {
        const m = parseInt(pageId.split('-')[1]);
        crumbs.push({ label: MONTHS[m - 1], target: null });
    } else if (pageId.startsWith('week-')) {
        const w = parseInt(pageId.split('-')[1]);
        const monthNum = getMonthFromPageId(pageId);
        if (monthNum) crumbs.push({ label: MONTHS[monthNum - 1], target: `month-${monthNum}` });
        crumbs.push({ label: `Week ${w}`, target: null });
    } else if (pageId.startsWith('day-')) {
        const parts = pageId.split('-');
        const m = parseInt(parts[1]), d = parseInt(parts[2]);
        crumbs.push({ label: MONTHS[m - 1], target: `month-${m}` });
        
        let dayOfYear = 0;
        for (let i = 0; i < m - 1; i++) dayOfYear += DAYS_IN_MONTH[i];
        dayOfYear += d;
        const weekNum = Math.ceil(dayOfYear / 7);
        crumbs.push({ label: `Week ${weekNum}`, target: `week-${weekNum}` });
        crumbs.push({ label: `${MONTHS[m - 1]} ${d}`, target: null });
    } else if (pageId.startsWith('habit-')) {
        const m = parseInt(pageId.split('-')[1]);
        crumbs.push({ label: 'Habit Trackers', target: 'habit-1' });
        crumbs.push({ label: MONTHS[m - 1], target: null });
    } else if (pageId.startsWith('cheat-')) {
        const idx = parseInt(pageId.split('-')[1]);
        crumbs.push({ label: 'Cheat Sheets', target: 'cheat-1' });
        crumbs.push({ label: CHEAT_SHEETS[idx - 1]?.title || `Sheet ${idx}`, target: null });
    } else if (pageId.startsWith('notes-')) {
        const n = parseInt(pageId.split('-')[1]);
        crumbs.push({ label: 'Notes', target: 'notes-1' });
        crumbs.push({ label: `Page ${n}`, target: null });
    }

    bc.innerHTML = crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        const sep = i > 0 ? '<span class="breadcrumb-sep">›</span>' : '';
        if (isLast || !c.target) {
            return `${sep}<span class="breadcrumb current">${c.label}</span>`;
        }
        return `${sep}<a class="breadcrumb" data-nav="${c.target}">${c.label}</a>`;
    }).join('');

    bc.querySelectorAll('a.breadcrumb').forEach(a => {
        a.addEventListener('click', () => navigate(a.dataset.nav));
    });
}

function updatePageCounter(pageId) {
    const num = pageIdToNumber(pageId);
    document.getElementById('page-counter').textContent = `${num} / ${TOTAL_PAGES}`;
}

// ─── Master Renderer ────────────────────────────────────────
function renderPage(pageId) {
    const container = document.getElementById('page-content');
    container.scrollTop = 0;
    container.innerHTML = '';

    if (pageId === 'cover') return renderCover(container);
    if (pageId === 'toc') return renderTOC(container);
    if (pageId.match(/^month-\d+$/) && !pageId.includes('goals')) return renderMonthly(container, parseInt(pageId.split('-')[1]));
    if (pageId.startsWith('month-goals-')) return renderMonthlyGoals(container, parseInt(pageId.split('-')[2]));
    if (pageId.startsWith('week-')) return renderWeekly(container, parseInt(pageId.split('-')[1]));
    if (pageId.startsWith('day-')) {
        const parts = pageId.split('-');
        return renderDaily(container, parseInt(parts[1]), parseInt(parts[2]));
    }
    if (pageId.startsWith('habit-')) return renderHabit(container, parseInt(pageId.split('-')[1]));
    if (pageId.startsWith('cheat-')) return renderCheat(container, parseInt(pageId.split('-')[1]));
    if (pageId.startsWith('notes-')) return renderNotes(container, parseInt(pageId.split('-')[1]));

    renderCover(container);
}

// ─── Cover Page ─────────────────────────────────────────────
function renderCover(container) {
    const page = document.createElement('div');
    page.className = 'page page-cover';
    page.style.backgroundImage = `url('cover-bg.png')`;
    page.innerHTML = `
        <div class="cover-overlay"></div>
        <div class="cover-title">
            <h1><span>Zen</span>Planner</h1>
            <div class="cover-subtitle">${CURRENT_YEAR} Edition</div>
        </div>
        <div class="cover-credit">JDRAO</div>
    `;
    container.appendChild(page);
}

// ─── Table of Contents ──────────────────────────────────────
function renderTOC(container) {
    const page = document.createElement('div');
    page.className = 'page page-toc';

    let html = `<div class="toc-title">Contents</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Monthly Views</div>`;
    for (let i = 1; i <= 12; i++) {
        html += `<a class="toc-item" data-nav="month-${i}">
            <span class="toc-item-label">📅 ${MONTHS[i - 1]} — Calendar</span>
            <span class="toc-item-page">${pageIdToNumber(`month-${i}`)}</span>
        </a>`;
        html += `<a class="toc-item" data-nav="month-goals-${i}">
            <span class="toc-item-label">&nbsp;&nbsp;&nbsp;&nbsp;Goals & Notes</span>
            <span class="toc-item-page">${pageIdToNumber(`month-goals-${i}`)}</span>
        </a>`;
    }
    html += `</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Weekly Spreads</div>`;
    for (let i = 1; i <= 52; i++) {
        html += `<a class="toc-item" data-nav="week-${i}">
            <span class="toc-item-label">Week ${i}</span>
            <span class="toc-item-page">${pageIdToNumber(`week-${i}`)}</span>
        </a>`;
    }
    html += `</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Daily Pages</div>`;
    for (let m = 1; m <= 12; m++) {
        html += `<a class="toc-item" data-nav="day-${m}-1">
            <span class="toc-item-label">📝 ${MONTHS[m - 1]} 1 – ${DAYS_IN_MONTH[m - 1]}</span>
            <span class="toc-item-page">${pageIdToNumber(`day-${m}-1`)} – ${pageIdToNumber(`day-${m}-${DAYS_IN_MONTH[m - 1]}`)}</span>
        </a>`;
    }
    html += `</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Habit Trackers</div>`;
    for (let i = 1; i <= 12; i++) {
        html += `<a class="toc-item" data-nav="habit-${i}">
            <span class="toc-item-label">✅ ${MONTHS[i - 1]}</span>
            <span class="toc-item-page">${pageIdToNumber(`habit-${i}`)}</span>
        </a>`;
    }
    html += `</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Productivity Cheat Sheets</div>`;
    for (let i = 0; i < CHEAT_SHEETS.length; i++) {
        html += `<a class="toc-item" data-nav="cheat-${i + 1}">
            <span class="toc-item-label">📚 ${CHEAT_SHEETS[i].title}</span>
            <span class="toc-item-page">${pageIdToNumber(`cheat-${i + 1}`)}</span>
        </a>`;
    }
    html += `</div>`;

    html += `<div class="toc-section"><div class="toc-section-title">Notes</div>`;
    html += `<a class="toc-item" data-nav="notes-1">
        <span class="toc-item-label">📋 Notes Pages 1 – 60</span>
        <span class="toc-item-page">${pageIdToNumber('notes-1')} – ${pageIdToNumber('notes-60')}</span>
    </a></div>`;

    page.innerHTML = html;
    container.appendChild(page);

    page.querySelectorAll('.toc-item').forEach(item => {
        item.addEventListener('click', () => navigate(item.dataset.nav));
    });
}

// ─── Monthly Calendar ───────────────────────────────────────
function renderMonthly(container, month) {
    const page = document.createElement('div');
    page.className = 'page page-monthly';
    const pid = `month-${month}`;
    const daysInMonth = DAYS_IN_MONTH[month - 1];
    
    // Dynamic start day based on the year
    const firstDayObj = new Date(CURRENT_YEAR, month - 1, 1);
    let startDay = firstDayObj.getDay() - 1; // 0=Monday
    if(startDay < 0) startDay = 6; // Sunday becomes 6

    let html = `<div class="page-header">
        <span class="page-header-label">Month of:</span>
        <span class="page-header-value">${MONTHS[month - 1]} ${CURRENT_YEAR}</span>
        <a class="breadcrumb" data-nav="month-goals-${month}" style="font-size:11px;margin-left:auto;">Goals →</a>
    </div>`;

    html += `<div class="calendar-grid">`;
    DAYS_SHORT.forEach(d => { html += `<div class="calendar-header-cell">${d}</div>`; });

    let dayCount = 1;
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cellIndex = row * 7 + col;
            if (cellIndex < startDay || dayCount > daysInMonth) {
                html += `<div class="calendar-cell empty"></div>`;
            } else {
                html += `<div class="calendar-cell" data-nav="day-${month}-${dayCount}">
                    <span class="cell-day-number">${dayCount}</span>
                    <div class="cell-content" id="cell-${month}-${dayCount}"></div>
                </div>`;
                dayCount++;
            }
        }
    }
    html += `</div>`;

    const nextMonth = month < 12 ? month + 1 : 1;
    html += `<div class="month-bottom">
        <div class="month-notes">
            <div class="month-notes-label">Notes</div>
            <div id="month-notes-area"></div>
        </div>
        <div class="mini-calendar">
            <div class="mini-calendar-title">${MONTHS[nextMonth - 1]}</div>
            <div class="mini-calendar-grid" id="mini-cal"></div>
        </div>
    </div>`;

    page.innerHTML = html;
    container.appendChild(page);

    for (let d = 1; d <= daysInMonth; d++) {
        const cellContent = page.querySelector(`#cell-${month}-${d}`);
        if (cellContent) {
            cellContent.appendChild(createEditable(pid, `cell-${d}`, '', true));
        }
    }

    const notesArea = page.querySelector('#month-notes-area');
    if (notesArea) notesArea.appendChild(createEditable(pid, 'notes', 'Write notes here...'));

    const miniCal = page.querySelector('#mini-cal');
    if (miniCal) {
        let miniHtml = '';
        DAYS_SHORT.forEach(d => { miniHtml += `<span class="mini-header">${d[0]}</span>`; });
        for (let d = 1; d <= DAYS_IN_MONTH[nextMonth - 1]; d++) {
            miniHtml += `<span class="mini-day" data-nav="day-${nextMonth}-${d}">${d}</span>`;
        }
        miniCal.innerHTML = miniHtml;
        miniCal.querySelectorAll('.mini-day').forEach(el => {
            el.addEventListener('click', () => navigate(el.dataset.nav));
        });
    }

    page.querySelectorAll('.calendar-cell[data-nav]').forEach(cell => {
        cell.addEventListener('click', (e) => {
            if (e.target.closest('.editable')) return;
            navigate(cell.dataset.nav);
        });
    });
    page.querySelectorAll('[data-nav]').forEach(el => {
        if (el.classList.contains('calendar-cell') || el.classList.contains('mini-day')) return;
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Monthly Goals ──────────────────────────────────────────
function renderMonthlyGoals(container, month) {
    const page = document.createElement('div');
    page.className = 'page page-monthly-goals';
    const pid = `month-goals-${month}`;

    let html = `<div class="page-header">
        <span class="page-header-label">Goals for:</span>
        <span class="page-header-value">${MONTHS[month - 1]} ${CURRENT_YEAR}</span>
        <a class="breadcrumb" data-nav="month-${month}" style="font-size:11px;margin-left:auto;">← Calendar</a>
    </div>`;

    html += `<div class="goals-section">
        <div class="goals-section-title">Top 3 Goals</div>
        <div class="goals-list" id="top-goals"></div>
    </div>`;

    html += `<div class="goals-section">
        <div class="goals-section-title">Action Items</div>
        <div class="goals-list" id="action-items"></div>
    </div>`;

    html += `<div class="goals-section">
        <div class="goals-section-title">Notes & Ideas</div>
        <div id="goals-notes"></div>
    </div>`;

    html += `<div class="goals-section">
        <div class="goals-section-title">Monthly Reflection</div>
        <div id="goals-reflection"></div>
    </div>`;

    page.innerHTML = html;
    container.appendChild(page);

    const goalsContainer = page.querySelector('#top-goals');
    for (let i = 1; i <= 3; i++) {
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.innerHTML = `<span class="goal-number">${i}.</span>`;
        item.appendChild(createEditable(pid, `goal-${i}`, `Goal ${i}...`));
        goalsContainer.appendChild(item);
    }

    const actionsContainer = page.querySelector('#action-items');
    for (let i = 1; i <= 8; i++) {
        const item = document.createElement('div');
        item.className = 'goal-item';
        const isChecked = DataSync.get(pid, `action-check-${i}`, false) === true;
        
        const check = document.createElement('div');
        check.className = 'time-slot-check' + (isChecked ? ' checked' : '');
        check.style.marginRight = '8px';
        check.addEventListener('click', () => {
            check.classList.toggle('checked');
            DataSync.set(pid, `action-check-${i}`, check.classList.contains('checked'));
        });
        item.appendChild(check);
        
        item.appendChild(createEditable(pid, `action-${i}`, `Action item...`));
        actionsContainer.appendChild(item);
    }

    page.querySelector('#goals-notes').appendChild(createEditable(pid, 'notes', 'Write your notes and ideas here...'));
    page.querySelector('#goals-reflection').appendChild(createEditable(pid, 'reflection', 'What went well? What can improve?'));

    page.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Weekly Spread ──────────────────────────────────────────
function renderWeekly(container, week) {
    const page = document.createElement('div');
    page.className = 'page page-weekly';
    const pid = `week-${week}`;

    const startDayOfYear = (week - 1) * 7 + 1;
    function dayOfYearToMonthDay(doy) {
        let d = doy;
        for (let m = 0; m < 12; m++) {
            if (d <= DAYS_IN_MONTH[m]) return { month: m + 1, day: d };
            d -= DAYS_IN_MONTH[m];
        }
        return { month: 12, day: 31 };
    }

    const firstDay = dayOfYearToMonthDay(startDayOfYear);
    const weekLabel = `${MONTHS[firstDay.month - 1]} ${firstDay.day}, ${CURRENT_YEAR}`;

    let html = `<div class="page-header">
        <span class="page-header-label">Week of:</span>
        <span class="page-header-value" id="week-title"></span>
    </div>`;

    html += `<div class="week-grid">`;
    html += `<div class="week-column">`;
    for (let i = 0; i < 4; i++) {
        const dayInfo = dayOfYearToMonthDay(startDayOfYear + i);
        const dayId = dayInfo.month <= 12 && dayInfo.day <= DAYS_IN_MONTH[dayInfo.month - 1]
            ? `day-${dayInfo.month}-${dayInfo.day}` : null;
        html += `<div class="week-day">
            <div class="week-day-label" ${dayId ? `data-nav="${dayId}"` : ''}>${DAYS_SHORT[i]}</div>
            <div id="wd-${i}"></div>
        </div>`;
    }
    html += `</div>`;

    html += `<div class="week-column">`;
    for (let i = 4; i < 7; i++) {
        const dayInfo = dayOfYearToMonthDay(startDayOfYear + i);
        const dayId = dayInfo.month <= 12 && dayInfo.day <= DAYS_IN_MONTH[dayInfo.month - 1]
            ? `day-${dayInfo.month}-${dayInfo.day}` : null;
        html += `<div class="week-day">
            <div class="week-day-label" ${dayId ? `data-nav="${dayId}"` : ''}>${DAYS_SHORT[i]}</div>
            <div id="wd-${i}"></div>
        </div>`;
    }
    html += `<div class="week-focus">
        <div class="week-focus-title">What do you want to focus on this week?</div>
        <div id="week-focus-content"></div>
    </div>`;
    html += `</div></div>`;

    page.innerHTML = html;
    container.appendChild(page);

    const titleEl = page.querySelector('#week-title');
    titleEl.appendChild(createEditable(pid, 'title', weekLabel, false));

    for (let i = 0; i < 7; i++) {
        const area = page.querySelector(`#wd-${i}`);
        if (area) area.appendChild(createEditable(pid, `day-${i}`, `${DAYS[i]} notes...`));
    }

    page.querySelector('#week-focus-content').appendChild(
        createEditable(pid, 'focus', 'Write your weekly focus here...')
    );

    page.querySelectorAll('.week-day-label[data-nav]').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Daily Page ─────────────────────────────────────────────
function renderDaily(container, month, day) {
    const page = document.createElement('div');
    page.className = 'page page-daily';
    const pid = `day-${month}-${day}`;
    const dateStr = `${MONTHS[month - 1]} ${day}, ${CURRENT_YEAR}`;

    let leftHtml = `<div class="daily-left">
        <div class="page-header" style="margin-bottom:12px;">
            <span class="page-header-label">Date:</span>
            <span class="page-header-value" id="daily-date"></span>
        </div>
        <div class="daily-section-title">Schedule</div>
        <div class="daily-schedule" id="daily-sched"></div>
    </div>`;

    let rightHtml = `<div class="daily-right">
        <div class="daily-quote" id="daily-quote-box"></div>
        <div class="daily-section-title">Task Priority Matrix</div>
        <div class="daily-matrix">
            <div class="matrix-header-row">
                <div class="matrix-header-cell"></div>
                <div class="matrix-header-cell">Urgent</div>
                <div class="matrix-header-cell">Not Urgent</div>
            </div>
            <div class="matrix-body">
                <div class="matrix-row-label">Important</div>
                <div class="matrix-cell" id="mx-iu"></div>
                <div class="matrix-cell" id="mx-inu"></div>
                <div class="matrix-row-label">Not Important</div>
                <div class="matrix-cell" id="mx-niu"></div>
                <div class="matrix-cell" id="mx-ninu"></div>
            </div>
        </div>
        <div class="daily-section-title">Categories</div>
        <div class="daily-categories">
            <div class="category-box"><div class="category-label">Task (Do)</div><div id="cat-do"></div></div>
            <div class="category-box"><div class="category-label">Task (Delegate)</div><div id="cat-delegate"></div></div>
            <div class="category-box"><div class="category-label">Task (Schedule)</div><div id="cat-schedule"></div></div>
            <div class="category-box"><div class="category-label">Task (Eliminate)</div><div id="cat-eliminate"></div></div>
        </div>
        <div class="daily-intentions" id="daily-int"></div>
    </div>`;

    page.innerHTML = leftHtml + rightHtml;
    container.appendChild(page);

    page.querySelector('#daily-date').appendChild(createEditable(pid, 'date', dateStr, false));

    const sched = page.querySelector('#daily-sched');
    for (let i = 0; i < 14; i++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        const check = document.createElement('div');
        const isChecked = DataSync.get(pid, `check-${i}`, false) === true;
        check.className = 'time-slot-check' + (isChecked ? ' checked' : '');
        check.addEventListener('click', () => {
            check.classList.toggle('checked');
            DataSync.set(pid, `check-${i}`, check.classList.contains('checked'));
        });
        slot.appendChild(check);

        const timeDiv = document.createElement('div');
        timeDiv.className = 'time-slot-time';
        timeDiv.appendChild(createEditable(pid, `time-${i}`, '', false));
        slot.appendChild(timeDiv);

        const descDiv = document.createElement('div');
        descDiv.className = 'time-slot-desc';
        descDiv.appendChild(createEditable(pid, `desc-${i}`, '', false));
        slot.appendChild(descDiv);

        sched.appendChild(slot);
    }

    const quoteBox = page.querySelector('#daily-quote-box');
    quoteBox.appendChild(createEditable(pid, 'quote', 'Write an inspiring quote...'));

    page.querySelector('#mx-iu').appendChild(createEditable(pid, 'mx-iu', 'Do First'));
    page.querySelector('#mx-inu').appendChild(createEditable(pid, 'mx-inu', 'Schedule'));
    page.querySelector('#mx-niu').appendChild(createEditable(pid, 'mx-niu', 'Delegate'));
    page.querySelector('#mx-ninu').appendChild(createEditable(pid, 'mx-ninu', 'Eliminate'));

    page.querySelector('#cat-do').appendChild(createEditable(pid, 'cat-do', 'Tasks to do...'));
    page.querySelector('#cat-delegate').appendChild(createEditable(pid, 'cat-delegate', 'Tasks to delegate...'));
    page.querySelector('#cat-schedule').appendChild(createEditable(pid, 'cat-schedule', 'Tasks to schedule...'));
    page.querySelector('#cat-eliminate').appendChild(createEditable(pid, 'cat-eliminate', 'Tasks to eliminate...'));

    const intDiv = page.querySelector('#daily-int');
    const intentions = [
        { label: 'Today I will meditate at', field: 'med' },
        { label: 'Today I will read at', field: 'read' },
        { label: 'Today I will exercise at', field: 'ex' }
    ];
    intentions.forEach(({ label, field }) => {
        const row = document.createElement('div');
        row.className = 'intention-row';
        row.innerHTML = `<span>${label}</span>`;
        row.appendChild(createEditable(pid, `int-${field}`, '___', false));
        intDiv.appendChild(row);
    });
}

// ─── Habit Tracker ──────────────────────────────────────────
function renderHabit(container, month) {
    const page = document.createElement('div');
    page.className = 'page page-habit';
    const pid = `habit-${month}`;
    const daysInMonth = DAYS_IN_MONTH[month - 1];
    const HABIT_ROWS = 12;

    let html = `<div class="page-header">
        <span class="page-header-label">Habit Tracker:</span>
        <span class="page-header-value">${MONTHS[month - 1]} ${CURRENT_YEAR}</span>
    </div>`;

    html += `<table class="habit-grid"><thead><tr>`;
    html += `<th class="habit-name-header">Habit</th>`;
    for (let d = 1; d <= daysInMonth; d++) {
        html += `<th>${d}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let r = 0; r < HABIT_ROWS; r++) {
        html += `<tr class="${r % 2 ? 'habit-row-alt' : ''}">`;
        html += `<td class="habit-name-cell"><div id="habit-name-${r}"></div></td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const checked = DataSync.get(pid, `h${r}d${d}`, false) === true;
            html += `<td><div class="habit-check${checked ? ' checked' : ''}" data-habit="${r}" data-day="${d}"></div></td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;

    html += `<div style="display:flex;justify-content:space-between;margin-top:16px;font-size:12px;">`;
    if (month > 1) html += `<a class="breadcrumb" data-nav="habit-${month - 1}">← ${MONTHS[month - 2]}</a>`;
    else html += `<span></span>`;
    if (month < 12) html += `<a class="breadcrumb" data-nav="habit-${month + 1}">${MONTHS[month]} →</a>`;
    else html += `<span></span>`;
    html += `</div>`;

    page.innerHTML = html;
    container.appendChild(page);

    for (let r = 0; r < HABIT_ROWS; r++) {
        const nameCell = page.querySelector(`#habit-name-${r}`);
        if (nameCell) nameCell.appendChild(createEditable(pid, `name-${r}`, `Habit ${r + 1}`, false));
    }

    page.querySelectorAll('.habit-check').forEach(el => {
        el.addEventListener('click', () => {
            el.classList.toggle('checked');
            DataSync.set(pid, `h${el.dataset.habit}d${el.dataset.day}`, el.classList.contains('checked'));
        });
    });

    page.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Cheat Sheet ────────────────────────────────────────────
const CHEAT_SHEETS = [
    {
        title: "Atomic Habits", author: "James Clear",
        callout: "You do not rise to the level of your goals. You fall to the level of your systems.",
        sections: [
            {
                title: "The 4 Laws of Behavior Change",
                tips: [
                    "<strong>Make it Obvious</strong> — Design your environment so cues for good habits are visible. Use implementation intentions.",
                    "<strong>Make it Attractive</strong> — Pair a habit you need to do with one you want to do.",
                    "<strong>Make it Easy</strong> — Reduce friction. Use the Two-Minute Rule to start.",
                    "<strong>Make it Satisfying</strong> — Give yourself an immediate reward."
                ]
            }
        ]
    },
    {
        title: "Deep Work", author: "Cal Newport",
        callout: "To produce at your peak level you need to work for extended periods with full concentration.",
        sections: [{ title: "Principles", tips: ["Work deeply.", "Embrace boredom.", "Quit social media.", "Drain the shallows."] }]
    },
    {
        title: "Eat That Frog!", author: "Brian Tracy",
        callout: "If it's your job to eat a frog, it's best to do it first thing in the morning.",
        sections: [{ title: "Action", tips: ["Set the table (decide exactly what you want).", "Plan every day in advance.", "Apply the 80/20 Rule to everything."] }]
    },
    {
        title: "The 7 Habits", author: "Stephen R. Covey",
        callout: "Sow a thought, reap an action; sow an action, reap a habit.",
        sections: [{ title: "Private & Public Victory", tips: ["Be Proactive.", "Begin with the End in Mind.", "Put First Things First.", "Think Win/Win."] }]
    },
    {
        title: "Getting Things Done", author: "David Allen",
        callout: "Your mind is for having ideas, not holding them.",
        sections: [{ title: "The 5 Steps", tips: ["Capture.", "Clarify.", "Organize.", "Reflect.", "Engage."] }]
    },
    {
        title: "The ONE Thing", author: "Gary Keller",
        callout: "What's the ONE Thing I can do such that by doing it everything else will be easier or unnecessary?",
        sections: [{ title: "Focus", tips: ["Go Small.", "Live with Purpose.", "Live by Priority.", "Live for Productivity."] }]
    },
    {
        title: "Essentialism", author: "Greg McKeown",
        callout: "Only once you give yourself permission to stop trying to do it all, can you make your highest contribution.",
        sections: [{ title: "Core Logic", tips: ["Explore and Evaluate.", "Eliminate.", "Execute."] }]
    },
    {
        title: "Make Time", author: "Jake Knapp & John Zeratsky",
        callout: "You only get one life. You can choose to spend it on your terms.",
        sections: [{ title: "The Framework", tips: ["Highlight.", "Laser.", "Energize.", "Reflect."] }]
    },
    {
        title: "The Power of Habit", author: "Charles Duhigg",
        callout: "Change might not be fast and it isn't always easy. But with time and effort, almost any habit can be reshaped.",
        sections: [{ title: "The Loop", tips: ["Cue.", "Routine.", "Reward.", "Craving."] }]
    },
    {
        title: "Digital Minimalism", author: "Cal Newport",
        callout: "Digital minimalism is a philosophy that helps you question what digital communication tools add the most value to your life.",
        sections: [{ title: "Practices", tips: ["Do a 30-day digital declutter.", "Spend time alone.", "Don't click 'like'."] }]
    }
];

function renderCheat(container, index) {
    const page = document.createElement('div');
    page.className = 'page page-cheat';
    const sheet = CHEAT_SHEETS[index - 1];
    if (!sheet) return;

    let html = `<div class="cheat-book-title">${sheet.title}</div>`;
    html += `<div class="cheat-book-author">by ${sheet.author}</div>`;
    if (sheet.callout) html += `<div class="cheat-callout">"${sheet.callout}"</div>`;

    sheet.sections.forEach(section => {
        html += `<div class="cheat-section"><div class="cheat-section-title">${section.title}</div>`;
        section.tips.forEach(tip => {
            html += `<div class="cheat-tip"><span class="cheat-tip-icon">◆</span><div class="cheat-tip-text">${tip}</div></div>`;
        });
        html += `</div>`;
    });

    html += `<div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:16px;border-top:1px solid var(--border-light);font-size:12px;">`;
    if (index > 1) html += `<a class="breadcrumb" data-nav="cheat-${index - 1}">← ${CHEAT_SHEETS[index - 2].title}</a>`;
    else html += `<span></span>`;
    if (index < 10) html += `<a class="breadcrumb" data-nav="cheat-${index + 1}">${CHEAT_SHEETS[index].title} →</a>`;
    else html += `<span></span>`;
    html += `</div>`;

    page.innerHTML = html;
    container.appendChild(page);
    page.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Notes Page ─────────────────────────────────────────────
function renderNotes(container, num) {
    const page = document.createElement('div');
    page.className = 'page page-notes';
    const pid = `notes-${num}`;

    let html = `<div class="page-header">
        <span class="page-header-label">Notes</span>
        <span class="page-header-value">Page ${num}</span>
    </div>`;
    html += `<div class="notes-area" id="notes-content"></div>`;

    html += `<div style="display:flex;justify-content:space-between;margin-top:12px;font-size:12px;">`;
    if (num > 1) html += `<a class="breadcrumb" data-nav="notes-${num - 1}">← Page ${num - 1}</a>`;
    else html += `<span></span>`;
    if (num < 60) html += `<a class="breadcrumb" data-nav="notes-${num + 1}">Page ${num + 1} →</a>`;
    else html += `<span></span>`;
    html += `</div>`;

    page.innerHTML = html;
    container.appendChild(page);

    page.querySelector('#notes-content').appendChild(
        createEditable(pid, 'content', 'Start writing...')
    );

    page.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => navigate(el.dataset.nav));
    });
}

// ─── Setup Handlers ─────────────────────────────────────────
function setupButtons() {
    document.getElementById('btn-prev').addEventListener('click', () => {
        navigate(pageNumberToId(pageIdToNumber(currentPageId) - 1));
    });
    document.getElementById('btn-next').addEventListener('click', () => {
        navigate(pageNumberToId(pageIdToNumber(currentPageId) + 1));
    });
    document.getElementById('btn-home').addEventListener('click', () => {
        navigate('cover');
    });
    document.getElementById('btn-print').addEventListener('click', () => {
        window.print();
    });

    const btnMusic = document.getElementById('btn-music');
    const bgAudio = document.getElementById('bg-audio');
    const iconMusicOn = document.getElementById('icon-music-on');
    const iconMusicOff = document.getElementById('icon-music-off');

    if (btnMusic && bgAudio) {
        bgAudio.volume = 0.2; // Pleasant background volume
        
        let playlist = [];
        let currentTrack = 0;

        const defaultTracks = [
            { url: "puyopuyomegafan1234-japanese-jazz-2-385180.mp3", title: "Japanese Jazz", is_default: true },
            { url: "alanajordan-exactly-like-this-309141.mp3", title: "Exactly Like This", is_default: true },
            { url: "music-for-videos-japanese-lofi-jazz-calm-piano-beats-chill-and-smooth-340494.mp3", title: "Lofi Calm Piano", is_default: true },
            { url: "onesevenbeatxs-senso-trap-japanese-warrior-rap-beat-prod-by-onesevenbeatxs-328644.mp3", title: "Senso Trap", is_default: true }
        ];

        const renderPlaylist = () => {
            const container = document.getElementById('playlist-container');
            if (!container) return;
            container.innerHTML = '';
            playlist.forEach((track, index) => {
                const li = document.createElement('li');
                li.className = `playlist-item ${index === currentTrack ? 'active' : ''}`;
                
                const playIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
                const playingIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

                const actionBtn = document.createElement('button');
                actionBtn.className = 'btn-track-action';
                actionBtn.innerHTML = (index === currentTrack && !bgAudio.paused) ? playingIcon : playIcon;
                actionBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (index === currentTrack) {
                        toggleMusic();
                    } else {
                        playTrack(index);
                    }
                };

                const nameDisplay = document.createElement('div');
                nameDisplay.className = 'track-name-display';
                nameDisplay.textContent = track.title;
                nameDisplay.title = track.title;

                const editBtn = document.createElement('button');
                editBtn.className = 'btn-track-action';
                editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
                
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    const input = document.createElement('input');
                    input.className = 'track-name-input';
                    input.value = track.title;
                    li.replaceChild(input, nameDisplay);
                    input.focus();
                    
                    const saveName = async () => {
                        const newName = input.value.trim() || track.title;
                        track.title = newName;
                        li.replaceChild(nameDisplay, input);
                        nameDisplay.textContent = newName;
                        
                        const { data: { user } } = await supabaseClient.auth.getUser();
                        if (user) {
                            await supabaseClient.from('planner_playlist').update({ title: newName }).eq('id', track.id);
                        }
                    };
                    input.onblur = saveName;
                    input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); };
                };

                li.appendChild(actionBtn);
                li.appendChild(nameDisplay);
                li.appendChild(editBtn);
                
                if (!track.is_default) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-track-action';
                    deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Are you sure you want to delete "${track.title}"?`)) return;
                        const { data: { user } } = await supabaseClient.auth.getUser();
                        if (user) {
                            await supabaseClient.from('planner_playlist').delete().eq('id', track.id);
                            const path = track.file_url.split('/audio_tracks/')[1];
                            if (path) await supabaseClient.storage.from('audio_tracks').remove([path]);
                            
                            playlist.splice(index, 1);
                            if (currentTrack === index) {
                                bgAudio.pause();
                                bgAudio.src = '';
                                iconMusicOn.style.display = 'none';
                                iconMusicOff.style.display = 'block';
                            } else if (currentTrack > index) {
                                currentTrack--;
                            }
                            renderPlaylist();
                        }
                    };
                    li.appendChild(deleteBtn);
                }
                
                li.onclick = () => { if (index !== currentTrack) playTrack(index); };
                
                container.appendChild(li);
            });
        };

        const playTrack = (index) => {
            if (playlist.length === 0) return;
            currentTrack = index;
            bgAudio.src = playlist[currentTrack].file_url || playlist[currentTrack].url;
            bgAudio.play().then(() => {
                iconMusicOn.style.display = 'block';
                iconMusicOff.style.display = 'none';
                localStorage.setItem('zen-music', 'on');
                renderPlaylist();
            }).catch(e => console.log('Audio play blocked:', e));
        };

        bgAudio.addEventListener('ended', () => {
            if (playlist.length === 0) return;
            currentTrack = (currentTrack + 1) % playlist.length;
            bgAudio.src = playlist[currentTrack].file_url || playlist[currentTrack].url;
            setTimeout(() => {
                if (localStorage.getItem('zen-music') === 'on') {
                    bgAudio.play().then(() => renderPlaylist()).catch(e => console.log('Autoplay blocked:', e));
                }
            }, 2000);
        });

        const toggleMusic = () => {
            if (bgAudio.paused) {
                bgAudio.play().then(() => {
                    iconMusicOn.style.display = 'block';
                    iconMusicOff.style.display = 'none';
                    localStorage.setItem('zen-music', 'on');
                    renderPlaylist();
                }).catch(e => console.log('Audio play blocked:', e));
            } else {
                bgAudio.pause();
                iconMusicOn.style.display = 'none';
                iconMusicOff.style.display = 'block';
                localStorage.setItem('zen-music', 'off');
                renderPlaylist();
            }
        };

        btnMusic.addEventListener('click', toggleMusic);

        let isLoadingPlaylist = false;
        const loadPlaylist = async () => {
            if (isLoadingPlaylist) return;
            isLoadingPlaylist = true;
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) return; 

                const { data, error } = await supabaseClient.from('planner_playlist').select('*').order('order_index', { ascending: true });
                
                if (!error && data && data.length > 0) {
                    const seenUrls = new Set();
                    const toKeep = [];
                    const toDelete = [];
                    for (const track of data) {
                        if (track.is_default) {
                            if (seenUrls.has(track.file_url)) {
                                toDelete.push(track.id);
                            } else {
                                seenUrls.add(track.file_url);
                                toKeep.push(track);
                            }
                        } else {
                            toKeep.push(track);
                        }
                    }
                    if (toDelete.length > 0) {
                        supabaseClient.from('planner_playlist').delete().in('id', toDelete).then(() => {});
                    }
                    playlist = toKeep;
                } else {
                    playlist = [];
                    for (let i = 0; i < defaultTracks.length; i++) {
                        const track = defaultTracks[i];
                        const { data: inserted } = await supabaseClient.from('planner_playlist').insert({
                            user_id: user.id,
                            title: track.title,
                            file_url: track.url,
                            is_default: track.is_default,
                            order_index: i
                        }).select().single();
                        if (inserted) playlist.push(inserted);
                    }
                }
                if (playlist.length > 0 && (!bgAudio.src || bgAudio.src.includes('undefined'))) {
                    bgAudio.src = playlist[currentTrack]?.file_url || playlist[currentTrack]?.url || '';
                }
                renderPlaylist();
            } finally {
                isLoadingPlaylist = false;
            }
        };
        
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (session) {
                loadPlaylist();
            }
        });

        loadPlaylist();

        if (localStorage.getItem('zen-music') === 'on') {
            const attemptPlay = () => {
                if (playlist.length > 0 && bgAudio.src) {
                    bgAudio.play().then(() => {
                        iconMusicOn.style.display = 'block';
                        iconMusicOff.style.display = 'none';
                        renderPlaylist();
                    }).catch(() => {});
                }
                document.removeEventListener('click', attemptPlay);
            };
            document.addEventListener('click', attemptPlay);
        }

        const audioUpload = document.getElementById('audio-upload');
        if (audioUpload) {
            audioUpload.addEventListener('change', async (e) => {
                const files = e.target.files;
                if (!files.length) return;
                
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) {
                    alert('You must be logged in to upload audio.');
                    return;
                }

                const label = document.querySelector('.btn-add-audio');
                const originalLabel = label.innerHTML;
                label.innerHTML = 'Uploading...';

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('audio_tracks')
                        .upload(fileName, file);
                        
                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        alert(`Failed to upload ${file.name}`);
                        continue;
                    }

                    const { data: urlData } = supabaseClient.storage
                        .from('audio_tracks')
                        .getPublicUrl(fileName);

                    const newTrackTitle = `Audio ${playlist.length + 1}`;
                    
                    const { data: inserted, error: dbError } = await supabaseClient.from('planner_playlist').insert({
                        user_id: user.id,
                        title: newTrackTitle,
                        file_url: urlData.publicUrl,
                        is_default: false,
                        order_index: playlist.length
                    }).select().single();

                    if (inserted && !dbError) {
                        playlist.push(inserted);
                    }
                }
                
                label.innerHTML = originalLabel;
                renderPlaylist();
                audioUpload.value = ''; 
            });
        }
    }

    document.getElementById('btn-theme').addEventListener('click', () => {
        const isBw = document.body.classList.toggle('bw-mode');
        localStorage.setItem('zen-bw-mode', isBw);
    });
    document.getElementById('btn-logout').addEventListener('click', () => {
        signOut();
    });
}

function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
        if (e.key === 'ArrowRight') navigate(pageNumberToId(pageIdToNumber(currentPageId) + 1));
        if (e.key === 'ArrowLeft') navigate(pageNumberToId(pageIdToNumber(currentPageId) - 1));
        if (e.key === 'Home') navigate('cover');
    });
}

// ─── Initialization ─────────────────────────────────────────
function init() {
    if (localStorage.getItem('zen-bw-mode') === 'true') {
        document.body.classList.add('bw-mode');
    }

    buildTabs();
    setupButtons();
    setupKeyboard();
    
    // Auth integration
    onAuthChange(async (user) => {
        if (user) {
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-info').classList.add('visible');
            
            const container = document.getElementById('page-content');
            container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-family:var(--font-mono);">Syncing your planner...</div>';
            
            await DataSync.loadAll();
            
            window.addEventListener('hashchange', handleHashChange);
            handleHashChange();
        } else {
            document.getElementById('user-info').classList.remove('visible');
            window.removeEventListener('hashchange', handleHashChange);
            document.getElementById('page-content').innerHTML = '';
            DataSync.isLoaded = false;
        }
    });
    
    initAuth();
}

document.addEventListener('DOMContentLoaded', init);
