import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, where, orderBy, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
}
applyBackgroundPreference();
// --- END: Background Theme Logic ---

const DEVELOPER_UID = "sytCf4Ru91ZplxTeXYfvqGhDnn12";
const firebaseConfig = {
    apiKey: "AIzaSyAGgZmhJ_mMezlf7xElisvzJ8l9D758d4g",
    authDomain: "my-chat-app-daaf8.firebaseapp.com",
    projectId: "my-chat-app-daaf8",
    storageBucket: "my-chat-app-daaf8.appspot.com",
    messagingSenderId: "789086064752",
    appId: "1:789086064752:web:d081f1b6832dabca1d64b5"
};

const CLOUDINARY_CLOUD_NAME = "dbkzk1oe2"; 
const CLOUDINARY_BOOK_PRESET = "library_files"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
            if (doc.data().senderId !== userId) {
                count++;
            }
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
                if (!data[`hidden_for_${userId}`]) {
                    count += (data[`unread_count_${userId}`] || 0);
                }
            });
            privateUnreadCount = count;
            updateBadge();
        });
    } else {
        privateUnreadCount = 0;
        updateBadge();
    }
}

const libraryView = document.getElementById('library-view');
const pdfReaderView = document.getElementById('pdf-reader-view');
const pdfCanvas = document.getElementById('pdf-canvas');
const pageNumSpan = document.getElementById('page-num');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomRange = document.getElementById('zoom-range');
const currentZoomPercent = document.getElementById('current-zoom-percent');
const displayModeBtn = document.getElementById('display-mode-btn'); 
const closeReaderBtn = document.getElementById('close-reader-btn');
const saveOfflineBtn = document.getElementById('save-offline-btn');
let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumIsPending = null;
let currentBookId = null, currentPdfUrl = null, currentScale = parseFloat(zoomRange.value);
let currentUser = null;
let addBookModalInstance = null;
let appToastInstance = null;

const sectionsContainer = document.getElementById('sections-container');
const noBooksPlaceholder = document.getElementById('no-books-placeholder');
const addBookModalEl = document.getElementById('addBookModal');
const addSectionModalEl = document.getElementById('addSectionModal');

let moveBookModalInstance = null;
const moveBookModalEl = document.getElementById('moveBookModal');
const moveBookForm = document.getElementById('move-book-form');
const moveBookIdInput = document.getElementById('move-book-id');
const moveBookTitleEl = document.getElementById('move-book-title');
const moveBookSectionSelect = document.getElementById('move-book-section');

let editBookModalInstance = null;
const editBookModalEl = document.getElementById('editBookModal');
const editBookForm = document.getElementById('edit-book-form');
let unsubscribeSections = null;
const bookUnsubscribers = {};

let currentView = 'public';

let userFavorites = new Set();
let unsubscribeFavorites = null;

let goToPageModalInstance = null;
const goToPageModalEl = document.getElementById('goToPageModal');
const goToPageModalForm = document.getElementById('go-to-page-modal-form');
const goToPageModalInput = document.getElementById('go-to-page-modal-input');
const pageRangeInfo = document.getElementById('page-range-info');

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

const getSectionsCollection = () => collection(db, currentView === 'private' ? `users/${DEVELOPER_UID}/private_sections` : 'sections');
const getBooksCollection = () => collection(db, currentView === 'private' ? `users/${DEVELOPER_UID}/private_books` : 'books');
const getFavoritesCollection = () => {
    if (!currentUser) return null;
    return collection(db, 'user_profiles', currentUser.uid, 'favorites');
}

document.addEventListener('DOMContentLoaded', () => {
     addBookModalInstance = new bootstrap.Modal(addBookModalEl);
     new bootstrap.Modal(addSectionModalEl);
     moveBookModalInstance = new bootstrap.Modal(moveBookModalEl);
     editBookModalInstance = new bootstrap.Modal(editBookModalEl);
     goToPageModalInstance = new bootstrap.Modal(goToPageModalEl);
     appToastInstance = new bootstrap.Toast(document.getElementById('app-toast'));
     pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
     updateZoomDisplay();
     setupPdfPanning();
     window.addEventListener('resize', () => {
        if (pdfDoc && !pageIsRendering) {
            renderPage(pageNum);
        }
     });
});

