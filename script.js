// --- Firebase Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyATJeuo6Dd4bDoAHwkKyXQ729CX9Rk3Ii4",
  authDomain: "voicetrack-e6b94.firebaseapp.com",
  projectId: "voicetrack-e6b94",
  storageBucket: "voicetrack-e6b94.firebasestorage.app",
  messagingSenderId: "995949766942",
  appId: "1:995949766942:web:044943a736452f1742010f",
  measurementId: "G-CVB4Y3FGT7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Enable Local Persistence to remember login on refresh ---
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });

const db = getFirestore(app);

// --- App State ---
let expensesData = []; 
const state = {
    isRecording: false,
    finalTranscript: '',
    recognition: null,
    user: null,
    autoSaveTimeout: null,
    isReadOnly: false 
};

// --- DOM Elements ---
const loginOverlay = document.getElementById('loginOverlay');
const mainApp = document.getElementById('mainApp');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const resultTableBody = document.getElementById('resultTableBody');
const emptyState = document.getElementById('emptyState');
const grandTotalEl = document.getElementById('grandTotal');
const toastEl = document.getElementById('toast');
const appTitle = document.getElementById('appTitle');
const appSubtitle = document.getElementById('appSubtitle');
const readOnlyBadge = document.getElementById('readOnlyBadge');
const actionHeader = document.getElementById('actionHeader');
const actionFooter = document.getElementById('actionFooter');

// Mobile Menu
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileDropdown = document.getElementById('mobileDropdown');

// Buttons
const btnNew = document.getElementById('btnNew');
const btnSave = document.getElementById('btnSave');
const btnDownload = document.getElementById('btnDownload');
const btnMyFiles = document.getElementById('btnMyFiles');
const btnLogout = document.getElementById('btnLogout');

// Modals
const filenameModal = document.getElementById('filenameModal');
const filenameInput = document.getElementById('filenameInput');
const confirmSave = document.getElementById('confirmSave');
const cancelSave = document.getElementById('cancelSave');

const filesModal = document.getElementById('filesModal');
const closeFilesModal = document.getElementById('closeFilesModal');
const filesList = document.getElementById('filesList');

// --- Number Logic ---
const numberMap = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000,
    'సున్నా': 0, 'ఒకటి': 1, 'ఒక': 1, 
    'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5,
    'ఆరు': 6, 'ఏడు': 7, 'ఎనిమిది': 8, 'తొమ్మిది': 9, 
    'పది': 10,
    'వంద': 100, 'వందల': 100, 
    'వెయ్యి': 1000,
    'లక్ష': 100000
};
const compoundMap = { 'vondala': 500, 'వొందల': 500, 'వందలు': 100 };

// --- Auth Listeners ---
googleLoginBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(e => showToast("Login failed: " + e.message));
});

btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        localStorage.clear(); 
        state.isReadOnly = false;
        showToast("Logged out.");
    });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        state.user = user;
        loginOverlay.classList.add('hidden');
        mainApp.classList.remove('hidden');
        initSpeechRecognition();
        loadAutoDraft(); 
    } else {
        state.user = null;
        loginOverlay.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});

// --- Menu Actions ---
mobileMenuToggle.addEventListener('click', () => {
    mobileDropdown.classList.toggle('hidden');
});

document.getElementById('btnNewMobile').onclick = () => { btnNew.click(); mobileDropdown.classList.add('hidden'); };
document.getElementById('btnDownloadMobile').onclick = () => { btnDownload.click(); mobileDropdown.classList.add('hidden'); };
document.getElementById('btnSaveMobile').onclick = () => { btnSave.click(); mobileDropdown.classList.add('hidden'); };
document.getElementById('btnMyFilesMobile').onclick = () => { btnMyFiles.click(); mobileDropdown.classList.add('hidden'); };
document.getElementById('btnLogoutMobile').onclick = () => { btnLogout.click(); mobileDropdown.classList.add('hidden'); };

// --- CHANGE: Helper function to check if we need to warn user ---
function hasActiveUnsavedData() {
    // If we are viewing a saved cloud file, it is already safe. No warning needed.
    if (state.isReadOnly) return false;

    // Check if there are any items in the list that are NOT deleted
    const hasActiveItems = expensesData.some(item => !item.isDeleted);
    return hasActiveItems;
}

