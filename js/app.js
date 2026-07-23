// ==========================================================================
// KONFIGURATION & CATEGORIES
// ==========================================================================

const FILTER_CATEGORIES = {
    genre: ["Roman", "Novelle", "Erzählung", "Kurzgeschichte", "Drama", "Lyrik", "Essay", "Fantasy", "Science Fiction", "Krimi", "Thriller"],
    epoch: ["Renaissance", "Barock", "Aufklärung", "Romantik", "Realismus", "Naturalismus", "Moderne", "Expressionismus", "Nachkriegsliteratur", "Postmoderne", "Gegenwart"],
    style: ["Magischer Realismus", "Existenzialismus", "Surrealismus", "Minimalismus", "Satire", "Absurd", "Psychologisch", "Dystopisch", "Poetisch"],
    themes: ["Liebe", "Familie", "Identität", "Kindheit", "Alter", "Tod", "Krieg", "Gewalt", "Politik", "Macht", "Religion", "Freiheit", "Migration", "Kolonialismus", "Natur", "Technik", "Zeit", "Traum", "Mythologie", "Einsamkeit"]
};

let allWorks = [];
let authorsDataMap = {};
let activeGlobe = null;
let activeFilters = { genre: [], epoch: [], style: [], themes: [] };
let activeTimeRange = [1500, 2026];

// ==========================================================================
// INITIALISIERUNG
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    initGlobe();
    initTimeline();
    initFilterUI();
    initEvents();
    await loadData();
});

// Daten aus JSON laden
async function loadData() {
    try {
        const response = await fetch('data/authors.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const authors = await response.json();

        allWorks = [];
        authorsDataMap = {};

        authors.forEach(author => {
            authorsDataMap[author.name] = author;

            if (author.works && Array.isArray(author.works)) {
                author.works.forEach(work => {
                    allWorks.push({
                        ...work,
                        authorName: author.name,
                        authorBirth: author.birth,
                        authorBirthplace: author.birthplace,
                        authorIntro: author.intro,
                        authorLife: author.life,
                        authorImage: author.image
                    });
                });
            }
        });

        updateView();
    } catch (error) {
        console.error("Fehler beim Laden der Literatur-Daten:", error);
    }
}

// ==========================================================================
// GLOBUS INITIALISIERUNG (HELL + VEKTOR-LÄNDERGRENZEN)
// ==========================================================================

function initGlobe() {
    const container = document.getElementById('globe-container');
    
    activeGlobe = Globe()
        (container)
        .backgroundColor('#b6d0e2') /* Schönes, klares Ozean-Blau */
        .showAtmosphere(true)
        .atmosphereColor('#ffffff')
        .atmosphereAltitude(0.1)
        .htmlElementsData([])
        .htmlElement(d => createPinElement(d));

    // Lade Vektor-Polygone für präzise helle Ländergrenzen
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
            activeGlobe
                .polygonsData(countries.features)
                .polygonCapColor(() => '#ffffff')       // Weiße Landmassen
                .polygonSideColor(() => '#e2e8f0')      // 3D-Kanten
                .polygonStrokeColor(() => '#94a3b8')    // Graue Ländergrenzen
                .polygonAltitude(0.005);
        })
        .catch(err => console.error("Ländergrenzen konnten nicht geladen werden:", err));

    // Kamera-Startposition
    activeGlobe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 });

    window.addEventListener('resize', () => {
        activeGlobe.width(window.innerWidth);
        activeGlobe.height(window.innerHeight);
    });
}

// Erstellt HTML-Pins 
function createPinElement(work) {
    // Der unsichtbare Wrapper, der von globe.gl positioniert wird
    const wrapper = document.createElement('div');
    wrapper.className = 'pin-wrapper';

    // Der eigentliche Pin
    const el = document.createElement('div');
    el.className = 'pin-marker';

    // Das Hover-Vorschaufenster
    const preview = document.createElement('div');
    preview.className = 'hover-preview';
    preview.innerHTML = `
        <div class="hover-author">${escapeHTML(work.authorName)}</div>
        <div class="hover-title">${escapeHTML(work.title)}</div>
        <div class="hover-year">${work.year}</div>
        <div class="hover-intro">${escapeHTML(work.intro || '')}</div>
    `;
    
    wrapper.appendChild(el);
    wrapper.appendChild(preview);

    // Hover auf 1000 ms (1 Sekunde) reduziert
    let hoverTimer;
    el.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => {
            preview.classList.add('visible');
        }, 1000); 
    });

    el.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        preview.classList.remove('visible');
    });

    // Klick öffnet das Autoren-Modal
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        openAuthorModal(work);
    });

    return wrapper;
}

// ==========================================================================
// FILTER- LOGIK
// ==========================================================================

function updateView() {
    const searchTerm = document.getElementById('search-input').value.trim().toLowerCase();

    const filteredWorks = allWorks.filter(work => {
        // 1. Timeline
        if (work.year < activeTimeRange[0] || work.year > activeTimeRange[1]) return false;

        // 2. Suche
        if (searchTerm) {
            const authorMatch = work.authorName.toLowerCase().includes(searchTerm);
            const titleMatch = work.title.toLowerCase().includes(searchTerm);
            
            const allWorkTags = [
                ...(work.tags?.genre || []),
                ...(work.tags?.epoch || []),
                ...(work.tags?.style || []),
                ...(work.tags?.themes || [])
            ].map(t => t.toLowerCase());
            
            const tagMatch = allWorkTags.some(t => t.includes(searchTerm));

            if (!authorMatch && !titleMatch && !tagMatch) return false;
        }

        // 3. Dropdown-Kategorien
        for (const [category, selectedValues] of Object.entries(activeFilters)) {
            if (selectedValues.length > 0) {
                const workTagsInCat = work.tags?.[category] || [];
                const hasMatch = selectedValues.some(val => workTagsInCat.includes(val));
                if (!hasMatch) return false;
            }
        }

        return true;
    });

    document.getElementById('visible-count').innerText = filteredWorks.length;

    if (activeGlobe) {
        activeGlobe.htmlElementsData(filteredWorks);
    }
}