onAuthStateChanged(auth, async (user) => {
    initializeAppLock();
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            localStorage.setItem('app_last_unlock', Date.now());
        }
    }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            initializeAppLock();
        }
    });
    if (!user) {
        try {
            currentUser = (await signInAnonymously(auth)).user;
        } catch (error) { console.error("Anonymous sign in failed:", error); return; }
    } else {
         currentUser = user; 
    }
    
    initializeGlobalChatNotifications(currentUser.uid);
    
    const isDeveloper = currentUser.uid === DEVELOPER_UID;
    document.querySelector('.fab').style.display = isDeveloper ? 'flex' : 'none';
    document.getElementById('add-section-btn').style.display = isDeveloper ? 'block' : 'none';
    
    const viewToggle = document.getElementById('developer-view-toggle');
    if (isDeveloper) {
        document.getElementById('library-title').classList.add('d-none');
        viewToggle.classList.remove('d-none');
        viewToggle.addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                const view = e.target.dataset.view;
                if (view !== currentView) {
                    switchView(view);
                }
            }
        });
    }
    
    listenToFavorites();
    await fetchAndApplyUserPreferences();
    fetchSectionsAndBooks(); 
});

function showToast(title, body) {
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-body').textContent = body;
    appToastInstance.show();
}

async function checkIfBookIsCached(url) {
    if (!('caches' in window)) return false;
    const cache = await caches.open('unified-assets-cache-v1');
    const response = await cache.match(url);
    return !!response;
}

async function updateOfflineButtonState(pdfUrl) {
    const isCached = await checkIfBookIsCached(pdfUrl);
    const icon = saveOfflineBtn.querySelector('i');
    if (isCached) {
        saveOfflineBtn.disabled = true;
        saveOfflineBtn.title = "الكتاب محفوظ بالفعل";
        icon.className = 'bi bi-check-circle-fill';
    } else {
        saveOfflineBtn.disabled = false;
        saveOfflineBtn.title = "حفظ الكتاب للقراءة بدون انترنت";
        icon.className = 'bi bi-cloud-arrow-down-fill';
    }
}

saveOfflineBtn.addEventListener('click', async () => {
    if (currentPdfUrl) {
        saveOfflineBtn.disabled = true;
        const icon = saveOfflineBtn.querySelector('i');
        icon.className = 'spinner-border spinner-border-sm';

        try {
            await fetch(currentPdfUrl); 
            showToast('نجاح', 'تم حفظ الكتاب بنجاح!');
            updateOfflineButtonState(currentPdfUrl);
        } catch (error) {
            console.error('Caching failed:', error);
            showToast('فشل', 'لم يتمكن من حفظ الكتاب.');
            updateOfflineButtonState(currentPdfUrl);
        }
    }
});

sectionsContainer.addEventListener('click', (e) => {
    const favoriteBtn = e.target.closest('.favorite-btn');
    if (favoriteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const bookId = favoriteBtn.dataset.bookId;
        if (bookId) {
            toggleFavorite(bookId);
        }
    }
});

function switchView(view) {
    currentView = view;
    const toggleButtons = document.querySelectorAll('#developer-view-toggle button');
    toggleButtons.forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    fetchSectionsAndBooks();
}

function fetchSectionsAndBooks() {
    if (unsubscribeSections) unsubscribeSections();
    Object.values(bookUnsubscribers).forEach(unsub => unsub());

    const sectionsQuery = query(getSectionsCollection(), orderBy("createdAt", "asc"));
    
    unsubscribeSections = onSnapshot(sectionsQuery, (snapshot) => {
        const existingSectionIds = new Set();
        snapshot.forEach(doc => existingSectionIds.add(doc.id));
        
        const sectionElements = sectionsContainer.querySelectorAll('.section-container:not(#favorites-section-container)');
        sectionElements.forEach(el => {
            const sectionId = el.id.replace('section-', '');
            if (!existingSectionIds.has(sectionId)) {
                el.remove();
            }
        });

        if (snapshot.empty && userFavorites.size === 0) {
            noBooksPlaceholder.style.display = 'block';
        } else {
             noBooksPlaceholder.style.display = 'none';
        }

        snapshot.forEach(sectionDoc => {
            const section = sectionDoc.data();
            const sectionId = sectionDoc.id;
            if (!document.getElementById(`section-${sectionId}`)) {
               renderSection(sectionId, section.title);
            }
            fetchBooksForSection(sectionId);
        });

    }, (error) => console.error("Error fetching sections:", error));
}

