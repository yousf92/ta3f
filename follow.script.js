// --- START: Added Spinner Functions ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.add('show');
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.remove('show');
    }
}
// --- END: Added Spinner Functions ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGgZmhJ_mMezlf7xElisvzJ8l9D758d4g",
    authDomain: "my-chat-app-daaf8.firebaseapp.com",
    projectId: "my-chat-app-daaf8",
    storageBucket: "my-chat-app-daaf8.firebasestorage.app",
    messagingSenderId: "789086064752",
    appId: "1:789086064752:web:d081f1b6832dabca1d64b5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- START: Background Theme Logic ---
function applyBackgroundPreference() {
    const savedTheme = localStorage.getItem('appBackgroundTheme') || 'default';
    const body = document.body;
    
    body.classList.remove('solid-black-bg', 'gradient-blue-bg');
    
    if (savedTheme === 'solid-black') {
        body.classList.add('solid-black-bg');
    } else if (savedTheme === 'gradient-blue') {
        body.classList.add('gradient-blue-bg');
    }
    // If 'default', no class is added, and the original CSS background is used.
}

// Apply the theme as soon as the script runs
applyBackgroundPreference();
// --- END: Background Theme Logic ---

function initializeGlobalChatNotifications(userId) {
    const chatBadge = document.querySelector('.chat-notification-badge');
    if (!chatBadge) return;
    let publicUnreadCount = 0;
    let privateUnreadCount = 0;
    function updateBadge() {
        const totalUnread = publicUnreadCount + privateUnreadCount;
        if (totalUnread > 0) {
            chatBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            chatBadge.style.display = 'flex';
        } else {
            chatBadge.style.display = 'none';
        }
    }
    if (window.publicListenerUnsubscribe) window.publicListenerUnsubscribe();
    if (window.privateListenerUnsubscribe) window.privateListenerUnsubscribe();
    const lastReadTimestamp = parseInt(localStorage.getItem('lastReadTimestamp') || '0');
    const messagesRef = collection(db, "messages");
    const publicQuery = query(messagesRef, where("createdAt", ">", Timestamp.fromMillis(lastReadTimestamp)));
    window.publicListenerUnsubscribe = onSnapshot(publicQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach(doc => {
            if (doc.data().senderId !== userId) count++;
        });
        publicUnreadCount = count;
        updateBadge();
    });
    const userIsAnonymous = auth.currentUser ? auth.currentUser.isAnonymous : true;
    if (!userIsAnonymous) {
        const privateChatsQuery = query(collection(db, "private_chats"), where("participants", "array-contains", userId));
        window.privateListenerUnsubscribe = onSnapshot(privateChatsQuery, (snapshot) => {
            let count = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data[`hidden_for_${userId}`]) count += (data[`unread_count_${userId}`] || 0);
            });
            privateUnreadCount = count;
            updateBadge();
        });
    } else {
        privateUnreadCount = 0;
        updateBadge();
    }
}

let currentUserId = null;
let isVisitor = true;
let userHabitData = {};
let previousAnalyses = [];

const appLockOverlay = document.getElementById('app-lock-overlay');
const passcodeError = document.getElementById('passcode-error');
const unlockBtn = document.getElementById('unlock-btn');
const passcodeInput = document.getElementById('passcode-input');
const RELOCK_TIME = 3 * 60 * 1000;

function getLockData() {
    try {
        return JSON.parse(localStorage.getItem('app_lock_config')) || { enabled: false, passcode: null };
    } catch (e) { return { enabled: false, passcode: null }; }
}

function initializeAppLock() {
    const lockData = getLockData();
    if (!lockData.enabled) return;
    const lastUnlock = localStorage.getItem('app_last_unlock') || 0;
    const timeSinceUnlock = Date.now() - lastUnlock;
    if (timeSinceUnlock >= RELOCK_TIME) appLockOverlay.style.display = 'flex';
}

function handleUnlock() {
    const enteredPasscode = passcodeInput.value;
    const lockData = getLockData();
    passcodeError.style.display = 'none';
    if (enteredPasscode === lockData.passcode) {
        localStorage.setItem('app_last_unlock', Date.now());
        appLockOverlay.style.display = 'none';
        passcodeInput.value = '';
    } else {
        passcodeError.style.display = 'block';
        passcodeInput.classList.add('is-invalid');
        setTimeout(() => passcodeInput.classList.remove('is-invalid'), 1000);
    }
}

unlockBtn.addEventListener('click', handleUnlock);
passcodeInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') handleUnlock();
});

