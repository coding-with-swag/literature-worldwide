{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // js/app.js\
\
let globalData = []; // Speichert alle Werke flach ab\
let myGlobe;\
\
// 1. Initialisierung\
async function init() \{\
    // Daten laden\
    const response = await fetch('./data/authors.json');\
    const authors = await response.json();\
    \
    // Datenstruktur abflachen: Jedes Werk wird ein eigener Eintrag\
    authors.forEach(author => \{\
        author.works.forEach(work => \{\
            globalData.push(\{\
                ...work,\
                authorData: \{ \
                    name: author.name, \
                    birth: author.birth, \
                    intro: author.intro,\
                    life: author.life\
                \}\
            \});\
        \});\
    \});\
\
    initGlobe();\
    initTimeline();\
    initSearchAndFilters();\
    updateView(globalData); // Initiale Anzeige aller Werke\
\}\
\
// 2. Globus initialisieren (Globe.gl)\
function initGlobe() \{\
    myGlobe = Globe()\
        (document.getElementById('globe-container'))\
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg') // Dunkles Theme\
        .backgroundColor('rgba(0,0,0,0)') // Transparent, CSS Background \'fcbernimmt\
        .htmlElementsData([]) // Wir nutzen HTML Elemente f\'fcr die Pins (bessere CSS Kontrolle)\
        .htmlElement(d => \{\
            const el = document.createElement('div');\
            el.className = 'pin-marker';\
            \
            // Hover Popup\
            const popup = document.createElement('div');\
            popup.className = 'hover-preview';\
            popup.innerHTML = `\
                <div style="font-size: 0.8em; opacity: 0.7">$\{d.authorData.name\}</div>\
                <div style="font-weight: bold; margin: 5px 0;">$\{d.title\}</div>\
                <div style="font-size: 0.8em; margin-bottom: 8px;">$\{d.year\}</div>\
                <div style="font-size: 0.85em; white-space: pre-line;">$\{d.intro\}</div>\
            `;\
            el.appendChild(popup);\
\
            // 1 Sekunde Hover Logik\
            let hoverTimer;\
            el.addEventListener('mouseenter', () => \{\
                hoverTimer = setTimeout(() => \{\
                    popup.style.opacity = '1';\
                \}, 1000); // 1 Sekunde warten\
            \});\
            el.addEventListener('mouseleave', () => \{\
                clearTimeout(hoverTimer);\
                popup.style.opacity = '0';\
            \});\
\
            // Klick auf Pin -> \'d6ffnet Modal\
            el.addEventListener('click', () => openModal(d));\
\
            return el;\
        \});\
        \
    // Initiale Kamera-Position\
    myGlobe.pointOfView(\{ lat: 20, lng: 0, altitude: 2.5 \});\
\}\
\
// 3. Filter-Logik (Kombiniert Timeline, Suche und Tags)\
function updateView() \{\
    const searchTerm = document.getElementById('search-input').value.toLowerCase();\
    // (Hier w\'fcrdest du auch die aktiven Dropdown-Tags auslesen)\
    \
    // Aktuelle Timeline-Werte aus noUiSlider lesen\
    const timelineValues = document.getElementById('timeline-slider').noUiSlider.get();\
    const minYear = parseInt(timelineValues[0]);\
    const maxYear = parseInt(timelineValues[1]);\
\
    const filteredWorks = globalData.filter(work => \{\
        // 1. Timeline Check\
        if (work.year < minYear || work.year > maxYear) return false;\
\
        // 2. Search Check (Autor, Titel, Tags)\
        if (searchTerm) \{\
            const authorMatch = work.authorData.name.toLowerCase().includes(searchTerm);\
            const titleMatch = work.title.toLowerCase().includes(searchTerm);\
            const tagsString = JSON.stringify(work.tags).toLowerCase();\
            const tagMatch = tagsString.includes(searchTerm);\
            \
            if (!authorMatch && !titleMatch && !tagMatch) return false;\
        \}\
\
        // 3. Dropdown Filter Check (Hier implementierst du die Logik f\'fcr aktiven Checkboxen)\
        // ...\
\
        return true;\
    \});\
\
    // Z\'e4hler aktualisieren\
    document.getElementById('visible-count').innerText = filteredWorks.length;\
\
    // Globus updaten (Smooth transition durch Globe.gl intern)\
    myGlobe.htmlElementsData(filteredWorks);\
\}\
\
// 4. Modal Logik\
function openModal(workData) \{\
    const modal = document.getElementById('modal-overlay');\
    const content = document.getElementById('modal-content');\
    \
    // Baue das HTML zusammen (vereinfacht dargestellt)\
    // In der Realit\'e4t w\'fcrdest du hier alle Werke des Autors aus globalData filtern\
    const authorWorks = globalData.filter(w => w.authorData.name === workData.authorData.name);\
    \
    let worksHtml = authorWorks.map(w => `\
        <div id="werk-$\{w.id\}" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">\
            <h3>$\{w.title\} ($\{w.year\})</h3>\
            <p style="font-size: 0.9em; opacity: 0.7;">$\{w.location\}</p>\
            <p>$\{w.description\}</p>\
        </div>\
    `).join('');\
\
    content.innerHTML = `\
        <h1 style="margin-bottom: 10px;">$\{workData.authorData.name\}</h1>\
        <p style="opacity: 0.8; margin-bottom: 30px;">* $\{workData.authorData.birth\}</p>\
        <h2>Leben und Wirken</h2>\
        <p>$\{workData.authorData.life\}</p>\
        \
        $\{worksHtml\}\
    `;\
    \
    modal.classList.remove('hidden');\
\
    // Automatisches Scrollen zum angeklickten Werk (Smooth)\
    setTimeout(() => \{\
        const targetWork = document.getElementById(`werk-$\{workData.id\}`);\
        if (targetWork) \{\
            targetWork.scrollIntoView(\{ behavior: 'smooth', block: 'start' \});\
            // Kurzes Highlighting\
            targetWork.style.backgroundColor = 'rgba(255,255,255,0.05)';\
            setTimeout(() => targetWork.style.backgroundColor = 'transparent', 1500);\
        \}\
    \}, 100);\
\}\
\
// Event Listener f\'fcr Modal Close\
document.getElementById('close-modal').addEventListener('click', () => \{\
    document.getElementById('modal-overlay').classList.add('hidden');\
\});\
\
// Timeline Setup (noUiSlider)\
function initTimeline() \{\
    const slider = document.getElementById('timeline-slider');\
    noUiSlider.create(slider, \{\
        start: [1500, 2026],\
        connect: true,\
        step: 5, // 5-Jahres-Schritte wie gew\'fcnscht\
        range: \{ 'min': 1500, 'max': 2026 \}\
    \});\
\
    slider.noUiSlider.on('slide', (values) => \{\
        document.getElementById('year-start').innerText = Math.round(values[0]);\
        document.getElementById('year-end').innerText = Math.round(values[1]);\
        updateView(); // Pins updaten sich beim Verschieben (smooth)\
    \});\
\}\
\
function initSearchAndFilters() \{\
    document.getElementById('search-input').addEventListener('input', updateView);\
    // Hier Event-Listener f\'fcr Dropdown-Checkboxen hinzuf\'fcgen\
\}\
\
// Start der App\
init();}