function renderSection(sectionId, title) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'section-container';
    sectionEl.id = `section-${sectionId}`;
    sectionEl.innerHTML = `
        <div class="section-header">
            <h5>${title}</h5>
            <a href="#" class="show-more-btn" data-section-id="${sectionId}">عرض المزيد <i class="bi bi-arrow-left-short"></i></a>
        </div>
        <div class="books-row"></div>
    `;
    sectionsContainer.appendChild(sectionEl);

    sectionEl.querySelector('.show-more-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const hiddenBooks = document.querySelectorAll(`#section-${sectionId} .book-card.d-none`);
        hiddenBooks.forEach(book => book.classList.remove('d-none'));
        e.target.style.display = 'none';
    });
}

function createBookCardElement(bookId, book) {
    const el = document.createElement('div');
    el.className = 'book-card';
    el.dataset.bookId = bookId;

    const isDeveloper = currentUser && currentUser.uid === DEVELOPER_UID;
    const isFavorite = userFavorites.has(bookId);

    let menuItems = `<li><a class="dropdown-item favorite-btn" href="#" data-book-id="${bookId}">
        <i class="bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i>
        <span style="margin-right: 8px;">${isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}</span>
    </a></li>`;

    if (isDeveloper) {
        menuItems += `
           <li><a class="dropdown-item edit-btn" href="#" data-book-id="${bookId}">تعديل</a></li>
           <li><a class="dropdown-item move-btn" href="#" data-book-id="${bookId}" data-book-title="${book.title}">نقل...</a></li>
           <li><hr class="dropdown-divider"></li>
           <li><a class="dropdown-item text-danger delete-btn" href="#" data-book-id="${bookId}">حذف</a></li>
        `;
    } else {
        menuItems += `<li><a class="dropdown-item download-btn" href="${book.pdfUrl}" download="${book.title}.pdf">تنزيل</a></li>`;
    }

    el.innerHTML = `
        <img src="${book.coverImageUrl || 'https://placehold.co/280x360/1e1e1e/FAFAFA?text=غلاف'}" alt="غلاف">
        <h6 class="card-title text-center">${book.title}</h6>
        <div class="book-actions dropdown">
            <button class="btn btn-sm text-white bg-dark bg-opacity-50 rounded-circle" type="button" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-dark">
                ${menuItems}
            </ul>
        </div>
    `;

    el.addEventListener('click', (e) => {
        if (!e.target.closest('.book-actions')) {
             openPdfReader(bookId, book.pdfUrl, book.title);
        }
    });

    if(isDeveloper) {
        el.querySelector('.delete-btn')?.addEventListener('click', (e) => {
           e.preventDefault(); e.stopPropagation();
           if (confirm('هل أنت متأكد من حذف هذا الكتاب؟')) {
               deleteBook(e.target.dataset.bookId);
           }
        });
        el.querySelector('.move-btn')?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openMoveBookModal(
                e.currentTarget.dataset.bookId, 
                e.currentTarget.dataset.bookTitle, 
                book.sectionId
            );
        });
        el.querySelector('.edit-btn')?.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            openEditBookModal(e.target.dataset.bookId);
        });
    }
    return el;
}

