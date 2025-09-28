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

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, arrayUnion, updateDoc, deleteDoc, limit, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// START: Achievements Logic
const milestones = [
    { days: 1, name: "وسام شرارة التغيير", icon: "bi-lightbulb-fill" },
    { days: 3, name: "وسام بذرة الصمود", icon: "bi-tree-fill" },
    { days: 7, name: "وسام عبور الأسبوع", icon: "bi-calendar-check-fill" },
    { days: 14, name: "وسام حصن الأسبوعين", icon: "bi-shield-shaded" },
    { days: 21, name: "وسام ترسيخ العادة", icon: "bi-pin-map-fill" },
    { days: 30, name: "وسام نجمة الشهر", icon: "bi-star-fill" },
    { days: 40, name: "وسام الأربعين الحاسمة", icon: "bi-clipboard2-check-fill" },
    { days: 45, name: "وسام محارب الـ 45", icon: "bi-shield-plus" },
    { days: 60, name: "وسام قمر الشهرين", icon: "bi-moon-stars-fill" },
    { days: 90, name: "وسام جوهرة الفصل", icon: "bi-gem" },
    { days: 100, name: "وسام بطل المئة", icon: "bi-1-circle-fill" },
    { days: 120, name: "وسام ربان الأربعة أشهر", icon: "bi-compass-fill" },
    { days: 150, name: "وسام فارس الخمسة أشهر", icon: "bi-flag-fill" },
    { days: 180, name: "وسام شمس منتصف العام", icon: "bi-sun-fill" },
    { days: 250, name: "وسام صخرة الصبر", icon: "bi-bricks" },
    { days: 300, name: "وسام كوكب الثلاثمائة", icon: "bi-stars" },
    { days: 365, name: "وسام دورة فلكية كاملة", icon: "bi-globe-americas" },
    { days: 500, name: "وسام برق القوة", icon: "bi-lightning-charge-fill" },
    { days: 650, name: "وسام جبل الإرادة", icon: "bi-filter-circle-fill" }, // Represents a mountain icon
    { days: 750, name: "وسام أسطورة حية", icon: "bi-person-vcard-fill" },
    { days: 850, name: "وسام حكيم المثابرة", icon: "bi-mortarboard-fill" },
    { days: 1000, name: "وسام تاج الألفية", icon: "bi-trophy-fill" }
];
let lastCheckedDay = -1; 
const congratsModalEl = document.getElementById('congratsAchievementModal');
const congratsModal = new bootstrap.Modal(congratsModalEl);

async function resetAchievements() {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) return;
    showSpinner();
    try {
        const achievementsColRef = collection(db, "users", user.uid, "achievements");
        const querySnapshot = await getDocs(achievementsColRef);
        const deletePromises = [];
        querySnapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
    } catch (error) {
        console.error("Error resetting achievements:", error);
    } finally {
        hideSpinner();
    }
}

async function checkAndAwardAchievements(days) {
    const user = auth.currentUser;
    if (!user || user.isAnonymous || days < 1) return;
    showSpinner();
    try {
        for (const milestone of milestones) {
            if (days >= milestone.days) {
                const achievementRef = doc(db, "users", user.uid, "achievements", String(milestone.days));
                try {
                    const achievementSnap = await getDoc(achievementRef);
                    if (!achievementSnap.exists()) {
                        await setDoc(achievementRef, {
                            name: milestone.name,
                            icon: milestone.icon,
                            dateAwarded: serverTimestamp()
                        });
                        const userName = user.displayName || 'يا بطل';
                        document.getElementById('congrats-user-text').textContent = `مبارك يا ${userName}!`;
                        document.getElementById('congrats-text').textContent = `لقد حصلت على "${milestone.name}"`;
                        document.getElementById('congrats-icon').innerHTML = `<i class="${milestone.icon}"></i>`;
                        congratsModal.show();
                    }
                } catch (error) {
                    console.error(`Error checking achievement for ${milestone.days} days:`, error);
                }
            } else {
                break; 
            }
        }
    } finally {
        hideSpinner();
    }
}

async function displayAchievements() {
    const grid = document.getElementById('achievements-grid');
    const currentDays = window.currentStreakDays || 0;
    grid.innerHTML = ''; 

    milestones.forEach(milestone => {
        const requiredDays = milestone.days;
        const card = document.createElement('div');
        card.classList.add('achievement-card');
        let iconClass, cardTitle = milestone.name, cardSubText;

        if (currentDays >= requiredDays) {
            card.classList.remove('locked');
            iconClass = milestone.icon;
            cardSubText = `أكملت ${requiredDays} أيام بنجاح!`;
        } else {
            card.classList.add('locked');
            iconClass = 'bi bi-lock-fill';
            cardSubText = `أكمل ${requiredDays} يوماً لفتحه`;
        }
        
        card.innerHTML = `
            <div class="achievement-card-icon"><i class="${iconClass}"></i></div>
            <div class="achievement-card-title">${cardTitle}</div>
            <div class="achievement-card-date">${cardSubText}</div>
        `;
        grid.appendChild(card);
    });
}
// END: Achievements Logic

// START: Leaderboard Logic
/**
 * Normalizes a Date object to the start of its day in UTC (00:00:00).
 * This function is crucial for timezone-independent day calculations.
 * @param {Date} date The input date.
 * @returns {Date} A new Date object set to the beginning of the day in UTC.
 */