// 1. New Table
btnNew.addEventListener('click', () => {
    // CHANGE: Only confirm if there is active unsaved data
    if (!hasActiveUnsavedData() || confirm("Start a new table? Current data will be cleared.")) {
        expensesData = [];
        appTitle.innerText = "Voice Expense Tracker";
        appSubtitle.innerText = "Branch Report";
        state.isReadOnly = false;
        updateReadOnlyUI();
        renderTable();
        triggerAutoSave();
        showToast("New table created.");
    }
});

// 2. Save to Firebase
btnSave.addEventListener('click', () => {
    if (!state.user || state.isReadOnly) return;
    filenameModal.classList.remove('hidden');
    filenameInput.value = appTitle.innerText; 
    filenameInput.focus();
});

cancelSave.addEventListener('click', () => filenameModal.classList.add('hidden'));

confirmSave.addEventListener('click', async () => {
    const filename = filenameInput.value.trim();
    if (!filename) return showToast("Please enter a filename.");

    showToast("Saving...");
    filenameModal.classList.add('hidden');

    try {
        await addDoc(collection(db, "reports"), {
            name: filename,
            title: appTitle.innerText,
            city: appSubtitle.innerText,
            data: expensesData,
            userId: state.user.uid,
            createdAt: serverTimestamp()
        });
        showToast("File Saved Successfully!");
    } catch (e) {
        console.error(e);
        showToast("Error saving.");
    }
});

// 3. Download PDF
btnDownload.addEventListener('click', () => {
    if (expensesData.length === 0) return showToast("No data to download.");
    
    const element = document.createElement('div');
    const activeData = expensesData.filter(item => !item.isDeleted).sort((a, b) => a.timestamp - b.timestamp);
    
    let tableRows = '';
    activeData.forEach((item, index) => {
        tableRows += `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td style="text-align: left;">${item.name}</td>
                <td style="text-align: left;">${item.rupees}</td>
            </tr>
        `;
    });

    element.innerHTML = `
        <div style="font-family: 'Noto Sans Telugu', sans-serif; padding: 20px;">
            <h2 style="text-align: center; margin-bottom: 5px;">${appTitle.innerText}</h2>
            <p style="text-align: center; margin-bottom: 20px; color: #555;">${appSubtitle.innerText}</p>
            
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; font-size: 12px;">
                <thead>
                    <tr style="background-color: #4285F4; color: white;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">S.No</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Name</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Rupees</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;

    document.body.appendChild(element);

    const opt = {
        margin: 10,
        filename: `${appTitle.innerText.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
        showToast("PDF Downloaded.");
    }).catch(err => {
        console.error(err);
        document.body.removeChild(element);
    });
});