function fetchBooksForSection(sectionId) {
    if (bookUnsubscribers[sectionId]) bookUnsubscribers[sectionId]();

    const booksQuery = query(getBooksCollection(), where("sectionId", "==", sectionId));
    
    bookUnsubscribers[sectionId] = onSnapshot(booksQuery, (snapshot) => {
        const sectionEl = document.getElementById(`section-${sectionId}`);
        if (!sectionEl) return;

        const booksRow = sectionEl.querySelector('.books-row');
        const showMoreBtn = sectionEl.querySelector('.show-more-btn');
        booksRow.innerHTML = '';

        if (snapshot.empty) {
             return;
        }
        sectionEl.style.display = 'block';
        
        showMoreBtn.style.display = snapshot.size > 15 ? 'inline' : 'none';
        
        const sortedDocs = snapshot.docs.sort((a, b) => (a.data().createdAt?.toMillis() || 0) - (b.data().createdAt?.toMillis() || 0));

        sortedDocs.forEach((doc, index) => {
            const book = doc.data();
            const bookId = doc.id;
            const el = createBookCardElement(bookId, book);
            
            if (index >= 15) el.classList.add('d-none');
            booksRow.appendChild(el);
        });
    }, (error) => console.error(`Error fetching books for section ${sectionId}:`, error));
}

function listenToFavorites() {
    if (unsubscribeFavorites) unsubscribeFavorites();
    const favoritesCollection = getFavoritesCollection();
    if (!favoritesCollection) {
        userFavorites.clear();
        renderFavoritesSection();
        return;
    }

    unsubscribeFavorites = onSnapshot(favoritesCollection, (snapshot) => {
        const newFavorites = new Set();
        snapshot.forEach(doc => newFavorites.add(doc.id));
        userFavorites = newFavorites;
        renderFavoritesSection();
        updateAllFavoriteIcons();
    });
}

async function renderFavoritesSection() {
    let sectionEl = document.getElementById('favorites-section-container');

    if (userFavorites.size === 0) {
        if (sectionEl) sectionEl.remove();
        if (document.querySelectorAll('.section-container').length === 0) {
            noBooksPlaceholder.style.display = 'block';
        }
        return;
    } else {
         noBooksPlaceholder.style.display = 'none';
    }

    if (!sectionEl) {
        sectionEl = document.createElement('div');
        sectionEl.className = 'section-container';
        sectionEl.id = 'favorites-section-container';
        sectionEl.innerHTML = `
            <div class="section-header">
                <h5><i class="bi bi-heart-fill" style="color: var(--danger-color);"></i> المفضلة</h5>
            </div>
            <div class="books-row"></div>
        `;
        sectionsContainer.prepend(sectionEl);
    }

    const booksRow = sectionEl.querySelector('.books-row');
    
    const bookPromises = Array.from(userFavorites).map(async (bookId) => {
        try {
            let bookRef = doc(db, 'books', bookId);
            let bookDoc = await getDoc(bookRef);
            if (!bookDoc.exists() && currentUser?.uid === DEVELOPER_UID) {
                bookRef = doc(db, `users/${DEVELOPER_UID}/private_books`, bookId);
                bookDoc = await getDoc(bookRef);
            }

            if (bookDoc.exists()) {
                return createBookCardElement(bookDoc.id, bookDoc.data());
            } else {
                await deleteDoc(doc(getFavoritesCollection(), bookId));
                return null;
            }
        } catch (error) {
            console.error(`Error fetching favorite book ${bookId}:`, error);
            return null;
        }
    });

    const bookCards = (await Promise.all(bookPromises)).filter(Boolean);

    booksRow.innerHTML = '';
    bookCards.forEach(card => booksRow.appendChild(card));
}