function getUTCDayStart(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

async function displayBannedList() {
    const bannedListBody = document.getElementById('banned-list-pane');
    bannedListBody.innerHTML = `<div class="loading-spinner-container"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    showSpinner();
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("isBannedFromLeaderboard", "==", true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            bannedListBody.innerHTML = '<p class="text-center text-secondary mt-3">قائمة المحظورين فارغة.</p>';
            return;
        }

        let bannedListHTML = '<ul class="leaderboard-list">';
        querySnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const profilePic = userData.photoURL || 'https://placehold.co/100x100/1e1e1e/fafafa?text=?';
            const restoreButtonHTML = `<i class="bi bi-arrow-counterclockwise leaderboard-restore-btn" data-userid="${userDoc.id}" title="إلغاء الحظر"></i>`;

            bannedListHTML += `
                <li class="leaderboard-item" id="banned-user-${userDoc.id}">
                    <img src="${profilePic}" alt="User Picture" class="leaderboard-user-pic" style="margin-left: 1rem; margin-right: 0;">
                    <div class="leaderboard-user-info">
                        <h6 class="leaderboard-user-name">${userData.displayName || 'مستخدم'}</h6>
                    </div>
                    ${restoreButtonHTML}
                </li>`;
        });
        bannedListHTML += '</ul>';
        bannedListBody.innerHTML = bannedListHTML;

        document.querySelectorAll('#leaderboardModal .leaderboard-restore-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const userIdToRestore = event.target.dataset.userid;
                if (confirm('هل أنت متأكد من إلغاء حظر هذا المستخدم؟')) {
                    showSpinner();
                    try {
                        const userToUpdateRef = doc(db, "users", userIdToRestore);
                        await updateDoc(userToUpdateRef, { isBannedFromLeaderboard: false });
                        event.target.closest('.leaderboard-item').remove();
                    } catch (error) { console.error("Error unbanning user: ", error); }
                    finally { hideSpinner(); }
                }
            });
        });

    } catch (error) {
        console.error("Error fetching banned list: ", error);
        bannedListBody.innerHTML = '<p class="text-center text-danger mt-3">حدث خطأ أثناء تحميل القائمة.</p>';
    } finally {
        hideSpinner();
    }
}

async function displayLeaderboard() {
    const leaderboardListPane = document.getElementById('leaderboard-list-pane');
    const leaderboardFooter = document.getElementById('leaderboard-footer-user-rank');
    const tabsContainer = document.getElementById('leaderboard-tabs-container');
    const modalTitle = document.getElementById('leaderboardModalLabel');
    const user = auth.currentUser;
    if (!user) return;

    leaderboardListPane.innerHTML = `<div class="loading-spinner-container"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    leaderboardFooter.innerHTML = `<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border spinner-border-sm text-light" role="status"></div></div>`;
    document.getElementById('banned-list-pane').innerHTML = '';
    
    let allRankedUsers = [];

    showSpinner();
    try {
        let currentUserRole = 'user';
        const currentUserDoc = await getDoc(doc(db, "users", user.uid));
        if (currentUserDoc.exists()) {
            currentUserRole = currentUserDoc.data().role || 'user';
        }

        if (currentUserRole === 'developer') {
            tabsContainer.classList.remove('d-none');
            modalTitle.classList.add('d-none');
            const bannedTab = document.getElementById('banned-list-tab');
            if (!bannedTab.hasAttribute('data-listener-added')) {
                bannedTab.addEventListener('click', displayBannedList);
                bannedTab.setAttribute('data-listener-added', 'true');
            }
        } else {
            tabsContainer.classList.add('d-none');
            modalTitle.classList.remove('d-none');
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("timerStartDate", "asc"));
        
        const querySnapshot = await getDocs(q);
        
        allRankedUsers = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.timerStartDate && data.role !== 'developer' && data.isBannedFromLeaderboard !== true;
        });
        
        if (allRankedUsers.length === 0) {
            leaderboardListPane.innerHTML = '<p class="text-center text-secondary mt-3">لا يوجد مستخدمون في لوحة الصدارة بعد.</p>';
        } else {
            let leaderboardHTML = '<ul class="leaderboard-list">';
            allRankedUsers.forEach((userDoc, index) => {
                const userData = userDoc.data();
                const startDate = userData.timerStartDate.toDate();
                
                // -- BEGIN ROBUST TIMEZONE FIX --
                const startDayUTC = getUTCDayStart(startDate);
                const todayUTC = getUTCDayStart(new Date());

                let recoveryDays = 0;
                if (!isNaN(startDayUTC.getTime())) {
                    const diffTime = todayUTC.getTime() - startDayUTC.getTime();
                    recoveryDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                }
                // -- END ROBUST TIMEZONE FIX --

                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                let rankDisplay = rank <= 3 ? `<div class="leaderboard-rank-medal">${['🥇', '🥈', '🥉'][rank - 1]}</div>` : `<div class="leaderboard-rank">${rank}</div>`;
                const profilePic = userData.photoURL || 'https://placehold.co/100x100/1e1e1e/fafafa?text=?';
                const deleteButtonHTML = currentUserRole === 'developer' ? `<i class="bi bi-x-circle-fill leaderboard-delete-btn" data-userid="${userDoc.id}" title="حظر من لوحة الصدارة"></i>` : '';
                
                leaderboardHTML += `
                    <li class="leaderboard-item ${rankClass}" id="user-rank-${userDoc.id}" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userAchievementsModal" data-userid="${userDoc.id}">
                        ${rankDisplay}
                        <img src="${profilePic}" alt="User Picture" class="leaderboard-user-pic">
                        <div class="leaderboard-user-info">
                            <h6 class="leaderboard-user-name">${userData.displayName || 'مستخدم'}</h6>
                            <p class="leaderboard-user-days">${recoveryDays} يوم</p>
                        </div>
                        ${deleteButtonHTML}
                    </li>`;
            });
            leaderboardHTML += '</ul>';
            leaderboardListPane.innerHTML = leaderboardHTML;
        }
        
        if (currentUserRole === 'developer') {
            document.querySelectorAll('#leaderboardModal .leaderboard-delete-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    event.stopPropagation(); // Prevent modal from opening
                    const userIdToBan = event.target.dataset.userid;
                    if (confirm("هل أنت متأكد من حظر هذا المستخدم من لوحة الصدارة؟")) {
                        showSpinner();
                        try {
                            const userToUpdateRef = doc(db, "users", userIdToBan);
                            await updateDoc(userToUpdateRef, { isBannedFromLeaderboard: true });
                            event.target.closest('.leaderboard-item').remove();
                        } catch (error) { console.error("Error banning user: ", error); }
                        finally { hideSpinner(); }
                    }
                });
            });
        }

        // Inner function to calculate and display user's rank
        const findUserRank = () => {
            if (!currentUserDoc.exists() || !currentUserDoc.data().timerStartDate) {
                leaderboardFooter.innerHTML = 'ابدأ العداد لتظهر في الترتيب';
                return;
            }

            const userRankIndex = allRankedUsers.findIndex(doc => doc.id === user.uid);

            if (userRankIndex !== -1) {
                leaderboardFooter.innerHTML = `🌟 ترتيبك الحالي: ${userRankIndex + 1} 🌟`;
            } else {
                leaderboardFooter.innerHTML = 'أنت غير مُصنّف حاليًا';
            }
        };

        findUserRank();

    } catch (error) {
        console.error("Error fetching leaderboard: ", error);
        leaderboardListPane.innerHTML = '<p class="text-center text-danger mt-3">حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة مرة أخرى.</p>';
        leaderboardFooter.innerHTML = 'خطأ في تحميل الترتيب';
    } finally {
        hideSpinner();
    }
}
// END: Leaderboard Logic