function callGeminiAPI(prompt) {
    showSpinner();
    return new Promise((resolve, reject) => {
        const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw5WTzuAoDYaqGGrgVFUheHZmTtpo9n5fYw1fI-nkNuUV6VYjHt1n6cloK74oE2c1aaVQ/exec";
        
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            if (data.error) {
                console.error("Error from Apps Script:", data.error);
                resolve("عفوًا، حدثت مشكلة مؤقتة. يرجى المحاولة مرة أخرى لاحقًا.");
            } else {
                resolve(data.text);
            }
            hideSpinner();
        };

        const script = document.createElement('script');
        script.src = WEB_APP_URL + '?callback=' + callbackName + '&prompt=' + encodeURIComponent(prompt);
        
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve("  إذا أردت إرسال طلب آخر اضغط على أيقونة المتابعة في الشريط السفلي  .");
            hideSpinner();
        };

        document.body.appendChild(script);
    });
}

onAuthStateChanged(auth, (user) => {
    initializeAppLock();
    setInterval(() => {
        if (document.visibilityState === 'visible') localStorage.setItem('app_last_unlock', Date.now());
    }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') initializeAppLock();
    });
    if (user) {
        initializeGlobalChatNotifications(user.uid);
        if (user.emailVerified || user.isAnonymous) {
            isVisitor = user.isAnonymous;
            currentUserId = user.uid;
            initializeCalendar();
        }
    } else {
        isVisitor = true;
        currentUserId = null;
        initializeCalendar();
    }
});

const monthYearEl = document.getElementById('month-year');
const weekdaysEl = document.getElementById('weekdays');
const daysEl = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const addStatusModal = new bootstrap.Modal(document.getElementById('addStatusModal'));

const analyzeFrame = document.getElementById('analysis-frame');
const analyzeBtn = document.getElementById('analyze-performance-btn');
const analysisResultContainer = document.getElementById('analysis-result-container');
const analysisResultText = document.getElementById('analysis-result-text');

const contextualCard = document.getElementById('contextual-gemini-card');
const contextualTitle = document.getElementById('contextual-gemini-title');
const contextualBtn = document.getElementById('contextual-gemini-btn');
const contextualResultContainer = document.getElementById('contextual-gemini-result-container');
const contextualResultText = document.getElementById('contextual-gemini-result-text');

let currentDate = new Date();

async function getHabitData() {
    showSpinner();
    try {
        if (isVisitor) {
            try {
                const localData = localStorage.getItem('visitorHabitData');
                userHabitData = localData ? JSON.parse(localData) : {};
            } catch (e) { userHabitData = {}; }
        } else {
            if (!currentUserId) return {};
            const userDocRef = doc(db, "users", currentUserId);
            const docSnap = await getDoc(userDocRef);
            userHabitData = (docSnap.exists() && docSnap.data().habitData) ? docSnap.data().habitData : {};
        }
    } finally {
        hideSpinner();
    }
    return userHabitData;
}

async function saveHabitData(data) {
    userHabitData = data;
    showSpinner();
    try {
        if (isVisitor) {
            localStorage.setItem('visitorHabitData', JSON.stringify(data));
        } else {
            if (!currentUserId) return;
            const userDocRef = doc(db, "users", currentUserId);
            try {
                await setDoc(userDocRef, { habitData: data }, { merge: true });
            } catch (error) { console.error("Error saving habit data: ", error); }
        }
    } finally {
        hideSpinner();
    }
}

function toDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function autoFillAbsence() {
    const habitData = await getHabitData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstEntryDateStr = Object.keys(habitData).sort()[0];
    if (!firstEntryDateStr) return;
    let loopDate = new Date(firstEntryDateStr);
    let hasChanged = false;
    while (loopDate < today) {
        const dateStr = toDateString(loopDate);
        if (!habitData[dateStr]) {
            habitData[dateStr] = 'absence';
            hasChanged = true;
        }
        loopDate.setDate(loopDate.getDate() + 1);
    }
    if (hasChanged) await saveHabitData(habitData);
}

const natureBackgrounds = [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1920',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920',
    'https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1920',
    'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1920',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=1920',
    'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=1920',
    'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?q=80&w=1920'
];
let lastAnalysisBgIndex = -1;
let lastCelebrationBgIndex = -1;

function setRandomBackground(element, type) {
  let randomIndex;
  let lastIndex;
  if (type === 'analysis') {
      lastIndex = lastAnalysisBgIndex;
  } else if (type === 'celebration') {
      lastIndex = lastCelebrationBgIndex;
  }
  
  do {
    randomIndex = Math.floor(Math.random() * natureBackgrounds.length);
  } while (natureBackgrounds.length > 1 && randomIndex === lastIndex);

  if (type === 'analysis') {
      lastAnalysisBgIndex = randomIndex;
  } else if (type === 'celebration') {
      lastCelebrationBgIndex = randomIndex;
  }

  element.style.backgroundImage = `url('${natureBackgrounds[randomIndex]}')`;
}