async function toggleFavorite(bookId) {
    if (!currentUser) return;
    const favoritesCollection = getFavoritesCollection();
    if (!favoritesCollection) return;
    const bookRef = doc(favoritesCollection, bookId);

    try {
        if (userFavorites.has(bookId)) {
            await deleteDoc(bookRef);
        } else {
            await setDoc(bookRef, { createdAt: serverTimestamp() });
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
    }
}

function updateAllFavoriteIcons() {
    document.querySelectorAll('.book-card').forEach(card => {
        const bookId = card.dataset.bookId;
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (bookId && favoriteBtn) {
            const isFavorite = userFavorites.has(bookId);
            const icon = favoriteBtn.querySelector('i');
            const text = favoriteBtn.querySelector('span');

            icon.className = `bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart'}`;
            text.textContent = isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة';
        }
    });
}

async function deleteBook(bookId) {
     if (!bookId) return;
     try {
        await deleteDoc(doc(getBooksCollection(), bookId));
     } catch(error) { console.error("Error deleting book:", error); }
}

async function editSection(sectionId, currentTitle) {
    const newTitle = prompt("أدخل العنوان الجديد للقسم:", currentTitle);
    if (newTitle && newTitle.trim() !== '' && newTitle.trim() !== currentTitle) {
        try {
            await updateDoc(doc(getSectionsCollection(), sectionId), {
                title: newTitle.trim()
            });
        } catch (error) {
            console.error("Error updating section title: ", error);
        }
    }
}

async function deleteSection(sectionId) {
    if (!confirm('هل أنت متأكد من حذف هذا القسم وكل الكتب الموجودة فيه؟')) return;
    try {
        const booksQuery = query(getBooksCollection(), where("sectionId", "==", sectionId));
        const booksSnapshot = await getDocs(booksQuery);
        const deletePromises = booksSnapshot.docs.map(bookDoc => deleteDoc(bookDoc.ref));
        await Promise.all(deletePromises);
        await deleteDoc(doc(getSectionsCollection(), sectionId));
    } catch (error) { console.error("Error deleting section:", error); }
}

addSectionModalEl.addEventListener('show.bs.modal', () => {
    const q = query(getSectionsCollection(), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('sections-list-modal');
        list.innerHTML = snapshot.empty ? '<li class="list-group-item list-group-item-dark">لا توجد أقسام.</li>' : '';
        snapshot.forEach(doc => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-dark d-flex justify-content-between align-items-center';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = doc.data().title;
            li.appendChild(titleSpan);

            const buttonsDiv = document.createElement('div');

            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-sm btn-outline-info me-2';
            editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
            editBtn.onclick = () => editSection(doc.id, doc.data().title);
            buttonsDiv.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-sm btn-outline-danger';
            delBtn.innerHTML = '<i class="bi bi-trash"></i>';
            delBtn.onclick = () => deleteSection(doc.id);
            buttonsDiv.appendChild(delBtn);
            
            li.appendChild(buttonsDiv);
            list.appendChild(li);
        });
    });
});

document.getElementById('add-section-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('section-title');
    const title = titleInput.value.trim();
    if (!title) return;
    try {
        await addDoc(getSectionsCollection(), { title, createdAt: serverTimestamp() });
        titleInput.value = '';
    } catch (error) { console.error("Error adding section: ", error); }
});