function initFilterUI() {
    Object.keys(FILTER_CATEGORIES).forEach(category => {
        const menu = document.getElementById(`dropdown-${category}`);
        if (!menu) return;

        menu.innerHTML = '';
        FILTER_CATEGORIES[category].forEach(item => {
            const label = document.createElement('label');
            label.className = 'dropdown-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    activeFilters[category].push(item);
                } else {
                    activeFilters[category] = activeFilters[category].filter(v => v !== item);
                }
                
                const wrapper = menu.closest('.filter-dropdown-wrapper');
                if (activeFilters[category].length > 0) {
                    wrapper.classList.add('has-active');
                } else {
                    wrapper.classList.remove('has-active');
                }
                
                updateView();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(item));
            menu.appendChild(label);
        });
    });
}

// ==========================================================================
// TIMELINE
// ==========================================================================

function initTimeline() {
    const slider = document.getElementById('timeline-slider');
    
    noUiSlider.create(slider, {
        start: [1500, 2026],
        connect: true,
        step: 5,
        range: { 'min': 1500, 'max': 2026 }
    });

    slider.noUiSlider.on('update', (values) => {
        const start = Math.round(values[0]);
        const end = Math.round(values[1]);
        
        document.getElementById('year-start').innerText = start;
        document.getElementById('year-end').innerText = end;
        
        activeTimeRange = [start, end];
        updateView();
    });
}

// ==========================================================================
// MODAL POPUP
// ==========================================================================

function openAuthorModal(targetWork) {
    const author = authorsDataMap[targetWork.authorName];
    if (!author) return;

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    const renderTags = (tagsObj) => {
        if (!tagsObj) return '';
        const all = [
            ...(tagsObj.genre || []),
            ...(tagsObj.epoch || []),
            ...(tagsObj.style || []),
            ...(tagsObj.themes || [])
        ];
        return all.map(t => `<span class="tag-badge">${escapeHTML(t)}</span>`).join('');
    };

    const worksHTML = (author.works || []).map(w => `
        <div class="work-block" id="work-target-${escapeHTML(w.id || w.title.replace(/\s+/g, '-'))}">
            <div class="work-title">${escapeHTML(w.title)}</div>
            <div class="work-meta">${w.year} • ${escapeHTML(w.location || '')}</div>
            <div class="tag-cloud">${renderTags(w.tags)}</div>
            <p class="modal-text">${escapeHTML(w.description || w.intro || '')}</p>
        </div>
    `).join('');

    modalContent.innerHTML = `
        <div class="modal-author-header">
            <h1 class="modal-author-name">${escapeHTML(author.name)}</h1>
            <div class="modal-author-meta">* ${author.birth || 'Unbekannt'} ${author.birthplace ? 'in ' + escapeHTML(author.birthplace) : ''}</div>
            ${author.intro ? `<p class="modal-text" style="font-weight: bold; margin-bottom: 16px;">${escapeHTML(author.intro)}</p>` : ''}
            
            <div class="modal-section-title">Leben und Wirken</div>
            <p class="modal-text">${escapeHTML(author.life || 'Keine Biografie vorhanden.')}</p>
        </div>

        <div class="modal-section-title" style="margin-top: 40px;">Wichtigste Werke</div>
        ${worksHTML}
    `;

    modalOverlay.classList.remove('hidden');

    const targetElementId = `work-target-${targetWork.id || targetWork.title.replace(/\s+/g, '-')}`;
    setTimeout(() => {
        const targetEl = document.getElementById(targetElementId);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('highlight');
            setTimeout(() => targetEl.classList.remove('highlight'), 2000);
        }
    }, 150);
}

// ==========================================================================
// EVENTS
// ==========================================================================

function initEvents() {
    document.getElementById('search-input').addEventListener('input', updateView);

    document.querySelectorAll('.filter-dropdown-wrapper').forEach(wrapper => {
        const btn = wrapper.querySelector('.btn-filter');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('open');
            closeAllDropdowns();
            if (!isOpen) wrapper.classList.add('open');
        });
    });

    document.addEventListener('click', closeAllDropdowns);

    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    document.getElementById('btn-random').addEventListener('click', discoverRandomWork);
}

function closeAllDropdowns() {
    document.querySelectorAll('.filter-dropdown-wrapper').forEach(w => w.classList.remove('open'));
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

function discoverRandomWork() {
    const visibleWorks = activeGlobe.htmlElementsData();
    if (!visibleWorks || visibleWorks.length === 0) return;

    const randomWork = visibleWorks[Math.floor(Math.random() * visibleWorks.length)];
    
    activeGlobe.pointOfView({
        lat: randomWork.lat,
        lng: randomWork.lng,
        altitude: 1.8
    }, 1200);

    setTimeout(() => {
        openAuthorModal(randomWork);
    }, 1300);
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