async function updateContextualGeminiFeature() {
    contextualCard.classList.add('d-none');
    contextualResultContainer.classList.add('d-none');
    const sortedDates = Object.keys(userHabitData).sort((a, b) => new Date(b) - new Date(a));
    if (sortedDates.length === 0) return;
    const latestDate = sortedDates[0];
    const latestStatus = userHabitData[latestDate];
    if (latestStatus === 'slip' || latestStatus === 'relapse') {
        contextualTitle.textContent = 'لحظة للتعلّم';
        contextualBtn.innerHTML = '<i class="bi bi-lightbulb-fill me-2"></i>✨ تعلم من هذه التجربة';
        contextualCard.classList.remove('d-none');
        const newBtn = contextualBtn.cloneNode(true);
        contextualBtn.parentNode.replaceChild(newBtn, contextualBtn);
        document.getElementById('contextual-gemini-btn').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> جاري استخلاص العبرة...`;
            const prompt = `بصفتك مرشد حكيم ومتعاطف، مستخدمي مر بتجربة صعبة اليوم في رحلة التعافي (زلة أو انتكاسة). مهمتك هي أن تقدم له رسالة طويلة مرة تساعده على تحويل هذه التجربة إلى فرصة للتعلم والنمو، وليس سببًا لليأس. لا توبخه أبداً. قدم له سؤالاً واحداً فقط يساعده على التفكير في المسبب المحتمل. اختتم الرسالة بتذكير بسيط بأن كل يوم هو فرصة جديدة. التزم باللهجة السعودية العامية، وبدون تشكيل أو علامات ترقيم.`;
            const result = await callGeminiAPI(prompt);
            contextualResultText.textContent = result;
            contextualResultContainer.classList.remove('d-none');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lightbulb-fill me-2"></i>✨ اطلب نصيحة أخرى';
        });
    } else if (latestStatus === 'victory') {
        let streak = 0;
        for (const date of sortedDates) {
            if (userHabitData[date] === 'victory') streak++;
            else break;
        }
        if (streak >= 3) {
            contextualTitle.innerHTML = `أحسنت! <span class="text-success">${streak} أيام</span> من الانتصار المتواصل`;
            contextualBtn.innerHTML = `<i class="bi bi-trophy-fill me-2"></i>✨ احتفل بإنجازك`;
            contextualCard.classList.remove('d-none');
            const newBtn = contextualBtn.cloneNode(true);
            contextualBtn.parentNode.replaceChild(newBtn, contextualBtn);
            document.getElementById('contextual-gemini-btn').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> جاري كتابة رسالة احتفال...`;
                
                // START: Modified Prompt
                const prompt = `
بصفتك ناصحا على المنهج السلفي، اكتب رسالة احتفال مؤثرة ومحفزة لمستخدم حقق ${streak} يوما من الانتصار في مجاهدة نفسه. اربط جهاده وصبره في الدنيا بالنعيم العظيم في الآخرة. يجب أن تكون الرسالة فريدة ومناسبة لهذا العدد من الأيام.

الضوابط الحاسمة:
1. المنهج: يجب أن تكون الرسالة متوافقة تماما مع المنهج السلفي الصالح وحدوده الشرعية.
2. التنويع في البشارة: لا تكرر ذكر نعيم معين في كل مرة، خاصة "الحور العين". استخدم في كل مرة بشارة مختلفة من نعيم الجنة مثل:
   - قصور الجنة وأنهارها (من لبن وعسل وخمر).
   - رؤية وجه الله الكريم وهو أعظم النعيم.
   - صحبة النبيين والصديقين والشهداء.
   - غرس أشجار في الجنة بكل يوم صبر.
   - بناء بيت في الجنة.
   - تبديل السيئات حسنات.
   - أجر الصابرين الذي يوفى بغير حساب.
3. الأسلوب: اجعل الرسالة قصيرة، مركزة، ومباشرة. استخدم لغة عربية فصيحة ومبسطة، وتجنب العامية واللهجات.
4. الهدف: رفع معنويات المستخدم وتقوية عزيمته للاستمرار في طريق المجاهدة.
5. التنسيق: لا تستخدم أي حركات تشكيل على الحروف إطلاقا (فتحة، ضمة، كسرة، تنوين، شدة، سكون).`;
                // END: Modified Prompt

                const result = await callGeminiAPI(prompt);
                
                // Apply new styling for celebration result
                contextualResultContainer.style.backgroundColor = ''; // Remove default background
                contextualResultContainer.classList.add('celebration-result');
                setRandomBackground(contextualResultContainer, 'celebration');

                contextualResultText.textContent = result;
                contextualResultContainer.classList.remove('d-none');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-trophy-fill me-2"></i>✨ اطلب رسالة جديدة';
            });
        }
    }
}