addBookModalEl.addEventListener('show.bs.modal', () => {
    const selectEl = document.getElementById('book-section');
    selectEl.innerHTML = '<option value="">جار التحميل...</option>';
    const q = query(getSectionsCollection(), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        selectEl.innerHTML = '<option value="">اختر قسمًا...</option>';
        snapshot.forEach(doc => {
            selectEl.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`;
        });
    });
});

document.getElementById('add-book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-book-btn');
    const spinner = saveBtn.querySelector('.spinner-border');
    const statusDiv = document.getElementById('add-book-status');

    if (!currentUser || currentUser.uid !== DEVELOPER_UID) return;

    saveBtn.disabled = true; spinner.classList.remove('d-none');
    statusDiv.className = 'alert alert-info mt-2'; statusDiv.textContent = 'جارٍ رفع الملفات...';

    try {
        const sectionId = document.getElementById('book-section').value;
        if (!sectionId) throw new Error("الرجاء اختيار قسم للكتاب.");

        const title = document.getElementById('book-title').value;
        const pdfFile = document.getElementById('book-pdf-file').files[0];
        if (!pdfFile) throw new Error("الرجاء اختيار ملف PDF.");

        const pdfUrl = await uploadToCloudinary(pdfFile, CLOUDINARY_BOOK_PRESET, 'raw');
        let coverImageUrl = null;
        const imageFile = document.getElementById('book-cover-image').files[0];
        if (imageFile) {
            coverImageUrl = await uploadToCloudinary(imageFile, CLOUDINARY_BOOK_PRESET, 'image');
        }
        
        await addDoc(getBooksCollection(), {
            sectionId, title, coverImageUrl, pdfUrl,
            description: document.getElementById('book-description').value,
            userId: currentUser.uid, createdAt: serverTimestamp()
        });
        
        statusDiv.classList.replace('alert-info', 'alert-success');
        statusDiv.textContent = 'تمت إضافة الكتاب بنجاح!';

        setTimeout(() => {
            if(addBookModalInstance) addBookModalInstance.hide();
            e.target.reset(); statusDiv.classList.add('d-none');
        }, 2000);

    } catch (error) {
        statusDiv.classList.replace('alert-info', 'alert-danger');
        statusDiv.textContent = `حدث خطأ: ${error.message}`;
    } finally {
        saveBtn.disabled = false; spinner.classList.add('d-none');
    }
});

async function uploadToCloudinary(file, preset, resourceType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', preset);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!response.ok) {
        throw new Error(`Cloudinary: ${(await response.json()).error.message}`);
    }
    return (await response.json()).secure_url;
}

async function openMoveBookModal(bookId, bookTitle, currentSectionId) {
    moveBookIdInput.value = bookId;
    moveBookTitleEl.textContent = bookTitle;
    moveBookSectionSelect.innerHTML = '<option value="">جار التحميل...</option>';
    try {
        const sectionsSnapshot = await getDocs(query(getSectionsCollection(), orderBy("createdAt", "desc")));
        let optionsHtml = '';
        sectionsSnapshot.forEach(doc => {
            if (doc.id !== currentSectionId) {
                optionsHtml += `<option value="${doc.id}">${doc.data().title}</option>`;
            }
        });
        moveBookSectionSelect.innerHTML = optionsHtml || '<option value="">لا توجد أقسام أخرى</option>';
        moveBookModalInstance.show();
    } catch (error) { console.error("Error loading sections for move modal:", error); }
}

moveBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = moveBookIdInput.value, newSectionId = moveBookSectionSelect.value;
    if (!bookId || !newSectionId) return;
    try {
        await updateDoc(doc(getBooksCollection(), bookId), { sectionId: newSectionId });
        moveBookModalInstance.hide();
    } catch (error) { console.error("Error moving book:", error); }
});

async function openEditBookModal(bookId) {
    try {
        const bookRef = doc(getBooksCollection(), bookId);
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
            const book = bookSnap.data();
            document.getElementById('edit-book-id').value = bookId;
            document.getElementById('edit-book-title').value = book.title;
            document.getElementById('edit-book-description').value = book.description || '';
            editBookModalInstance.show();
        } else {
            console.error("No such book document!");
        }
    } catch (error) {
        console.error("Error opening edit book modal: ", error);
    }
}

editBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = document.getElementById('edit-book-id').value;
    const newTitle = document.getElementById('edit-book-title').value;
    const newDescription = document.getElementById('edit-book-description').value;

    if (!bookId || !newTitle.trim()) return;

    try {
        await updateDoc(doc(getBooksCollection(), bookId), {
            title: newTitle.trim(),
            description: newDescription.trim()
        });
        editBookModalInstance.hide();
    } catch (error) {
        console.error("Error updating book: ", error);
    }
});

function setupPdfPanning() {
    const viewer = document.getElementById('pdf-viewer-container');
    let isPanning = false;
    let startX, startY, scrollLeftStart, scrollTopStart;

    const startPan = (e) => {
        isPanning = true;
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        startX = pageX - viewer.offsetLeft;
        startY = pageY - viewer.offsetTop;
        scrollLeftStart = viewer.scrollLeft;
        scrollTopStart = viewer.scrollTop;
        if(e.type === 'mousedown') e.preventDefault();
    };

    const endPan = () => {
        isPanning = false;
    };

    const doPan = (e) => {
        if (!isPanning) return;
        if(e.type === 'touchmove') e.preventDefault();
        const pageX = e.pageX || e.touches[0].pageX;
        const pageY = e.pageY || e.touches[0].pageY;
        const x = pageX - viewer.offsetLeft;
        const y = pageY - viewer.offsetTop;
        const walkX = (x - startX);
        const walkY = (y - startY);
        viewer.scrollLeft = scrollLeftStart - walkX;
        viewer.scrollTop = scrollTopStart - walkY;
    };

    viewer.addEventListener('mousedown', startPan);
    viewer.addEventListener('mouseup', endPan);
    viewer.addEventListener('mouseleave', endPan);
    viewer.addEventListener('mousemove', doPan);

    viewer.addEventListener('touchstart', startPan, { passive: true });
    viewer.addEventListener('touchend', endPan);
    viewer.addEventListener('touchcancel', endPan);
    viewer.addEventListener('touchmove', doPan, { passive: false });
}

async function fetchAndApplyUserPreferences() {
    if (!currentUser) return;
    const profileRef = doc(db, 'user_profiles', currentUser.uid);
    const profileSnap = await getDoc(profileRef);
    pdfCanvas.classList.remove('comfort-mode', 'night-mode');
    if (profileSnap.exists()) {
        const prefs = profileSnap.data();
        if (prefs.displayMode === 1) pdfCanvas.classList.add('comfort-mode');
        else if (prefs.displayMode === 2) pdfCanvas.classList.add('night-mode');
    }
}

const renderPage = num => {
    pageIsRendering = true;
    pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: currentScale });
        const canvasContext = pdfCanvas.getContext('2d');
        const qualityFactor = 3;
        const devicePixelRatio = (window.devicePixelRatio || 1) * qualityFactor;
        pdfCanvas.width = Math.floor(viewport.width * devicePixelRatio);
        pdfCanvas.height = Math.floor(viewport.height * devicePixelRatio);
        pdfCanvas.style.width = `${Math.floor(viewport.width)}px`;
        pdfCanvas.style.height = `${Math.floor(viewport.height)}px`;
        canvasContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        const renderContext = { canvasContext, viewport: viewport };
        page.render(renderContext).promise.then(() => {
            pageIsRendering = false;
            if(pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
        pageNumSpan.textContent = `${num} / ${pdfDoc.numPages}`;
    });
};
const queueRenderPage = num => { if(pageIsRendering) pageNumIsPending = num; else renderPage(num); }
const showPrevPage = () => { if(pageNum <= 1) return; pageNum--; queueRenderPage(pageNum); }
const showNextPage = () => { if(pageNum >= pdfDoc.numPages) return; pageNum++; queueRenderPage(pageNum); }

async function getUserBookProgress(bookId) {
    if (!currentUser) return {};
    const progressRef = doc(db, 'user_profiles', currentUser.uid, 'books_progress', bookId);
    const progressSnap = await getDoc(progressRef);
    return progressSnap.exists() ? progressSnap.data() : {};
}

async function openPdfReader(bookId, pdfUrl, title) {
    if (!pdfUrl) return;
    currentBookId = bookId;
    currentPdfUrl = pdfUrl; 
    await fetchAndApplyUserPreferences();
    libraryView.classList.add('d-none');
    pdfReaderView.classList.remove('d-none');
    pageNumSpan.textContent = 'يتم التحميل...';
    updateOfflineButtonState(pdfUrl);
    const userProgress = await getUserBookProgress(bookId);
    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;
        pageNum = userProgress.lastReadPage || 1;
        currentScale = userProgress.zoomLevel || 0.8; 
        zoomRange.value = currentScale;
        updateZoomDisplay();
        renderPage(pageNum);
    } catch (err) {
        console.error('Error loading PDF:', err);
        closePdfReader();
    }
}

async function closePdfReader() {
    if (currentUser && currentBookId) {
        const progressRef = doc(db, 'user_profiles', currentUser.uid, 'books_progress', currentBookId);
        try {
            await setDoc(progressRef, { lastReadPage: pageNum, zoomLevel: currentScale }, { merge: true });
        } catch (error) { console.error("Failed to save user progress:", error); }
    }
    pdfDoc = null; currentBookId = null; currentPdfUrl = null; pageNum = 1;
    libraryView.classList.remove('d-none');
    pdfReaderView.classList.add('d-none');
}
function updateZoomDisplay() { currentZoomPercent.textContent = `${Math.round(currentScale * 100)}%`; }
function changeZoom(amount) {
    let newScale = currentScale + amount;
    if (newScale < parseFloat(zoomRange.min)) newScale = parseFloat(zoomRange.min);
    if (newScale > parseFloat(zoomRange.max)) newScale = parseFloat(zoomRange.max);
    currentScale = parseFloat(newScale.toFixed(2));
    zoomRange.value = currentScale;
    updateZoomDisplay();
    if (pdfDoc) queueRenderPage(pageNum);
}
zoomOutBtn.addEventListener('click', () => changeZoom(-0.01));
zoomInBtn.addEventListener('click', () => changeZoom(0.01));
zoomRange.addEventListener('input', (event) => {
    currentScale = parseFloat(event.target.value);
    updateZoomDisplay();
    if (pdfDoc) queueRenderPage(pageNum);
});

displayModeBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    let newMode = 0;
    if (pdfCanvas.classList.contains('comfort-mode')) {
        pdfCanvas.classList.remove('comfort-mode');
        pdfCanvas.classList.add('night-mode');
        newMode = 2;
    } else if (pdfCanvas.classList.contains('night-mode')) {
        pdfCanvas.classList.remove('night-mode'); newMode = 0;
    } else {
        pdfCanvas.classList.add('comfort-mode'); newMode = 1;
    }
    const profileRef = doc(db, 'user_profiles', currentUser.uid);
    try { await setDoc(profileRef, { displayMode: newMode }, { merge: true });
    } catch (error) { console.error("Failed to save display mode preference:", error); }
});
closeReaderBtn.addEventListener('click', closePdfReader);
prevPageBtn.addEventListener('click', showPrevPage);
nextPageBtn.addEventListener('click', showNextPage);

goToPageModalEl.addEventListener('show.bs.modal', () => {
    if (pdfDoc) {
        pageRangeInfo.textContent = `أدخل رقمًا بين 1 و ${pdfDoc.numPages}.`;
        goToPageModalInput.max = pdfDoc.numPages;
        goToPageModalInput.min = 1;
        goToPageModalInput.value = pageNum;
    }
});

goToPageModalEl.addEventListener('shown.bs.modal', () => {
    goToPageModalInput.focus();
    goToPageModalInput.select();
});

goToPageModalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetPage = parseInt(goToPageModalInput.value, 10);

    if (isNaN(targetPage) || !pdfDoc || targetPage < 1 || targetPage > pdfDoc.numPages) {
        return;
    }
    
    if (targetPage !== pageNum) {
        pageNum = targetPage;
        queueRenderPage(pageNum);
    }
    goToPageModalInstance.hide();
});

// --- START: Search Functionality ---
const searchInput = document.getElementById('book-search-input');
const noSearchResultsMessage = document.getElementById('no-search-results');

function filterBooks(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const sections = document.querySelectorAll('#sections-container .section-container');
    let totalVisibleBooks = 0;

    // When search is cleared, reset everything and exit.
    if (term === '') {
        document.querySelectorAll('.search-hidden').forEach(el => el.classList.remove('search-hidden'));
        noSearchResultsMessage.style.display = 'none';
        // Show the original placeholder if no books exist at all.
        const hasAnyBooks = document.querySelectorAll('.book-card').length > 0;
        noBooksPlaceholder.style.display = hasAnyBooks ? 'none' : 'block';
        return;
    }

    // Hide the main placeholder during search
    noBooksPlaceholder.style.display = 'none';

    sections.forEach(section => {
        const books = section.querySelectorAll('.book-card');
        let visibleBooksInSection = 0;

        books.forEach(book => {
            const titleElement = book.querySelector('.card-title');
            const title = titleElement ? titleElement.textContent.toLowerCase() : '';
            
            if (title.includes(term)) {
                book.classList.remove('search-hidden');
                visibleBooksInSection++;
            } else {
                book.classList.add('search-hidden');
            }
        });

        if (visibleBooksInSection > 0) {
            section.classList.remove('search-hidden');
            totalVisibleBooks += visibleBooksInSection;
        } else {
            section.classList.add('search-hidden');
        }
    });

    noSearchResultsMessage.style.display = totalVisibleBooks === 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', (e) => {
    filterBooks(e.target.value);
});
// --- END: Search Functionality ---