// 4. My Files
btnMyFiles.addEventListener('click', async () => {
    if (!state.user) return;
    filesList.innerHTML = '<p class="text-center">Loading...</p>';
    filesModal.classList.remove('hidden');

    try {
        const q = query(collection(db, "reports"), where("userId", "==", state.user.uid));
        const querySnapshot = await getDocs(q);
        
        filesList.innerHTML = '';
        if (querySnapshot.empty) {
            filesList.innerHTML = '<p class="text-center">No saved files found.</p>';
            return;
        }

        const files = [];
        querySnapshot.forEach((docSnap) => {
            files.push({ id: docSnap.id, ...docSnap.data() });
        });
        files.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

        files.forEach((data) => {
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown';
            
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-info">
                    <h4>${data.name}</h4>
                    <small>${data.title || 'No Title'} • ${date}</small>
                </div>
                <div class="file-actions">
                    <button title="Load" class="load-btn"><i class="fas fa-folder-open"></i></button>
                </div>
            `;
            
            div.querySelector('.load-btn').addEventListener('click', () => {
                // CHANGE: Only confirm if there is active unsaved data. 
                // (Switching between saved files won't warn)
                if (!hasActiveUnsavedData() || confirm("Load this file? Current unsaved data will be lost.")) {
                    loadDataFromCloud(data);
                    filesModal.classList.add('hidden');
                }
            });

            filesList.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        filesList.innerHTML = '<p class="text-center">Error loading files.</p>';
    }
});

closeFilesModal.addEventListener('click', () => filesModal.classList.add('hidden'));

function updateReadOnlyUI() {
    if (state.isReadOnly) {
        readOnlyBadge.classList.remove('hidden');
        micBtn.disabled = true;
        btnSave.disabled = true;
        statusText.innerText = "View Only Mode";
    } else {
        readOnlyBadge.classList.add('hidden');
        micBtn.disabled = false;
        btnSave.disabled = false;
        statusText.innerText = "Tap mic to start speaking...";
    }
}

// --- Auto Save Logic ---
function triggerAutoSave() {
    if (state.isReadOnly) return;

    localStorage.setItem('voiceTrackData', JSON.stringify(expensesData));
    localStorage.setItem('voiceTrackTitle', appTitle.innerText);
    localStorage.setItem('voiceTrackSubtitle', appSubtitle.innerText);

    clearTimeout(state.autoSaveTimeout);
    state.autoSaveTimeout = setTimeout(async () => {
        if(!state.user) return;
        try {
            const draftRef = doc(db, "users", state.user.uid, "draft", "current");
            await setDoc(draftRef, {
                title: appTitle.innerText,
                city: appSubtitle.innerText,
                data: expensesData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            console.log("Auto-saved to cloud");
        } catch (e) {
            console.error("Auto-save failed", e);
        }
    }, 3000);
}

function loadDataFromCloud(cloudData) {
    appTitle.innerText = cloudData.title || "Untitled";
    appSubtitle.innerText = cloudData.city || "";
    state.isReadOnly = true;
    updateReadOnlyUI();

    expensesData = (cloudData.data || []).map(item => {
        if (item.timestamp) {
            if (item.timestamp.seconds) {
                return { ...item, timestamp: new Date(item.timestamp.seconds * 1000) };
            } else {
                return { ...item, timestamp: new Date(item.timestamp) };
            }
        }
        return item;
    });

    renderTable();
    showToast("File Loaded (Read Only).");
}

async function loadAutoDraft() {
    const localData = localStorage.getItem('voiceTrackData');
    if (localData) {
        expensesData = JSON.parse(localData);
        appTitle.innerText = localStorage.getItem('voiceTrackTitle') || "Voice Expense Tracker";
        appSubtitle.innerText = localStorage.getItem('voiceTrackSubtitle') || "Branch Report";
        
        expensesData = expensesData.map(item => {
            let d = new Date(item.timestamp);
            if (isNaN(d.getTime())) d = new Date();
            return { ...item, timestamp: d };
        });

        renderTable();
    }
}

// --- Speech Recognition Logic ---
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast("Browser not supported. Use Chrome/Edge.");
        return false;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognition = new SpeechRecognition();
    state.recognition.lang = 'te-IN'; 
    state.recognition.continuous = false; 
    state.recognition.interimResults = true;

    state.recognition.onstart = () => { state.isRecording = true; updateUIState(); };
    state.recognition.onend = () => {
        state.isRecording = false;
        updateUIState();
        if (state.finalTranscript.trim()) processData(state.finalTranscript);
    };
    state.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) state.finalTranscript = event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
        }
        updateTranscriptDisplay(state.finalTranscript, interimTranscript);
    };
    state.recognition.onerror = (event) => {
        showToast("Error: " + event.error);
        state.isRecording = false;
        updateUIState();
    };
}

micBtn.addEventListener('click', () => {
    if (state.isReadOnly) return;
    if (state.isRecording) state.recognition.stop();
    else {
        state.finalTranscript = '';
        updateTranscriptDisplay('', '');
        state.recognition.start();
    }
});

// --- NLP Logic ---
function processData(text) {
    if (state.isReadOnly) return;

    const cleanText = text.trim().replace(/\s+/g, ' ');
    const segments = cleanText.split(/,|\band\b|\btharvatha\b|\bmari\b|\bunde\b/i);
    const newEntries = [];

    segments.forEach(segment => {
        segment = segment.trim();
        if (!segment) return;
        const parsed = parseSegment(segment);
        if (parsed) {
            newEntries.push({
                id: Date.now() + Math.random(),
                name: parsed.name,
                rupees: parsed.rupees,
                timestamp: new Date(),
                isDeleted: false
            });
        }
    });

    if (newEntries.length > 0) {
        expensesData = [...expensesData, ...newEntries];
        renderTable();
        triggerAutoSave();
        showToast(`Added ${newEntries.length} entries.`);
    } else {
        showToast("Could not parse valid data.");
    }
}

function parseSegment(segment) {
    const tokens = segment.split(' ');
    let name = "Unknown", totalValue = 0;
    let nameTokens = [], amountTokens = [], hitNumberToken = false;

    for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i].toLowerCase();
        const isNum = !isNaN(parseInt(word));
        const isWordNum = numberMap.hasOwnProperty(word) || compoundMap.hasOwnProperty(word);
        const isCurrency = word.includes('rupee') || word.includes('rs') || word === 'rupayalu' || word === 'రూపాయలు';
        if (isNum || isWordNum || isCurrency) hitNumberToken = true;
        if (!hitNumberToken) nameTokens.push(tokens[i]);
        else { if (!isCurrency) amountTokens.push(word); }
    }
    if (amountTokens.length === 0) return null;
    name = nameTokens.join(' ').trim();
    if(name.length === 0) name = "Unknown";
    else name = name.charAt(0).toUpperCase() + name.slice(1);
    totalValue = calculateAmountFromTokens(amountTokens);
    return totalValue > 0 ? { name, rupees: totalValue } : null;
}

function calculateAmountFromTokens(tokens) {
    let total = 0, current = 0;
    for (let i = 0; i < tokens.length; i++) {
        let word = tokens[i], value = 0;
        if (!isNaN(parseInt(word))) value = parseInt(word);
        else if (numberMap[word]) value = numberMap[word];
        else if (compoundMap[word]) value = compoundMap[word];
        if (value === 100) current = (current === 0 ?1 : current) * 100;
        else if (value === 1000 || value === 100000) {
            let multiplier = current === 0 ?1 : current;
            current = multiplier * value;
            total += current;
            current = 0;
        } else {
            current += value;
        }
    }
    total += current;
    return total;
}

// --- Rendering ---
function renderTable() {
    resultTableBody.innerHTML = '';
    if (expensesData.length === 0) {
        emptyState.style.display = 'block';
        grandTotalEl.innerText = "0";
        return;
    }
    emptyState.style.display = 'none';
    let totalSum = 0;
    const sortedData = [...expensesData].sort((a, b) => a.timestamp - b.timestamp);

    if (state.isReadOnly) {
        actionHeader.style.display = 'none';
        actionFooter.style.display = 'none';
    } else {
        actionHeader.style.display = '';
        actionFooter.style.display = '';
    }

    sortedData.forEach((item, index) => {
        if (!item.isDeleted) totalSum += item.rupees;
        const tr = document.createElement('tr');
        if (item.isDeleted) tr.classList.add('row-deleted');
        
        const tdSNo = document.createElement('td');
        tdSNo.className = 'sno-col';
        tdSNo.textContent = index + 1;

        const tdName = document.createElement('td');
        tdName.textContent = item.name;
        
        if (!state.isReadOnly) {
            tdName.contentEditable = "true";
            tdName.addEventListener('blur', (e) => {
                const newName = e.target.textContent.trim();
                if (newName) { item.name = newName; triggerAutoSave(); } 
                else e.target.textContent = item.name;
            });
        }

        // Swapped tdAmount (Rupees) and tdDate (Date) order
        const tdAmount = document.createElement('td');
        tdAmount.textContent = item.rupees.toLocaleString('en-IN');

        const tdDate = document.createElement('td');
        tdDate.textContent = formatDateTime(item.timestamp);

        const tdAction = document.createElement('td');
        
        if (state.isReadOnly) {
            tdAction.style.display = 'none';
        } else {
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete';
            delBtn.innerHTML = item.isDeleted ? '&#8634;' : '&times;';
            delBtn.title = item.isDeleted ? "Restore" : "Delete";
            delBtn.onclick = () => { item.isDeleted = !item.isDeleted; renderTable(); triggerAutoSave(); };
            tdAction.appendChild(delBtn);
        }

        // Updated append order to match new column structure (S.No, Name, Rupees, Date, Action)
        tr.append(tdSNo, tdName, tdAmount, tdDate, tdAction);
        resultTableBody.appendChild(tr);
    });
    grandTotalEl.innerText = totalSum.toLocaleString('en-IN');
}

function formatDateTime(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return "Invalid Date";
    return dateObj.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function updateUIState() {
    if (state.isRecording) {
        micBtn.classList.add('recording');
        statusText.innerText = "Listening...";
        micBtn.innerHTML = '<i class="fas fa-stop"></i>';
    } else {
        micBtn.classList.remove('recording');
        if(!state.isReadOnly) statusText.innerText = "Tap to record again";
        micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

function updateTranscriptDisplay(final, interim) {
    transcriptDiv.innerHTML = '';
    if (final) transcriptDiv.innerHTML += `<span class="final">${final}</span>`;
    if (interim) transcriptDiv.innerHTML += `<span class="interim">${interim}</span>`;
}

function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 3000);
}