async function renderCalendar() {
    await autoFillAbsence();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    weekdaysEl.innerHTML = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => `<div class="weekday">${day}</div>`).join('');
    daysEl.innerHTML = '';
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDayOfMonth; i++) daysEl.innerHTML += `<div></div>`;
    const habitData = userHabitData;
    let counts = { absence: 0, relapse: 0, slip: 0, victory: 0 };
    for (const dateStr in habitData) {
        const status = habitData[dateStr];
        if (counts[status] !== undefined) counts[status]++;
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (habitData[dateString]) {
            const status = habitData[dateString];
            const colorMap = { absence: 'orange', relapse: 'grey', slip: 'red', victory: 'green' };
            dayEl.classList.add(colorMap[status]);
        }
        if (day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear()) {
            dayEl.classList.add('today');
        }
        daysEl.appendChild(dayEl);
    }
    document.getElementById('absence-count').textContent = counts.absence;
    document.getElementById('relapse-count').textContent = counts.relapse;
    document.getElementById('slip-count').textContent = counts.slip;
    document.getElementById('victory-count').textContent = counts.victory;
    await updateContextualGeminiFeature();
}

const styleButtons = document.querySelectorAll('.analysis-toggle-btn');
styleButtons.forEach(button => {
    button.addEventListener('click', () => {
        styleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جار التحليل...`;
    analysisResultContainer.classList.add('d-none');
    
    const selectedStyle = document.querySelector('.analysis-toggle-btn.active').dataset.style;
    const counts = { victory: document.getElementById('victory-count').textContent, slip: document.getElementById('slip-count').textContent, relapse: document.getElementById('relapse-count').textContent, absence: document.getElementById('absence-count').textContent, };
    let personaPrompt = "";
    switch (selectedStyle) {
        case 'leader': personaPrompt = "بصفتك قائد ملهم يخاطب أحد أبطاله، حلل بيانات الأداء هذي. استخدم لغة قوية ومفعمة بالفخر وركز على الانتصارات كدليل على العزيمة والإصرار. اجعل التحليل بمثابة وسام شرف وتقدير للمعركة التي يخوضها."; break;
        case 'advisor': default: personaPrompt = "بصفتك مدرب شخصي وناصح أمين، حلل بيانات الأداء هذي لشخص يحاول يتعافى من إدمان."; break;
    }
    let prompt = `${personaPrompt} بيانات الأداء الإجمالية: - أيام الانتصار: ${counts.victory} - أيام الزلات: ${counts.slip} - أيام الانتكاسات: ${counts.relapse} - أيام الغياب: ${counts.absence}. عطني تقرير مختصر وداعم. التزم بالقواعد هذي بدقة: 1. اللهجة: تكلم باللهجة السعودية العامية فقط. 2. التنسيق: لا تستخدم أي تشكيل أو علامات ترقيم أبداً. 3. الأسلوب: خل كلامك طبيعي كأنك تسولف مع واحد تعرفه. 4. المحتوى: عطني تحليل مناسب للشخصية اللي طلبتها.`;
    if (previousAnalyses.length > 0) prompt += `\nالتحليلات اللي عطيتها قبل هي: "${previousAnalyses.join('", "')}". لا تكرر نفس الكلام وعطني تحليل جديد ومختلف.`;
    const result = await callGeminiAPI(prompt);
    if(result && !previousAnalyses.includes(result)) {
        previousAnalyses.push(result);
        if (previousAnalyses.length > 5) previousAnalyses.shift(); 
    }
    analysisResultText.textContent = result;
    analysisResultContainer.classList.remove('d-none');
    setRandomBackground(analyzeFrame, 'analysis'); 
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '✨ إعادة تحليل أدائي';
});

async function initializeCalendar() {
    await getHabitData();
    await renderCalendar();

    setRandomBackground(analyzeFrame, 'analysis');

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    document.querySelectorAll('#addStatusModal button[data-status]').forEach(button => {
        button.addEventListener('click', async () => {
            const status = button.dataset.status;
            const dateString = toDateString(new Date());
            const currentData = await getHabitData();
            currentData[dateString] = status;
            await saveHabitData(currentData);
            addStatusModal.hide();
            await renderCalendar();
        });
    });
}