// START: User Achievements Modal Logic
async function displayUserAchievements(userId) {
    const grid = document.getElementById('user-achievements-grid');
    grid.innerHTML = `<div class="loading-spinner-container w-100 d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
    showSpinner();
    try {
        const achievementsRef = collection(db, "users", userId, "achievements");
        const q = query(achievementsRef, orderBy("dateAwarded", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p class="text-center text-secondary mt-3 w-100" style="grid-column: 1 / -1;">هذا المستخدم لم يحصل على أي وسام بعد.</p>';
            return;
        }

        let achievementsHTML = '';
        querySnapshot.forEach(doc => {
            const achievement = doc.data();
            const date = achievement.dateAwarded?.toDate().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) || 'غير محدد';
            
            achievementsHTML += `
                <div class="achievement-card">
                    <div class="achievement-card-icon"><i class="${achievement.icon || 'bi-trophy-fill'}"></i></div>
                    <div class="achievement-card-title">${achievement.name}</div>
                    <div class="achievement-card-date">حصل عليه في: ${date}</div>
                </div>
            `;
        });
        grid.innerHTML = achievementsHTML;

    } catch (error) {
        console.error("Error fetching user achievements:", error);
        grid.innerHTML = '<p class="text-center text-danger mt-3 w-100" style="grid-column: 1 / -1;">حدث خطأ أثناء تحميل الأوسمة.</p>';
    } finally {
        hideSpinner();
    }
}
// END: User Achievements Modal Logic


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
        snapshot.forEach(doc => { if (doc.data().senderId !== userId) count++; });
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

document.addEventListener('DOMContentLoaded', () => {
    function applyBackgroundPreference() {
        const savedTheme = localStorage.getItem('appBackgroundTheme') || 'default';
        const body = document.body;
        body.classList.remove('solid-black-bg', 'gradient-blue-bg');
        if (savedTheme === 'solid-black') {
            body.classList.add('solid-black-bg');
        } else if (savedTheme === 'gradient-blue') {
            body.classList.add('gradient-blue-bg');
        }
    }
    applyBackgroundPreference();

    let startTime = null;
    let timerInterval = null;
    window.currentStreakDays = 0;
    let currentUserRole = 'user';
    let breathingTimeouts = [];
    let countdownInterval = null;
    let lastSolution = null;
    const welcomeUserEl = document.getElementById('welcome-user');
    const openSendModalBtn = document.getElementById('open-send-modal-btn');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const timerSettingsIcon = document.querySelector('.timer-settings-icon');
    const notificationBadge = document.querySelector('.notification-badge');
    const notificationsModalEl = document.getElementById('notifications-modal');
    let latestNotificationTimestamp = null;
    const natureImages = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
        'https://images.unsplash.com/photo-1488866022504-f2584929ca5f?w=800&q=80',
        'https://images.unsplash.com/photo-1542314831-068cd1dbb563?w=800&q=80',
        'https://images.unsplash.com/photo-1507525428034-b723a996f6ea?w=800&q=80'
    ];
    let lastImageIndex = -1;
    let modalsInitialized = false;

    const appLockOverlay = document.getElementById('app-lock-overlay');
    const passcodeError = document.getElementById('passcode-error');
    const unlockBtn = document.getElementById('unlock-btn');
    const passcodeInput = document.getElementById('passcode-input');
    const RELOCK_TIME = 3 * 60 * 1000;

    function getLockData() {
        try {
            return JSON.parse(localStorage.getItem('app_lock_config')) || { enabled: false, passcode: null };
        } catch (e) {
            return { enabled: false, passcode: null };
        }
    }

    function initializeModalListeners() {
        if (modalsInitialized) return;

        const achievementsModalEl = document.getElementById('achievementsModal');
        achievementsModalEl.addEventListener('show.bs.modal', displayAchievements);

        const leaderboardModalEl = document.getElementById('leaderboardModal');
        leaderboardModalEl.addEventListener('show.bs.modal', displayLeaderboard);
        
        const userAchievementsModalEl = document.getElementById('userAchievementsModal');
        userAchievementsModalEl.addEventListener('show.bs.modal', (event) => {
            const triggerElement = event.relatedTarget; 
            if (triggerElement) {
                const userId = triggerElement.getAttribute('data-userid');
                if (userId) {
                    const userName = triggerElement.querySelector('.leaderboard-user-name').textContent;
                    const modalTitleEl = userAchievementsModalEl.querySelector('.modal-title');
                    if(modalTitleEl) {
                        modalTitleEl.textContent = `أوسمة ${userName}`;
                    }
                    displayUserAchievements(userId);
                }
            }
        });
        
        modalsInitialized = true;
    }
    
    function initializeAppLock() {
        const lockData = getLockData();
        if (!lockData.enabled) return;
        const lastUnlock = localStorage.getItem('app_last_unlock') || 0;
        const timeSinceUnlock = Date.now() - lastUnlock;
        if (timeSinceUnlock >= RELOCK_TIME) {
            appLockOverlay.style.display = 'flex';
        }
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
            const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyYn_lPlFg25E8QTJQGie4ams49eYQekl-qZ9mm9oB4BkLyBtuTS2ZX9pw6D5mfj1Io/exec";
            const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
            window[callbackName] = function(data) {
                delete window[callbackName];
                document.body.removeChild(script);
                if (data.error) {
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
                resolve("إذا أردت إرسال طلب آخر اضغط على أيقونة الرئيسية في الشريط السفلي");
                hideSpinner();
            };
            document.body.appendChild(script);
        });
    }

    function setupGeminiFeatures() {
        const inspirationBtn = document.getElementById('inspiration-btn');
        
        inspirationBtn.addEventListener('click', async () => {
            const inspirationDisplay = document.getElementById('inspiration-display');
            const inspirationText = document.getElementById('inspiration-text');
            inspirationBtn.disabled = true;
            inspirationBtn.innerHTML = `<span>لحظة أفكر لك بحل... <i class="bi bi-hourglass-split"></i></span>`;
            
            let basePrompt = `أنا عندي رغبة قوية مرة إني أشوف مقاطع إباحية وأبغى حل جذري وفوري. بصفتك ناصح أمين وفاهم على منهج السلف الصالح، عطني نصيحة عملية ومباشرة أقدر أسويها الحين عشان أتجاوز هذي الرغبة. التزم بالقواعد التالية بدقة: 1. **اللهجة:** تكلم باللهجة السعودية العامية (نجدية أو حجازية). 2. **الأسلوب:** خل كلامك طبيعي كأنك تسولف مع خويك، مو كأنك آلة. 3. **التنسيق:** لا تستخدم أي تشكيل (فتحة، ضمة، كسرة) ولا أي علامات ترقيم (لا فاصلة ولا نقطة). 4. **الطول:** عطني جملة جدا طويلة ارجوك . 5. **التنوع:** إذا قلت لك 'أبغى حل ثاني'، عطني حل جديد ومختلف تماماً. لا تكرر نفس الكلام.`;
            if (lastSolution) basePrompt += `\nالحل اللي عطيتني إياه قبل هو: ${lastSolution}. لا تكرره وعطني شي جديد.`;

            const generatedText = await callGeminiAPI(basePrompt);
            if (generatedText && !generatedText.includes('خطأ')) lastSolution = generatedText;
            
            let newImageIndex;
            do { newImageIndex = Math.floor(Math.random() * natureImages.length); } while (newImageIndex === lastImageIndex && natureImages.length > 1);
            lastImageIndex = newImageIndex; 
            inspirationDisplay.style.backgroundImage = `url('${natureImages[newImageIndex]}')`;
            inspirationText.innerHTML = generatedText.replace(/\n/g, '<br>');
            inspirationDisplay.classList.remove('d-none');
            inspirationBtn.disabled = false;
            inspirationBtn.innerHTML = `<span>🔥 أبغى حل ثاني</span>`;
        });

        // START: ADDED for Salaf Story Button
        const salafStoryBtn = document.getElementById('salaf-story-btn');
        const salafStoryDisplay = document.getElementById('salaf-story-display');
        const salafStoryText = document.getElementById('salaf-story-text');
        let lastSalafStory = null; // Separate tracking variable

        salafStoryBtn.addEventListener('click', async () => {
            salafStoryDisplay.classList.remove('d-none');
            salafStoryText.innerHTML = `<div class="d-flex justify-content-center align-items:center p-4"><div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
            salafStoryBtn.disabled = true;
            salafStoryBtn.innerHTML = `<span>لحظة نجيب لك قصة تروقك... <i class="bi bi-hourglass-split"></i></span>`;

            // The new prompt requested by the user
            let salafPrompt = `بصفتك ناصح  امين وفاهم على منهج السلف الصالح اسمع يا صاحبي أبغاك تسولف لي سالفة عن واحد من الصالحين وكيف كان خوفه من الله وتقواه وكيف كان يجاهد نفسه عشان يترك المعاصي وكيف لقى لذة الإيمان الحقيقية واربط لي هالكلام بموضوع التعافي من الإدمان وكيف إن لذة الطاعة أحلى وأبقى من لذة المعصية الزايلة

بس عندي كم شرط مهم مرة لازم تمشي عليها:

1.  **الشخصيات:** لا تجيب لي سيرة الخلفاء الراشدين الأربعة (أبو بكر وعمر وعثمان وعلي) لأني أعرف قصصهم. أبغاك تجيب لي قصص عشوائية وجديدة كل مرة من حياة التابعين وتابعي التابعين والعلماء والصالحين والعباد والزهاد من كل العصور. يعني كل مرة أطلب منك عطني قصة لشخصية مختلفة تماما ولا تكرر لي نفس الشخصية أبدا.

2.  **المنهج:** لا تطلع عن منهج السلف الصالح في طريقة سردك للقصص والمعلومات.

3.  **اللهجة:** تكلم باللهجة السعودية العامية وخلك طبيعي كأنك تسولف مع خويك في استراحة.

4.  **التنسيق:** لا تستخدم أي علامات ترقيم (لا فاصلة ولا نقطة) ولا أي تشكيل (فتحة ضمة كسرة) نهائيا.

5.  **الطول:** عطني كلام طويل ومفصل وسولف من قلبك لا تختصر السالفة.

يلا الحين عطني أول قصة.
`;
            if (lastSalafStory) {
                salafPrompt += `\nالقصة اللي عطيتني إياها قبل كانت عن: ${lastSalafStory.substring(0, 50)}. لا تكررها وعطني قصة جديدة.`;
            }

            const generatedText = await callGeminiAPI(salafPrompt);

            if (generatedText && !generatedText.includes('خطأ') && !generatedText.includes('مشكلة')) {
                lastSalafStory = generatedText;
            }
            
            let newImageIndex;
            do {
                newImageIndex = Math.floor(Math.random() * natureImages.length);
            } while (newImageIndex === lastImageIndex && natureImages.length > 1);
            lastImageIndex = newImageIndex;
            salafStoryDisplay.style.backgroundImage = `url('${natureImages[newImageIndex]}')`;

            salafStoryText.innerHTML = generatedText.replace(/\n/g, '<br>');
            
            salafStoryBtn.disabled = false;
            salafStoryBtn.innerHTML = `<span>📖 أبغى قصة ثانية</span>`;
        });
        // END: ADDED for Salaf Story Button
    }

    onAuthStateChanged(auth, async (user) => {
        showSpinner();
        try {
            if (user && (user.emailVerified || user.isAnonymous)) {
                document.body.style.visibility = 'visible';
                initializeAppLock();

                setInterval(() => { if (document.visibilityState === 'visible') localStorage.setItem('app_last_unlock', Date.now()); }, 60 * 1000); 
                document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') initializeAppLock(); });
                
                initializeGlobalChatNotifications(user.uid);
                listenForBackgroundImageChanges();

                if (user.isAnonymous) {
                    welcomeUserEl.textContent = `مرحبا ٲيها الزائر`;
                    openSendModalBtn.classList.add('d-none');
                    const visitorTimerStart = localStorage.getItem('visitorTimerStart');
                    if (visitorTimerStart) {
                        startTime = new Date(parseInt(visitorTimerStart));
                        startTimerBtn.classList.add('d-none');
                        timerSettingsIcon.classList.remove('d-none');
                        updateTimer();
                        if(timerInterval) clearInterval(timerInterval);
                        timerInterval = setInterval(updateTimer, 1000);
                    } else {
                        startTimerBtn.classList.remove('d-none');
                        timerSettingsIcon.classList.add('d-none');
                        updateTimerDisplay(0, 0, 0, 0);
                    }
                    loadNotifications(null);
                    initializeModalListeners();
                } else {
                    welcomeUserEl.textContent = `مرحبا ${user.displayName || 'المستخدم'}`;
                    const userDocRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        currentUserRole = userDoc.data().role || 'user';
                        if (currentUserRole === 'developer') { 
                            openSendModalBtn.classList.remove('d-none'); 
                            document.getElementById('developer-background-options').classList.remove('d-none');
                        }
                        if (userDoc.data().timerStartDate) {
                            startTime = userDoc.data().timerStartDate.toDate();
                            startTimerBtn.classList.add('d-none'); 
                            timerSettingsIcon.classList.remove('d-none'); 
                            updateTimer();
                            if (timerInterval) clearInterval(timerInterval);
                            timerInterval = setInterval(updateTimer, 1000);
                        } else {
                            startTimerBtn.classList.remove('d-none'); 
                            timerSettingsIcon.classList.add('d-none'); 
                            updateTimerDisplay(0,0,0,0); 
                        }
                    } else {
                        await setDoc(userDocRef, { role: 'user', lastSeenNotificationTimestamp: new Date(0), displayName: user.displayName, photoURL: user.photoURL }, { merge: true });
                        startTimerBtn.classList.remove('d-none');
                        timerSettingsIcon.classList.add('d-none');
                        updateTimerDisplay(0,0,0,0);
                    }
                    loadNotifications(user.uid);
                    initializeModalListeners();
                }
            } else {
                window.location.href = 'index.html';
            }
        } finally {
            hideSpinner();
        }
    });

    startTimerBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        startTime = new Date();
        showSpinner();
        try {
            if (user && !user.isAnonymous) {
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, { timerStartDate: startTime }, { merge: true });
            } else {
                localStorage.setItem('visitorTimerStart', startTime.getTime());
            }
            startTimerBtn.classList.add('d-none');
            timerSettingsIcon.classList.remove('d-none');
            updateTimer();
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimer, 1000);
        } finally {
            hideSpinner();
        }
    });

    async function loadNotifications(userId) {
        const notificationsList = document.getElementById('notifications-list');
        let lastSeenTimestamp = new Date(0);

        showSpinner();
        try {
            if (userId) {
                const userDoc = await getDoc(doc(db, "users", userId));
                lastSeenTimestamp = userDoc.data()?.lastSeenNotificationTimestamp?.toDate() || new Date(0);
            }

            const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
            onSnapshot(q, (snapshot) => {
                notificationsList.innerHTML = "";
                if (snapshot.empty) {
                    notificationsList.innerHTML = '<p class="text-center text-muted">لا توجد إشعارات حالياً.</p>';
                    notificationBadge.style.display = 'none';
                    return;
                }

                if (userId) {
                    latestNotificationTimestamp = snapshot.docs[0].data().createdAt?.toDate();
                    notificationBadge.style.display = latestNotificationTimestamp > lastSeenTimestamp ? 'block' : 'none';
                } else {
                    notificationBadge.style.display = 'none';
                }

                snapshot.forEach(docSnapshot => {
                    const notification = docSnapshot.data();
                    const date = notification.createdAt?.toDate().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) || '';
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    const deleteIconHTML = (currentUserRole === 'developer' && userId) ? `<i class="bi bi-trash delete-notification-btn" data-id="${docSnapshot.id}" style="display: inline-block;"></i>` : '';
                    item.innerHTML = `${deleteIconHTML}<div class="d-flex justify-content-between align-items-center"><h6 class="notification-title mb-1">${notification.title}</h6><span class="notification-date">${date}</span></div><p class="notification-body mb-0">${notification.message}</p>`;
                    notificationsList.appendChild(item);
                });

                if (currentUserRole === 'developer' && userId) {
                    document.querySelectorAll('.delete-notification-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
                                showSpinner();
                                try {
                                    await deleteDoc(doc(db, "notifications", e.target.getAttribute('data-id')));
                                } finally {
                                    hideSpinner();
                                }
                            }
                        });
                    });
                }
            });
        } finally {
            hideSpinner();
        }
    }

    notificationsModalEl.addEventListener('show.bs.modal', async () => {
        const user = auth.currentUser;
        if (user && !user.isAnonymous && latestNotificationTimestamp) {
            notificationBadge.style.display = 'none';
            await updateDoc(doc(db, "users", user.uid), { lastSeenNotificationTimestamp: latestNotificationTimestamp });
        }
    });
    
    const sendNotificationModal = new bootstrap.Modal(document.getElementById('send-notification-modal'));
    document.getElementById('send-notification-btn').addEventListener('click', async () => {
        const title = document.getElementById('notification-title').value.trim();
        const message = document.getElementById('notification-message').value.trim();
        if (!title || !message) return;
        showSpinner();
        try {
            await addDoc(collection(db, "notifications"), { title, message, createdAt: serverTimestamp() });
            document.getElementById('notification-title').value = '';
            document.getElementById('notification-message').value = '';
            sendNotificationModal.hide();
        } finally {
            hideSpinner();
        }
    });

    const dateElement = document.getElementById('current-date');
    const [daysValueEl, hoursValueEl, minutesValueEl, secondsValueEl] = ['days-value', 'hours-value', 'minutes-value', 'seconds-value'].map(id => document.getElementById(id));
    const [daysFillEl, hoursFillEl, minutesFillEl, secondsFillEl] = ['days-fill', 'hours-fill', 'minutes-fill', 'seconds-fill'].map(id => document.getElementById(id));
    
    dateElement.textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    function updateTimerDisplay(d, h, m, s) {
        daysValueEl.textContent = d; hoursValueEl.textContent = h; minutesValueEl.textContent = m; secondsValueEl.textContent = s;
        daysFillEl.style.width = `${Math.min(d > 0 ? ((d % 30) / 29) * 100 : 0, 100)}%`;
        hoursFillEl.style.width = `${Math.min(h > 0 ? (h / 23) * 100 : 0, 100)}%`;
        minutesFillEl.style.width = `${Math.min(m > 0 ? (m / 59) * 100 : 0, 100)}%`;
        secondsFillEl.style.width = `${Math.min(s > 0 ? (s / 59) * 100 : 0, 100)}%`;
    }

    function updateTimer() {
        if (!startTime) { updateTimerDisplay(0,0,0,0); return; };
        const difference = new Date() - startTime;
        if (difference < 0) { updateTimerDisplay(0,0,0,0); return; }
        const days = Math.floor(difference / 86400000);
        const hours = Math.floor((difference % 86400000) / 3600000);
        const minutes = Math.floor((difference % 3600000) / 60000);
        const seconds = Math.floor((difference % 60000) / 1000);
        updateTimerDisplay(days, hours, minutes, seconds);

        window.currentStreakDays = days;
        if (days > lastCheckedDay) {
            checkAndAwardAchievements(days);
            lastCheckedDay = days;
        }
    }

    const settingsModalOverlay = document.getElementById('settings-modal-overlay');
    const confirmResetModal = document.getElementById('confirm-reset-modal');
    const closeSettingsModal = () => settingsModalOverlay.classList.remove('show');
    document.querySelector('.timer-settings-icon').addEventListener('click', () => settingsModalOverlay.classList.add('show'));
    document.getElementById('close-settings-button').addEventListener('click', closeSettingsModal);
    document.getElementById('set-date-button').addEventListener('click', () => document.getElementById('date-time-picker').showPicker());
    
    document.getElementById('date-time-picker').addEventListener('change', async (e) => {
        if (!e.target.value) return;
        const newStartTime = new Date(e.target.value);
        if (isNaN(newStartTime.getTime())) return;
        
        showSpinner();
        try {
            const user = auth.currentUser;
            if (user && !user.isAnonymous) {
                await resetAchievements();
                await setDoc(doc(db, "users", user.uid), { timerStartDate: newStartTime }, { merge: true });
            } else {
                localStorage.setItem('visitorTimerStart', newStartTime.getTime());
            }
            location.reload();
        } finally {
            hideSpinner();
        }
    });

    document.getElementById('reset-timer-button').addEventListener('click', () => { closeSettingsModal(); setTimeout(() => confirmResetModal.classList.add('show'), 300); });
    const closeConfirmModal = () => confirmResetModal.classList.remove('show');
    document.getElementById('cancel-reset-button').addEventListener('click', closeConfirmModal);
    
    document.getElementById('confirm-reset-action-button').addEventListener('click', async () => {
        showSpinner();
        try {
            const user = auth.currentUser;
            if (user && !user.isAnonymous) await resetAchievements(); 
            const newStartTime = new Date();
            if (user && !user.isAnonymous) {
                await setDoc(doc(db, "users", user.uid), { timerStartDate: newStartTime }, { merge: true });
            } else {
                localStorage.setItem('visitorTimerStart', newStartTime.getTime());
            }
            location.reload();
        } finally {
            hideSpinner();
        }
    });


    const breathingPage = document.getElementById('breathing-page');
    const homePage = document.getElementById('home-page');
    const quotePage = document.getElementById('quote-page');
    
    function stopBreathingCycle() {
        breathingTimeouts.forEach(clearTimeout); breathingTimeouts = [];
        if (countdownInterval) clearInterval(countdownInterval);
    }

    async function showQuotePage() {
        let newImageIndex;
        do { newImageIndex = Math.floor(Math.random() * natureImages.length); } while (newImageIndex === lastImageIndex);
        lastImageIndex = newImageIndex;
        quotePage.style.backgroundImage = `url('${natureImages[newImageIndex]}')`;
        
        breathingPage.classList.remove('active');
        quotePage.classList.add('active');
        
        document.getElementById('quote-text').innerHTML = '<div class="spinner-border text-light"></div>';
        const prompt = "بصفتك ناصح أمين على منهج السلف الصالح خاطب شخص على وشك يطيح في معصية العادة السرية أو مشاهدة الإباحية عطه كلام قوي ومباشر يجمع بين العقل والترهيب والتذكير بعواقب الفعل عشان يتراجع فورا تكلم باللهجة السعودية العامية وردك لازم يكون بدون تشكيل وبدون أي علامات ترقيم نهائيا وخليه قصير ومختصر وطبيعي كأنك تكلم خويك";
        document.getElementById('quote-text').innerHTML = await callGeminiAPI(prompt);
    }

    document.getElementById('najda-button').addEventListener('click', () => {
        stopBreathingCycle();
        homePage.classList.remove('active');
        breathingPage.classList.add('active');
        let remainingTime = 57;
        const breathingTimerEl = document.getElementById('breathing-timer');
        countdownInterval = setInterval(() => {
            remainingTime--;
            breathingTimerEl.textContent = `الوقت المتبقي: ${remainingTime} ثانية`;
            if (remainingTime < 0) { stopBreathingCycle(); showQuotePage(); }
        }, 1000);
        
        const breathingTextEl = document.getElementById('breathing-text');
        function cycle() {
            breathingTextEl.textContent = 'شهيق';
            breathingTimeouts.push(setTimeout(() => { breathingTextEl.textContent = 'حبس النفس'; }, 4000));
            breathingTimeouts.push(setTimeout(() => { breathingTextEl.textContent = 'زفير'; }, 11000));
            breathingTimeouts.push(setTimeout(cycle, 19000));
        }
        cycle();
    });

    document.getElementById('close-breathing-btn').addEventListener('click', () => {
        stopBreathingCycle();
        breathingPage.classList.remove('active');
        homePage.classList.add('active');
    });
    document.getElementById('close-quote-btn').addEventListener('click', () => {
        quotePage.classList.remove('active');
        homePage.classList.add('active');
    });
    document.getElementById('skip-to-quote-btn').addEventListener('click', () => {
        stopBreathingCycle();
        showQuotePage();
    });
    
    const cardElement = document.querySelector('.progress-timer-card');
    const imageElement = document.getElementById('counter-image-bg');
    const overlayElement = document.querySelector('.image-background-overlay');
    const setImageButton = document.getElementById('set-image-button');
    const removeBackgroundButton = document.getElementById('remove-background-button');
    const imageFilePicker = document.getElementById('image-file-picker');

    function setCounterBackgroundImage(imageUrl) {
        if (imageUrl) {
            cardElement.style.background = 'none';
            overlayElement.classList.add('visible');
            imageElement.src = imageUrl;
            imageElement.classList.add('visible');
        } else {
            cardElement.style.background = '';
            overlayElement.classList.remove('visible');
            imageElement.classList.remove('visible');
        }
    }
    
    function listenForBackgroundImageChanges() {
        onSnapshot(doc(db, "app_config", "background_image"), (doc) => {
            setCounterBackgroundImage(doc.exists() ? doc.data().url : null);
        });
    }

    async function uploadImageToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'back photo');
        formData.append('folder', 'back photo'); 
        showSpinner();
        try {
            setImageButton.innerHTML = `<span>جاري الرفع...</span>`;
            setImageButton.disabled = true;
            const response = await fetch(`https://api.cloudinary.com/v1_1/dsf3gudnd/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            return data.secure_url || null;
        } catch (error) { return null; }
        finally {
             setImageButton.innerHTML = `<span>تعيين صورة خلفية</span><div class="icon-container green"><i class="bi bi-image"></i></div>`;
             setImageButton.disabled = false;
             hideSpinner();
        }
    }
    
    async function updateBackgroundImageInFirestore(url) {
        showSpinner();
        try {
            await setDoc(doc(db, "app_config", "background_image"), { url: url }, { merge: true });
        } finally {
            hideSpinner();
        }
    }

    setImageButton.addEventListener('click', () => imageFilePicker.click());
    removeBackgroundButton.addEventListener('click', async () => {
        await updateBackgroundImageInFirestore(null);
        closeSettingsModal();
    });

    imageFilePicker.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const imageUrl = await uploadImageToCloudinary(file);
            if (imageUrl) await updateBackgroundImageInFirestore(imageUrl);
            closeSettingsModal();
        }
    });

    setupGeminiFeatures();

    // --- START: Commitment Document logic ---
    const formPage = document.getElementById('form-page');
    const documentPage = document.getElementById('document-page');
    const editPage = document.getElementById('edit-page');
    const createForm = document.getElementById('commitment-form');
    const editForm = document.getElementById('commitment-form-edit');
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const commitmentPages = { formPage, documentPage, editPage };
    const userSignatureEl = document.getElementById('user-signature');

    // MODIFIED: This function now handles fade transitions
    const showCommitmentPage = (pageId) => {
        Object.values(commitmentPages).forEach(page => {
            // We no longer use Tailwind's 'hidden' class, we use our own '.visible' class
            page.classList.remove('hidden'); 
            
            if (page.id === pageId) {
                page.classList.add('visible');
            } else {
                page.classList.remove('visible');
            }
        });
        // Find the currently visible page to scroll it to the top
        const visiblePage = document.querySelector('#commitment-document-page .visible');
        if (visiblePage) {
            visiblePage.scrollTo(0, 0);
        }
    };

    const populateDocument = (data) => {
        document.getElementById('damages-output').textContent = data.damages || '';
        document.getElementById('fears-output').textContent = data.fears || '';
        document.getElementById('responses-output').textContent = data.responses || '';
        document.getElementById('benefits-output').textContent = data.benefits || '';
        document.getElementById('escape-plan-output').textContent = data.escapePlan || '';
        document.getElementById('message-output').textContent = data.message || '';
        document.getElementById('current-date-doc').textContent = new Date().toLocaleDateString('ar-EG');
    };

    const populateEditForm = (data) => {
        document.getElementById('edit-damages').value = data.damages || '';
        document.getElementById('edit-fears').value = data.fears || '';
        document.getElementById('edit-responses').value = data.responses || '';
        document.getElementById('edit-benefits').value = data.benefits || '';
        document.getElementById('edit-escape-plan').value = data.escapePlan || '';
        document.getElementById('edit-message').value = data.message || '';
    };

    // Function to load data based on user auth state
    const loadCommitmentData = async () => {
        const user = auth.currentUser;
        showSpinner();
        try {
            if (user && !user.isAnonymous) {
                // Registered user: use Firestore
                const docRef = doc(db, "users", user.uid, "commitment", "document");
                try {
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        populateDocument(data);
                        if(userSignatureEl) userSignatureEl.textContent = user.displayName || 'مستخدم';
                        showCommitmentPage('document-page');
                    } else {
                        showCommitmentPage('form-page');
                    }
                } catch (error) {
                    console.error("Error getting commitment document from Firestore:", error);
                    showCommitmentPage('form-page'); // Fallback to form on error
                }
            } else {
                // Anonymous user: use localStorage
                const savedData = localStorage.getItem('commitmentDocument');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    populateDocument(data);
                    if(userSignatureEl) userSignatureEl.textContent = 'زائر';
                    showCommitmentPage('document-page');
                } else {
                    showCommitmentPage('form-page');
                }
            }
        } finally {
            hideSpinner();
        }
    };

    // Function to save data based on user auth state
    const saveCommitmentData = async (data) => {
        const user = auth.currentUser;
        showSpinner();
        try {
            if (user && !user.isAnonymous) {
                // Registered user: save to Firestore
                const docRef = doc(db, "users", user.uid, "commitment", "document");
                await setDoc(docRef, data);
            } else {
                // Anonymous user: save to localStorage
                localStorage.setItem('commitmentDocument', JSON.stringify(data));
            }
        } finally {
            hideSpinner();
        }
    };

    // Function to delete data based on user auth state
    const deleteCommitmentData = async () => {
        const user = auth.currentUser;
        showSpinner();
        try {
            if (user && !user.isAnonymous) {
                // Registered user: delete from Firestore
                const docRef = doc(db, "users", user.uid, "commitment", "document");
                await deleteDoc(docRef);
            } else {
                // Anonymous user: delete from localStorage
                localStorage.removeItem('commitmentDocument');
            }
        } finally {
            hideSpinner();
        }
    };


    // Event listener for the create form
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const data = {
            damages: document.getElementById('damages').value,
            fears: document.getElementById('fears').value,
            responses: document.getElementById('responses').value,
            benefits: document.getElementById('benefits').value,
            escapePlan: document.getElementById('escape-plan').value,
            message: document.getElementById('message').value
        };
        await saveCommitmentData(data);
        populateDocument(data);
        if(userSignatureEl) userSignatureEl.textContent = (user && !user.isAnonymous) ? (user.displayName || 'مستخدم') : 'زائر';
        showCommitmentPage('document-page');
    });

    // Event listener for the edit button
    editBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        let data;
        showSpinner();
        try {
            if (user && !user.isAnonymous) {
                const docRef = doc(db, "users", user.uid, "commitment", "document");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    data = docSnap.data();
                }
            } else {
                const savedData = localStorage.getItem('commitmentDocument');
                if (savedData) data = JSON.parse(savedData);
            }

            if (data) {
                populateEditForm(data);
                showCommitmentPage('edit-page');
            }
        } finally {
            hideSpinner();
        }
    });


    // Event listener for the edit form
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const updatedData = {
            damages: document.getElementById('edit-damages').value,
            fears: document.getElementById('edit-fears').value,
            responses: document.getElementById('edit-responses').value,
            benefits: document.getElementById('edit-benefits').value,
            escapePlan: document.getElementById('edit-escape-plan').value,
            message: document.getElementById('edit-message').value
        };
        await saveCommitmentData(updatedData);
        populateDocument(updatedData);
        if(userSignatureEl) userSignatureEl.textContent = (user && !user.isAnonymous) ? (user.displayName || 'مستخدم') : 'زائر';
        showCommitmentPage('document-page');
    });

    // Event listener for the delete button
    deleteBtn.addEventListener('click', () => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-auto text-center">
                <h3 class="text-xl font-bold mb-4 text-gray-800">تأكيد الحذف</h3>
                <p class="text-gray-600 mb-6">هل أنت متأكد من أنك تريد حذف الوثيقة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                <div class="flex justify-center space-x-4 space-x-reverse">
                    <button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">حذف</button>
                    <button id="cancel-delete-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">إلغاء</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
            await deleteCommitmentData();
            createForm.reset();
            document.body.removeChild(modal);
            showCommitmentPage('form-page');
        });
        document.getElementById('cancel-delete-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    });
    // --- END: Commitment Document logic ---


    // --- START: New Navigation Logic ---
    const commitmentPageContainer = document.getElementById('commitment-document-page');
    const commitmentBtn = document.getElementById('commitment-btn');
    const backToHomeBtn = document.getElementById('back-to-home-btn');

    if(commitmentBtn) {
        commitmentBtn.addEventListener('click', async () => {
            await loadCommitmentData(); // Load data before showing the page
            if(homePage) homePage.classList.remove('active');
            if(commitmentPageContainer) commitmentPageContainer.classList.add('active');
        });
    }

    if(backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            if(commitmentPageContainer) commitmentPageContainer.classList.remove('active');
            if(homePage) homePage.classList.add('active');
        });
    }
    // --- END: New Navigation Logic ---
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
}
