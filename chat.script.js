import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, getDocs, deleteDoc, setDoc, updateDoc, arrayUnion, arrayRemove, where, limit, increment, writeBatch, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// --- View References ---
const mainView = document.getElementById('main-view');
const privateChatView = document.getElementById('private-chat-view');
const groupChatView = document.getElementById('group-chat-view');

// --- Tab Content References ---
const groupChatTab = document.getElementById('group-chat-tab');
const usersListTab = document.getElementById('users-list-tab');
const groupsTab = document.getElementById('groups-tab');

// --- Group chat Tab ---
const originalChatStructure = document.createElement('div');
originalChatStructure.style.display = 'flex';
originalChatStructure.style.flexDirection = 'column';
originalChatStructure.style.height = '100%';
originalChatStructure.innerHTML = `
    <div id="pinned-message-container">
         <i id="unpin-button" class="bi bi-x-circle-fill"></i>
        <div id="pinned-message-clickable-area">
            <span id="pinned-by-text"></span>
            <span id="pinned-message-text"></span>
        </div>
    </div>
    <div class="main-content">
        <div id="chat-section">
            <div id="swipe-reply-icon" class="swipe-reply-icon-class"><i class="bi bi-reply-fill"></i></div>
            <div id="messages-box"></div>
            <div id="mention-notification">@</div>
        </div>
    </div>
    <div id="chat-footer">
        <div id="reply-preview" class="reply-preview">
            <div id="cancel-reply" style="position: absolute; top: 5px; right: 10px; cursor: pointer; font-size: 1.5rem; line-height: 1;">&times;</div>
            <div class="reply-preview-sender" id="reply-preview-sender"></div>
            <div id="reply-preview-text" class="reply-preview-text"></div>
        </div>
        <div class="card-footer p-3">
            <div class="input-group-wrapper">
                <div class="input-group">
                    <textarea id="message-input" class="form-control" placeholder="اكتب رسالتك..." rows="1"></textarea>
                    <button id="mic-button" class="mic-button"><i class="bi bi-mic-fill"></i></button>
                    <button id="send-button" class="btn"><i class="bi bi-send-fill"></i></button>
                </div>
            </div>
            <!-- START: Locked Recording UI -->
            <div id="locked-recording-ui" class="recording-ui" style="display: none; justify-content: space-between; width: 100%;">
                <button id="cancel-recording-btn" class="btn btn-lg text-danger"><i class="bi bi-trash-fill"></i></button>
                <div class="d-flex align-items: center gap-2">
                    <span class="recording-dot"></span>
                    <span id="locked-recording-timer">00:00</span>
                </div>
                <button id="send-recording-btn" class="mic-button"><i class="bi bi-send-fill"></i></button>
            </div>
            <!-- END: Locked Recording UI -->
            <div id="recording-ui" class="recording-ui" style="display: none;">
                <span class="recording-dot"></span>
                <span id="recording-timer">00:00</span>
            </div>
        </div>
    </div>
`;
groupChatTab.appendChild(originalChatStructure);

// --- Users Tab ---
usersListTab.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%;">
        <div id="user-search-container">
            <input type="search" id="user-search-input" class="form-control" placeholder="ابحث عن مستخدم...">
        </div>
        <div id="users-list-container" class="flex-grow-1">
             <h6 class="text-muted p-2 mt-2" id="conversation-list-title">المحادثات</h6>
            <div id="conversation-list">
                 <p class="text-center text-muted p-3">لا توجد محادثات خاصة بعد</p>
            </div>
        </div>
    </div>
`;

// --- Groups Tab ---
groupsTab.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%;">
        <div class="p-2 flex-shrink: 0;">
            <button class="btn btn-primary w-100" data-bs-toggle="modal" data-bs-target="#create-group-modal">
                <i class="bi bi-plus-circle-fill me-2"></i> إنشاء مجموعة جديدة
            </button>
        </div>
        
        <!-- My Groups Section -->
        <div id="my-groups-list-container" class="flex-grow-1" style="overflow-y: auto; display: flex; flex-direction: column; min-height: 40%;">
            <h6 class="text-white p-2 flex-shrink: 0;">مجموعاتي</h6>
            <div id="my-groups-list" class="flex-grow-1">
                <!-- My groups will be populated here -->
            </div>
        </div>
        
        <!-- Divider -->
        <hr class="my-1" style="border-color: var(--border-color);">

        <!-- Discover Groups Section -->
        <div id="discover-groups-list-container" class="flex-grow-1" style="overflow-y: auto; display: flex; flex-direction: column;">
            <h6 class="text-white p-2 flex-shrink: 0;">اكتشف مجموعات</h6>
            <div id="discover-groups-list" class="flex-grow-1">
                <!-- Discoverable groups will be populated here -->
            </div>
        </div>
    </div>
`;

// General UI References
const userDisplayName = document.getElementById('user-display-name');
const messagesBox = document.getElementById('messages-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const replyPreview = document.getElementById('reply-preview');
const cancelReplyButton = document.getElementById('cancel-reply');
const mentionNotification = document.getElementById('mention-notification');
const pinnedMessageContainer = document.getElementById('pinned-message-container');
const pinnedByText = document.getElementById('pinned-by-text');
const pinnedMessageText = document.getElementById('pinned-message-text');
const unpinButton = document.getElementById('unpin-button');
const pinnedMessageClickableArea = document.getElementById('pinned-message-clickable-area');

// Private Chat References
const usersListContainer = document.getElementById('users-list-container').querySelector('#conversation-list');
const userSearchInput = document.getElementById('user-search-input');
const backToMainViewBtn = document.getElementById('back-to-main-view');
const recipientNameEl = document.getElementById('recipient-name');
const recipientAvatarEl = document.getElementById('recipient-avatar');
const privateMessagesBox = document.getElementById('private-messages-box');
const privateMessageInput = document.getElementById('private-message-input');
const privateSendButton = document.getElementById('private-send-button');
const blockUnblockBtn = document.getElementById('block-unblock-btn');

// Group System References
const createGroupForm = document.getElementById('create-group-form');
const createGroupModal = new bootstrap.Modal(document.getElementById('create-group-modal'));
const groupMembersModalEl = document.getElementById('group-members-modal');
const groupMembersModal = new bootstrap.Modal(groupMembersModalEl);
const backToMainFromGroupBtn = document.getElementById('back-to-main-from-group');
const groupChatHeaderClickable = document.getElementById('group-chat-header-clickable');
const groupAvatarHeader = document.getElementById('group-avatar-header');
const uploadGroupPhotoContainer = document.getElementById('upload-group-photo-container');
const uploadGroupPhotoBtn = document.getElementById('upload-group-photo');
const deleteGroupPhotoBtn = document.getElementById('delete-group-photo');
const groupChatNameEl = document.getElementById('group-chat-name');
const groupMessagesBox = document.getElementById('group-messages-box');
const groupMessageInput = document.getElementById('group-message-input');
const groupSendButton = document.getElementById('group-send-button');
const joinRequestsContainer = document.getElementById('join-requests-container');
const groupReplyPreview = document.getElementById('group-reply-preview');
const cancelGroupReplyBtn = document.getElementById('cancel-group-reply');
const groupPinnedMessageContainer = document.getElementById('group-pinned-message-container');
const groupPinnedByText = document.getElementById('group-pinned-by-text');
const groupPinnedMessageText = document.getElementById('group-pinned-message-text');
const groupUnpinButton = document.getElementById('group-unpin-button');
const groupPinnedMessageClickableArea = document.getElementById('group-pinned-message-clickable-area');

// Edit Modal References
const editMessageModalEl = document.getElementById('edit-message-modal');
const editMessageTextarea = document.getElementById('edit-message-textarea');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editGroupDescriptionModalEl = document.getElementById('edit-group-description-modal');
const editGroupDescriptionModal = new bootstrap.Modal(editGroupDescriptionModalEl);
const editGroupDescriptionForm = document.getElementById('edit-group-description-form');

// App Lock References
const appLockOverlay = document.getElementById('app-lock-overlay');
const passcodeError = document.getElementById('passcode-error');
const unlockBtn = document.getElementById('unlock-btn');
const passcodeInput = document.getElementById('passcode-input');

// --- State Variables ---
let currentUserRole = 'user';
let currentDisplayName = 'زائر';
let replyToMessage = null;
let privateReplyToMessage = null; 
let groupReplyToMessage = null;
let editingMessageInfo = null;
const userProfiles = {};
let isVisitor = true;
let unreadCount = 0;
let originalFavicon = document.querySelector("link[rel*='icon']")?.href || '/favicon.ico';
const originalTitle = document.title;
let currentUserId = null;
let recipientId = null;
let privateChatRoomId = null;
let currentGroupId = null;
let currentGroupData = null; // To store current group info

let unsubscribePrivateChat = null;
let unsubscribeConversations = null;
let unsubscribeUserProfiles = null; 
let unsubscribeUserDoc = null; 
let unsubscribeRecipientDoc = null;
let unsubscribeMyGroups = null;
let unsubscribeGroupDoc = null;
let unsubscribeGroupMessages = null;
let unsubscribeJoinRequests = null;

const RELOCK_TIME = 3 * 60 * 1000;

// --- Voice Recording State ---
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimerInterval;
let activeRecordingContext = null; // 'public', 'private', or 'group'
let pressTimer = null;
let isLongPress = false;
const LONG_PRESS_DURATION = 200; // 200ms to trigger long press
let shouldDiscardRecording = false; // For cancelling a recording
let isSending = false;

// --- START: Custom Confirm Modal Logic ---
const confirmModalEl = document.getElementById('custom-confirm-modal');
const confirmMessageEl = document.getElementById('custom-confirm-message');
const confirmIconEl = confirmModalEl.querySelector('.confirm-modal-icon i');
const confirmOkBtn = document.getElementById('custom-confirm-ok');
const confirmCancelBtn = document.getElementById('custom-confirm-cancel');
let confirmCallback = null;

function showCustomConfirm(message, iconClass, onConfirm) {
    confirmMessageEl.textContent = message;
    confirmIconEl.className = iconClass;
    confirmCallback = onConfirm;
    confirmModalEl.classList.add('show');
}

confirmCancelBtn.addEventListener('click', () => {
    confirmModalEl.classList.remove('show');
    confirmCallback = null;
});

confirmOkBtn.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
    confirmModalEl.classList.remove('show');
    confirmCallback = null;
});
// --- END: Custom Confirm Modal Logic ---

// --- START: Audio Player Logic ---
const activeAudioPlayers = {}; // Keep track of active Audio objects to ensure only one plays at a time

function stopAllOtherPlayers(exceptId) {
    for (const id in activeAudioPlayers) {
        if (id !== exceptId) {
            const player = activeAudioPlayers[id];
            player.audio.pause();
            player.playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
    }
}

function initializeAudioPlayer(uniqueId) {
    const playerEl = document.getElementById(`player-${uniqueId}`);
    if (!playerEl || playerEl.dataset.initialized) return;

    const audioSrc = playerEl.dataset.audioSrc;
    const playBtn = playerEl.querySelector('.play-pause-btn');
    const progressBar = playerEl.querySelector('.progress-bar');
    const progressBarContainer = playerEl.querySelector('.progress-bar-container');
    
    const audio = new Audio(audioSrc);
    activeAudioPlayers[uniqueId] = { audio, playBtn };

    audio.addEventListener('timeupdate', () => {
        if (isFinite(audio.duration)) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
    });

    audio.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        progressBar.style.width = '0%';
        audio.currentTime = 0;
    });

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            stopAllOtherPlayers(uniqueId);
            audio.play();
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
            audio.pause();
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
    });

    progressBarContainer.addEventListener('click', (e) => {
        if (isFinite(audio.duration)) {
            const rect = progressBarContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const width = rect.width;
            const duration = audio.duration;
            audio.currentTime = (clickX / width) * duration;
        }
    });

    playerEl.dataset.initialized = 'true';
}

function renderVoiceMessage(url, duration, uniqueId) {
    const formatDuration = (seconds) => {
        if (!isFinite(seconds) || seconds < 0) {
            return "00:00";
        }
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        const paddedMinutes = String(minutes).padStart(2, '0');
        const paddedSeconds = String(remainingSeconds).padStart(2, '0');
        return `${paddedMinutes}:${paddedSeconds}`;
    };

    const formattedDuration = formatDuration(duration);

    return `
        <div class="audio-player" id="player-${uniqueId}" data-audio-src="${url}">
            <button class="play-pause-btn"><i class="bi bi-play-fill"></i></button>
            <div class="progress-bar-container">
                <div class="progress-bar"></div>
            </div>
            <span class="duration-text">${formattedDuration}</span>
        </div>
    `;
}
// --- END: Audio Player Logic ---

// --- START: Cloudinary Audio Upload ---
async function uploadAudioToCloudinary(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-message.webm');
    formData.append('upload_preset', 'my-voice-messages');

    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dkccdradf/video/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.secure_url) {
            return data;
        } else {
            throw new Error(data.error.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        showCustomConfirm('فشل رفع الرسالة الصوتية.', 'bi bi-exclamation-triangle-fill', () => {});
        return null;
    }
}
// --- END: Cloudinary Audio Upload ---

// --- START: Voice Recording Logic ---

function getActiveChatBox() {
    switch(activeRecordingContext) {
        case 'public': return messagesBox;
        case 'private': return privateMessagesBox;
        case 'group': return groupMessagesBox;
        default: return null;
    }
}

function createVoiceMessagePlaceholder(placeholderId) {
    const senderProfile = userProfiles[currentUserId] || {};
    const photoURL = senderProfile.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';

    const placeholder = document.createElement('div');
    if (activeRecordingContext === 'private') {
         placeholder.className = 'private-message-wrapper own';
    } else {
         placeholder.className = 'message own';
    }
    placeholder.id = placeholderId;
    placeholder.innerHTML = `
        <img src="${photoURL}" alt="Avatar" class="avatar">
        <div class="message-bubble">
            <div class="message-content">
                <div class="audio-player-placeholder">
                     <div class="spinner-border spinner-border-sm" role="status"></div>
                     <span>جاري الإرسال...</span>
                </div>
            </div>
        </div>
    `;
    return placeholder;
}

async function startRecording(context) {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeRecordingContext = context;
        audioChunks = [];
        shouldDiscardRecording = false;
        
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            if (isSending) {
                return;
            }
            
            stream.getTracks().forEach(track => track.stop());
            
            if (shouldDiscardRecording) {
                return;
            }
            
            isSending = true;

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const placeholderId = `ph-${Date.now()}`;
            const placeholderElement = createVoiceMessagePlaceholder(placeholderId);
            const chatBox = getActiveChatBox();
            if (chatBox) {
                chatBox.appendChild(placeholderElement);
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            (async () => {
                try {
                    const uploadResult = await uploadAudioToCloudinary(audioBlob);
                    if (uploadResult && uploadResult.secure_url) {
                        const durationInSeconds = uploadResult.duration;
                        let docRef;
                        switch (activeRecordingContext) {
                            case 'public':
                                docRef = await sendVoiceMessage(uploadResult.secure_url, durationInSeconds);
                                break;
                            case 'private':
                                docRef = await sendPrivateVoiceMessage(uploadResult.secure_url, durationInSeconds);
                                break;
                            case 'group':
                                docRef = await sendGroupVoiceMessage(uploadResult.secure_url, durationInSeconds);
                                break;
                        }
                        // The placeholder is no longer manually converted to a message here.
                        // The onSnapshot listener will handle rendering the final message.
                    }
                } finally {
                    // The placeholder is removed when the process is complete,
                    // allowing the onSnapshot listener to be the single source of truth.
                    document.getElementById(placeholderId)?.remove();
                    isSending = false;
                }
            })();
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();

        recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            const formattedTime = `${minutes}:${seconds}`;

            const prefix = context === 'public' ? '' : `${context}-`;
            const timerEl = document.getElementById(`${prefix}recording-timer`);
            const lockedTimerEl = document.getElementById(`${prefix}locked-recording-timer`);
            if(timerEl) timerEl.textContent = formattedTime;
            if(lockedTimerEl) lockedTimerEl.textContent = formattedTime;

        }, 1000);

    } catch (err) {
        console.error("Error accessing microphone:", err);
        showCustomConfirm('لا يمكن الوصول إلى الميكروفون. يرجى التحقق من الأذونات.', 'bi bi-mic-mute-fill', () => {});
        resetAllRecordingUIs(context);
    }
}

function stopRecording(discard = false) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        shouldDiscardRecording = discard;
        mediaRecorder.stop();
    }
    clearInterval(recordingTimerInterval);
    resetAllRecordingUIs(activeRecordingContext);
    isLongPress = false;
}

function showRecordingUI(context, mode) {
    const prefix = context === 'public' ? '' : `${context}-`;
    const inputWrapper = document.querySelector(`#${prefix === '' ? 'chat-footer' : `${prefix}chat-footer`} .input-group-wrapper`);
    const longPressUI = document.getElementById(`${prefix}recording-ui`);
    const lockedUI = document.getElementById(`${prefix}locked-recording-ui`);

    if (inputWrapper) inputWrapper.classList.add('hidden');
    if (mode === 'long-press') {
        if(lockedUI) lockedUI.style.display = 'none';
        if(longPressUI) longPressUI.style.display = 'flex';
    } else if (mode === 'locked') {
        if(longPressUI) longPressUI.style.display = 'none';
        if(lockedUI) lockedUI.style.display = 'flex';
    }
}

function resetAllRecordingUIs(context) {
    if (!context) return;
    const prefix = context === 'public' ? '' : `${context}-`;
    const inputWrapper = document.querySelector(`#${prefix === '' ? 'chat-footer' : `${prefix}chat-footer`} .input-group-wrapper`);
    const longPressUI = document.getElementById(`${prefix}recording-ui`);
    const lockedUI = document.getElementById(`${prefix}locked-recording-ui`);
    const timerEl = document.getElementById(`${prefix}recording-timer`);
    const lockedTimerEl = document.getElementById(`${prefix}locked-recording-timer`);

    if (inputWrapper) inputWrapper.classList.remove('hidden');
    if (longPressUI) longPressUI.style.display = 'none';
    if (lockedUI) lockedUI.style.display = 'none';
    if (timerEl) timerEl.textContent = '00:00';
    if (lockedTimerEl) lockedTimerEl.textContent = '00:00';
}

function handleMicButtonPress(e, context) {
    e.preventDefault();
    isLongPress = false; 
    pressTimer = setTimeout(() => {
        isLongPress = true;
        startRecording(context);
        showRecordingUI(context, 'long-press');
    }, LONG_PRESS_DURATION);
}

function handleMicButtonRelease(e, context) {
    e.preventDefault();
    clearTimeout(pressTimer);
    if (isLongPress) {
        stopRecording(false);
    } else {
        startRecording(context);
        showRecordingUI(context, 'locked');
    }
}

function setupMicButtonListeners(context) {
    const prefix = context === 'public' ? '' : `${context}-`;
    const micButton = document.getElementById(`${prefix}mic-button`);
    const sendLockedBtn = document.getElementById(`${prefix}send-recording-btn`);
    const cancelLockedBtn = document.getElementById(`${prefix}cancel-recording-btn`);

    if(micButton) {
        micButton.addEventListener('mousedown', (e) => handleMicButtonPress(e, context));
        micButton.addEventListener('mouseup', (e) => handleMicButtonRelease(e, context));
        micButton.addEventListener('mouseleave', () => {
            if (isLongPress && mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording(false);
            }
            clearTimeout(pressTimer);
        });
        micButton.addEventListener('touchstart', (e) => handleMicButtonPress(e, context));
        micButton.addEventListener('touchend', (e) => handleMicButtonRelease(e, context));
    }
    if(sendLockedBtn) sendLockedBtn.addEventListener('click', () => stopRecording(false));
    if(cancelLockedBtn) cancelLockedBtn.addEventListener('click', () => stopRecording(true));
}

setupMicButtonListeners('public');
setupMicButtonListeners('private');
setupMicButtonListeners('group');
// --- END: Voice Recording Logic ---


// --- START: View Management ---
function showMainView() {
    mainView.classList.add('active');
    privateChatView.classList.remove('active');
    groupChatView.classList.remove('active');
    
    recipientId = null;
    privateChatRoomId = null;
    currentGroupId = null;
    currentGroupData = null;
    
    groupChatHeaderClickable.onclick = null; // Clear click listener

    if (unsubscribePrivateChat) { unsubscribePrivateChat(); unsubscribePrivateChat = null; }
    if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
    if (unsubscribeRecipientDoc) { unsubscribeRecipientDoc(); unsubscribeRecipientDoc = null; }
    if (unsubscribeGroupMessages) { unsubscribeGroupMessages(); unsubscribeGroupMessages = null; }
    if (unsubscribeJoinRequests) { unsubscribeJoinRequests(); unsubscribeJoinRequests = null; }
    if (unsubscribeGroupDoc) { unsubscribeGroupDoc(); unsubscribeGroupDoc = null; }
}

async function showPrivateChatView(targetUserId, targetUserName, targetUserAvatar) {
    recipientId = targetUserId;
    if (!currentUserId || !recipientId) return;

    privateChatRoomId = [currentUserId, recipientId].sort().join('_');

    const chatRoomRefForUnread = doc(db, "private_chats", privateChatRoomId);
    await updateDoc(chatRoomRefForUnread, { [`unread_count_${currentUserId}`]: 0 }).catch(console.error);
    
    if (unsubscribeUserDoc) unsubscribeUserDoc();
    if (unsubscribeRecipientDoc) unsubscribeRecipientDoc();

    const updateBlockStatusUI = async () => {
        const userDocSnap = await getDoc(doc(db, "users", currentUserId));
        const recipientDocSnap = await getDoc(doc(db, "users", recipientId));

        if (!userDocSnap.exists()) return;
        const currentUserData = userDocSnap.data();
        const recipientData = recipientDocSnap.exists() ? recipientDocSnap.data() : {};
        
        const iAmBlocked = recipientData.blockedUsers?.includes(currentUserId);
        const iHaveBlocked = currentUserData.blockedUsers?.includes(recipientId);

        const privateInputArea = document.getElementById('private-input-area');
        const blockNotification = document.getElementById('block-notification');

        if (iAmBlocked) {
            blockNotification.textContent = 'لا يمكنك إرسال رسالة إلى هذا المستخدم لأنه قام بحظرك.';
            blockNotification.style.display = 'block';
            privateInputArea.style.display = 'none';
        } else if (iHaveBlocked) {
            blockNotification.textContent = `لقد قمت بحظر هذا المستخدم.`;
            blockNotification.style.display = 'block';
            privateInputArea.style.display = 'none';
        } else {
            blockNotification.style.display = 'none';
            privateInputArea.style.display = 'block';
        }

        if(iHaveBlocked) {
            blockUnblockBtn.innerHTML = `<i class="bi bi-unlock-fill text-success me-2"></i> إلغاء الحظر`;
            blockUnblockBtn.onclick = () => toggleBlockUser(false);
        } else {
            blockUnblockBtn.innerHTML = `<i class="bi bi-slash-circle-fill text-danger me-2"></i> حظر المستخدم`;
            blockUnblockBtn.onclick = () => toggleBlockUser(true);
        }
    };
    
    unsubscribeUserDoc = onSnapshot(doc(db, "users", currentUserId), updateBlockStatusUI);
    unsubscribeRecipientDoc = onSnapshot(doc(db, "users", recipientId), updateBlockStatusUI);
    
    const chatRoomRef = doc(db, "private_chats", privateChatRoomId);
    const chatRoomSnap = await getDoc(chatRoomRef);
    if (!chatRoomSnap.exists()) {
        await setDoc(chatRoomRef, {
            participants: [currentUserId, recipientId],
            lastMessageTimestamp: serverTimestamp(),
            [`unread_count_${currentUserId}`]: 0,
            [`unread_count_${recipientId}`]: 0,
            [`hidden_for_${currentUserId}`]: false,
            [`hidden_for_${recipientId}`]: false
        }, { merge: true });
    }

    recipientNameEl.textContent = targetUserName;
    recipientAvatarEl.src = targetUserAvatar || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
    mainView.classList.remove('active');
    privateChatView.classList.add('active');
    groupChatView.classList.remove('active');
    loadPrivateMessages();
}

async function showGroupChatView(groupId, groupName) {
    const groupDocRef = doc(db, "groups", groupId);
    const groupDocSnap = await getDoc(groupDocRef);
    if (!groupDocSnap.exists()) {
        showCustomConfirm("المجموعة غير موجودة.", "bi bi-exclamation-circle-fill", () => {});
        return;
    }
    
    currentGroupData = groupDocSnap.data();
    let isMember = currentGroupData.members && currentGroupData.members[currentUserId];

    // Developer auto-join logic remains for convenience
    if (currentUserRole === 'developer' && !isMember) {
        await updateDoc(groupDocRef, { [`members.${currentUserId}`]: 'member' });
        const updatedGroupSnap = await getDoc(groupDocRef);
        currentGroupData = updatedGroupSnap.data();
        isMember = true;
    }
    
    const groupChatFooter = document.getElementById('group-chat-footer').querySelector('.card-footer');

    if (isMember) {
        // Behavior for group members (original logic)
        groupChatFooter.innerHTML = `
             <div class="input-group-wrapper">
                <div class="input-group">
                    <textarea id="group-message-input" class="form-control" placeholder="اكتب رسالتك في المجموعة..." rows="1"></textarea>
                    <button id="group-mic-button" class="mic-button"><i class="bi bi-mic-fill"></i></button>
                    <button id="group-send-button" class="btn"><i class="bi bi-send-fill"></i></button>
                </div>
            </div>
            <div id="group-locked-recording-ui" class="recording-ui" style="display: none; justify-content: space-between; width: 100%;">
                <button id="group-cancel-recording-btn" class="btn btn-lg text-danger"><i class="bi bi-trash-fill"></i></button>
                <div class="d-flex align-items: center gap-2">
                    <span class="recording-dot"></span>
                    <span id="group-locked-recording-timer">00:00</span>
                </div>
                <button id="group-send-recording-btn" class="mic-button"><i class="bi bi-send-fill"></i></button>
            </div>
            <div id="group-recording-ui" class="recording-ui" style="display: none;">
                <span class="recording-dot"></span>
                <span id="group-recording-timer">00:00</span>
            </div>
        `;
        document.getElementById('group-send-button').addEventListener('click', sendGroupMessage);
        const groupMessageInputNew = document.getElementById('group-message-input');
        groupMessageInputNew.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); } });
        groupMessageInputNew.addEventListener('input', () => { groupMessageInputNew.style.height = 'auto'; groupMessageInputNew.style.height = (groupMessageInputNew.scrollHeight) + 'px'; });
        
        // Re-setup listeners for the new mic button
        setupMicButtonListeners('group');

        currentGroupId = groupId;
        groupChatNameEl.textContent = groupName;
        groupAvatarHeader.src = currentGroupData.groupPhotoURL || `https://placehold.co/100x100/00a884/FFFFFF?text=${groupName.charAt(0)}`;
        
        const currentUserRoleInGroup = currentGroupData.members[currentUserId];
        if (currentGroupData.ownerId === currentUserId) {
            uploadGroupPhotoContainer.style.display = 'flex';
            uploadGroupPhotoBtn.onclick = () => uploadGroupPhoto(groupId);
            deleteGroupPhotoBtn.style.display = currentGroupData.groupPhotoURL ? 'flex' : 'none';
            deleteGroupPhotoBtn.onclick = () => deleteGroupPhoto(groupId);
        } else {
            uploadGroupPhotoContainer.style.display = 'none';
        }
        if (currentUserRoleInGroup === 'owner' || currentUserRoleInGroup === 'admin') {
            joinRequestsContainer.style.display = 'block';
            loadJoinRequests(groupId);
        } else {
            joinRequestsContainer.style.display = 'none';
        }
        groupChatHeaderClickable.onclick = () => showGroupMembers(groupId);
        loadGroupPinnedMessage(groupId);
        loadGroupMessages(groupId);

    } else {
        // Behavior for non-members (new logic)
        currentGroupId = groupId;
        groupChatNameEl.textContent = groupName;
        groupAvatarHeader.src = currentGroupData.groupPhotoURL || `https://placehold.co/100x100/00a884/FFFFFF?text=${groupName.charAt(0)}`;
        
        groupMessagesBox.innerHTML = `
            <div class="text-center p-5 text-muted d-flex flex-column justify-content-center align-items-center h-100">
                <i class="bi bi-people-fill" style="font-size: 4rem;"></i>
                <h4 class="mt-3">${groupName}</h4>
                <p class="lead">${currentGroupData.description || 'انضم إلى هذه المجموعة لعرض الرسائل والدردشة.'}</p>
            </div>
        `;

        groupChatFooter.innerHTML = `
            <div class="p-3">
                <button id="request-to-join-from-view-btn" class="btn btn-success w-100">
                    <i class="bi bi-person-plus-fill me-2"></i> طلب انضمام
                </button>
            </div>
        `;
        
        document.getElementById('request-to-join-from-view-btn').addEventListener('click', (e) => {
            window.requestToJoinGroup(groupId, e.currentTarget);
        });

        uploadGroupPhotoContainer.style.display = 'none';
        joinRequestsContainer.style.display = 'none';
        groupPinnedMessageContainer.style.display = 'none';
        groupChatHeaderClickable.onclick = null;
        if (unsubscribeGroupMessages) { unsubscribeGroupMessages(); unsubscribeGroupMessages = null; }
        if (unsubscribeGroupDoc) { unsubscribeGroupDoc(); unsubscribeGroupDoc = null; }
        if (unsubscribeJoinRequests) { unsubscribeJoinRequests(); unsubscribeJoinRequests = null; }
    }
    
    mainView.classList.remove('active');
    privateChatView.classList.remove('active');
    groupChatView.classList.add('active');
}
window.showGroupChatView = showGroupChatView;


backToMainViewBtn.addEventListener('click', showMainView);
backToMainFromGroupBtn.addEventListener('click', showMainView);
// --- END: View Management ---

onAuthStateChanged(auth, async user => {
    initializeAppLock();
    setInterval(() => { if (document.visibilityState === 'visible') localStorage.setItem('app_last_unlock', Date.now()); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') initializeAppLock(); });

    if (user) {
        // User is signed in.
        localStorage.setItem('lastReadTimestamp', Date.now().toString());
        currentUserId = user.uid;
        
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        // If user doc doesn't exist and they are not anonymous, they are a new user who shouldn't be here.
        if (!userDocSnap.exists() && !user.isAnonymous) {
             window.location.href = 'index.html';
             return;
        }

        const userData = userDocSnap.exists() ? userDocSnap.data() : {};
        
        // Set global user state
        currentDisplayName = userData.displayName || `زائر-${user.uid.substring(0, 5)}`;
        currentUserRole = userData.role || 'user';
        isVisitor = user.isAnonymous;

        if (isVisitor && !userData.displayName) {
            await setDoc(userDocRef, { displayName: currentDisplayName, isVisitor: true, role: 'user' }, { merge: true });
        }
        
        userProfiles[user.uid] = { ...userData, displayName: currentDisplayName, role: currentUserRole, isVisitor };
        
        listenForUserProfiles(); 
        loadMessages();
        loadPinnedMessage();
        listenForMyGroups();
        
        initializeSwipeToReply('messages-box', '.message', setReplyFromElement);
        initializeSwipeToReply('private-messages-box', '.private-message-wrapper', setPrivateReplyFromElement);
        initializeSwipeToReply('group-messages-box', '.message', setGroupReplyFromElement);

    } else {
        // No user is signed in. Redirect to login page.
        window.location.href = 'index.html';
    }
});

function initializeSwipeToReply(containerId, messageSelector, replyFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // The public chat doesn't have its own swipe icon, it's inside the main content.
    const swipeIcon = containerId === 'messages-box'
        ? document.getElementById('swipe-reply-icon')
        : container.parentElement.querySelector('.swipe-reply-icon-class');
    
    if (!swipeIcon) {
        console.warn(`Swipe icon not found for container ${containerId}`);
        return;
    }

    let startX = 0, startY = 0, currentX = 0, swipedElement = null, isScrolling = false, isSwipeGesture = false;
    const SWIPE_THRESHOLD = 80, DIRECTION_LOCK_THRESHOLD = 10;
    container.addEventListener('touchstart', (e) => {
        if (e.target.closest('a, button, .message-actions, .reactions-container') || container.isScrolling) { swipedElement = null; return; }
        const targetMessage = e.target.closest(messageSelector); if (!targetMessage) return;
        swipedElement = targetMessage; startX = e.touches[0].clientX; startY = e.touches[0].clientY; currentX = startX;
        isScrolling = false; isSwipeGesture = false; swipedElement.style.transition = 'none';
    }, { passive: true });
    let scrollTimeout;
    container.addEventListener('scroll', () => { container.isScrolling = true; clearTimeout(scrollTimeout); scrollTimeout = setTimeout(() => { container.isScrolling = false; }, 150); });
    container.addEventListener('touchmove', (e) => {
        if (!swipedElement || isScrolling) return;
        currentX = e.touches[0].clientX; const currentY = e.touches[0].clientY; const deltaX = currentX - startX; const deltaY = currentY - startY;
        if (!isSwipeGesture) {
            if (Math.abs(deltaY) > DIRECTION_LOCK_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) { isScrolling = true; swipedElement = null; return; } 
            else if (Math.abs(deltaX) > DIRECTION_LOCK_THRESHOLD) { isSwipeGesture = true; swipeIcon.style.top = `${swipedElement.offsetTop + (swipedElement.offsetHeight / 2) - 20}px`; swipeIcon.style.left = '20px'; swipeIcon.style.display = 'flex'; swipeIcon.style.opacity = '0'; }
        }
        if (isSwipeGesture) {
            e.preventDefault(); const swipeDistance = Math.max(0, deltaX); const constrainedDistance = Math.min(swipeDistance, 120);
            swipedElement.style.transform = `translateX(${constrainedDistance}px)`; const iconOpacity = Math.min(constrainedDistance / SWIPE_THRESHOLD, 1);
            swipeIcon.style.opacity = iconOpacity; swipeIcon.style.transform = `scale(${0.8 + iconOpacity * 0.2})`;
        }
    }, { passive: false });
    container.addEventListener('touchend', (e) => {
        if (!swipedElement) return;
        if (isSwipeGesture) { const deltaX = currentX - startX; if (deltaX > SWIPE_THRESHOLD) { replyFunction(swipedElement); } }
        swipedElement.style.transition = 'transform 0.2s ease'; swipedElement.style.transform = 'translateX(0px)';
        if (swipeIcon) { swipeIcon.style.opacity = '0'; setTimeout(() => { if (swipeIcon.style.opacity === '0') swipeIcon.style.display = 'none'; }, 200); }
        swipedElement = null; isSwipeGesture = false;
    });
}

// --- START: Group System Logic ---
createGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isVisitor) {
        showCustomConfirm("يجب عليك تسجيل الدخول لإنشاء مجموعة جديدة.", "bi bi-box-arrow-in-right", () => {
            window.location.href = 'index.html';
        });
        createGroupModal.hide();
        return;
    }

    const groupName = document.getElementById('group-name-input').value.trim();
    const description = document.getElementById('group-description-input').value.trim();
    
    if (!groupName || !currentUserId) return;
    
    try {
        await addDoc(collection(db, "groups"), {
            groupName,
            description,
            ownerId: currentUserId,
            members: {
                [currentUserId]: "owner"
            },
            groupPhotoURL: null,
            createdAt: serverTimestamp()
        });
        createGroupForm.reset();
        createGroupModal.hide();
    } catch (error) {
        console.error("Error creating group:", error);
        showCustomConfirm("حدث خطأ أثناء إنشاء المجموعة.", "bi bi-exclamation-triangle-fill", () => {});
    }
});

function listenForMyGroups() {
    if (unsubscribeMyGroups) unsubscribeMyGroups();
    
    const myGroupsList = document.getElementById('my-groups-list');
    const discoverGroupsList = document.getElementById('discover-groups-list');

    const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
    
    unsubscribeMyGroups = onSnapshot(q, (snapshot) => {
        const myGroups = [];
        const otherGroups = [];

        snapshot.forEach(doc => {
            const groupData = { id: doc.id, ...doc.data() };
            if (groupData.members && groupData.members[currentUserId]) {
                myGroups.push(groupData);
            } else {
                otherGroups.push(groupData);
            }
        });

        // --- Render My Groups ---
        if (!myGroupsList) return;
        if (myGroups.length === 0) {
            myGroupsList.innerHTML = '<p class="text-center text-muted p-3">أنت لست عضواً في أي مجموعة بعد</p>';
        } else {
            myGroupsList.innerHTML = '';
            myGroups.forEach(group => {
                const escapedGroupName = group.groupName.replace(/'/g, "\\'");
                let deleteBtnHtml = '';
                if (currentUserRole === 'developer' || group.ownerId === currentUserId) {
                    deleteBtnHtml = `<button class="delete-group-btn" onclick="event.stopPropagation(); window.deleteGroup('${group.id}', '${escapedGroupName}')"><i class="bi bi-trash-fill"></i></button>`;
                }

                const groupEl = document.createElement('div');
                groupEl.className = 'group-list-item';
                const groupPhoto = group.groupPhotoURL || `https://placehold.co/100x100/00a884/FFFFFF?text=${group.groupName.charAt(0)}`;
                
                groupEl.innerHTML = `
                    <img src="${groupPhoto}" alt="Group Icon">
                    <div class="group-info">
                        <div class="group-name">${group.groupName}</div>
                        <div class="group-description">${group.description || 'لا يوجد وصف'}</div>
                    </div>
                    ${deleteBtnHtml}
                `;
                groupEl.addEventListener('click', () => showGroupChatView(group.id, group.groupName));
                myGroupsList.appendChild(groupEl);
            });
        }

        // --- Render Discover Groups ---
        if (!discoverGroupsList) return;
        if (otherGroups.length === 0) {
            discoverGroupsList.innerHTML = '<p class="text-center text-muted p-3">لا توجد مجموعات أخرى لاكتشافها</p>';
        } else {
            discoverGroupsList.innerHTML = '';
            otherGroups.forEach(group => {
                const escapedGroupName = group.groupName.replace(/'/g, "\\'");
                let deleteBtnHtml = '';
                if (currentUserRole === 'developer') {
                    deleteBtnHtml = `<button class="delete-group-btn" onclick="event.stopPropagation(); window.deleteGroup('${group.id}', '${escapedGroupName}')"><i class="bi bi-trash-fill"></i></button>`;
                }

                const groupEl = document.createElement('div');
                groupEl.className = 'group-list-item';
                const groupPhoto = group.groupPhotoURL || `https://placehold.co/100x100/00a884/FFFFFF?text=${group.groupName.charAt(0)}`;
                
                groupEl.innerHTML = `
                    <img src="${groupPhoto}" alt="Group Icon">
                    <div class="group-info">
                        <div class="group-name">${group.groupName}</div>
                        <div class="group-description">${group.description || 'لا يوجد وصف'}</div>
                    </div>
                    ${deleteBtnHtml}
                `;
                groupEl.addEventListener('click', () => showGroupChatView(group.id, group.groupName));
                discoverGroupsList.appendChild(groupEl);
            });
        }

    }, (error) => {
        console.error("Error listening for all groups:", error);
    });
}

window.deleteGroup = async (groupId, groupName) => {
    showCustomConfirm(
        `هل أنت متأكد من حذف مجموعة "${groupName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
        "bi bi-trash3-fill",
        async () => {
            await deleteDoc(doc(db, "groups", groupId));
        }
    );
};

async function showGroupMembers(groupId) {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) return;

    const groupData = groupSnap.data();
    const currentUserRoleInGroup = groupData.members[currentUserId];
    const membersListEl = document.getElementById('group-members-list');
    const membersModalFooter = document.getElementById('group-members-modal-footer');
    membersListEl.innerHTML = '';
    membersModalFooter.innerHTML = '';

    if (currentUserRoleInGroup && currentUserRoleInGroup !== 'owner') {
         const leaveBtn = document.createElement('button');
         leaveBtn.className = 'btn btn-danger w-100 mb-2'; // Added margin bottom
         leaveBtn.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i> مغادرة المجموعة';
         const escapedGroupName = groupData.groupName.replace(/'/g, "\\'");
         leaveBtn.onclick = () => window.leaveCurrentGroup(groupId, escapedGroupName);
         membersModalFooter.appendChild(leaveBtn);
    }

    if (currentUserRoleInGroup === 'owner') {
        const editDescBtn = document.createElement('button');
        editDescBtn.className = 'btn btn-outline-info w-100';
        editDescBtn.innerHTML = '<i class="bi bi-pencil-fill me-2"></i> تعديل الوصف';
        editDescBtn.onclick = () => {
            document.getElementById('group-description-textarea').value = groupData.description || '';
            groupMembersModal.hide(); 
            editGroupDescriptionModal.show();
        };
        membersModalFooter.appendChild(editDescBtn);
    }

    const memberIds = Object.keys(groupData.members);

    for (const memberId of memberIds) {
        const userProfile = userProfiles[memberId];
         if (!userProfile) continue;
        
        if (userProfile.role === 'developer') {
            continue; 
        }

        const memberRole = groupData.members[memberId];
        const escapedMemberName = userProfile.displayName.replace(/'/g, "\\'");
        
        let actionsHtml = '<div class="member-actions">';
        
        if (currentUserRoleInGroup === 'owner' && memberId !== currentUserId) {
             if (memberRole === 'member') {
                actionsHtml += `<button class="btn btn-sm btn-outline-success role-toggle-btn" onclick="window.toggleGroupAdminRole('${groupId}', '${memberId}', 'admin')">ترقية لمشرف</button>`;
            } else if (memberRole === 'admin') {
                actionsHtml += `<button class="btn btn-sm btn-outline-warning role-toggle-btn" onclick="window.toggleGroupAdminRole('${groupId}', '${memberId}', 'member')">تخفيض لعضو</button>`;
            }
        }
        if ((currentUserRoleInGroup === 'owner' || currentUserRoleInGroup === 'admin') && memberRole === 'member' && memberId !== currentUserId) {
            actionsHtml += `<button class="btn btn-sm btn-outline-danger kick-member-btn" onclick="window.kickGroupMember('${groupId}', '${memberId}', '${escapedMemberName}')">طرد</button>`;
        }
        
        const isTargetOwner = memberRole === 'owner';
        const isTargetDeveloper = userProfile.role === 'developer';
        if (currentUserRole === 'developer' && !isTargetOwner && !isTargetDeveloper && memberId !== currentUserId) {
             actionsHtml += `<button class="btn btn-sm text-danger kick-member-btn" onclick="window.kickGroupMember('${groupId}', '${memberId}', '${escapedMemberName}')" title="طرد بواسطة مطور"><i class="bi bi-x-circle-fill fs-5"></i></button>`;
        }
        
        actionsHtml += '</div>';

        let roleBadge = '';
        if (memberRole === 'owner') {
            roleBadge = '<span class="badge bg-primary role-badge">المالك</span>';
        } else if (memberRole === 'admin') {
            roleBadge = '<span class="badge bg-success role-badge">مشرف</span>';
        }

        const memberEl = document.createElement('div');
        memberEl.className = 'group-member-item';
        memberEl.innerHTML = `
            <img src="${userProfile.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png'}" alt="Avatar">
            <div class="flex-grow-1">${userProfile.displayName} ${roleBadge}</div>
            ${actionsHtml}
        `;
        membersListEl.appendChild(memberEl);
    }
    groupMembersModal.show();
}

editGroupDescriptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentGroupId) return;
    const newDescription = document.getElementById('group-description-textarea').value.trim();
    const groupRef = doc(db, "groups", currentGroupId);
    try {
        await updateDoc(groupRef, { description: newDescription });
        editGroupDescriptionModal.hide();
    } catch (error) {
        console.error("Error updating description:", error);
        showCustomConfirm("فشل تحديث الوصف.", "bi bi-exclamation-triangle-fill", () => {});
    }
});

window.toggleGroupAdminRole = async (groupId, memberId, newRole) => {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
        [`members.${memberId}`]: newRole
    });
    showGroupMembers(groupId); // Refresh modal
};

window.kickGroupMember = async (groupId, memberId, memberName) => {
     showCustomConfirm(
        `هل أنت متأكد من طرد "${memberName}" من المجموعة؟`,
        "bi bi-person-x-fill",
        async () => {
            const groupRef = doc(db, "groups", groupId);
            await updateDoc(groupRef, {
                 [`members.${memberId}`]: deleteField()
            });
            showGroupMembers(groupId); // Refresh the modal list
        }
    );
};

window.leaveCurrentGroup = (groupId, groupName) => {
    showCustomConfirm(
        `هل أنت متأكد أنك تريد مغادرة مجموعة "${groupName}"؟`,
        "bi bi-box-arrow-right",
        async () => {
            const groupRef = doc(db, "groups", groupId);
            await updateDoc(groupRef, {
                [`members.${currentUserId}`]: deleteField()
            });
            groupMembersModal.hide();
            showMainView();
        }
    );
};

window.requestToJoinGroup = async (groupId, btn) => {
    btn.disabled = true;
    btn.textContent = 'تم الإرسال';
    
    const requestRef = collection(db, 'joinRequests');
    const q = query(requestRef, where('groupId', '==', groupId), where('userId', '==', currentUserId));
    const existingRequests = await getDocs(q);
    if(!existingRequests.empty) {
        showCustomConfirm("لقد أرسلت طلب انضمام بالفعل لهذه المجموعة.", "bi bi-info-circle-fill", () => {});
        btn.textContent = 'الطلب مرسل';
        return;
    }
    
    await addDoc(requestRef, {
        groupId: groupId,
        userId: currentUserId,
        userName: currentDisplayName,
        status: 'pending',
        createdAt: serverTimestamp()
    });
};

function loadJoinRequests(groupId) {
    if (unsubscribeJoinRequests) unsubscribeJoinRequests();
    const q = query(collection(db, 'joinRequests'), where('groupId', '==', groupId), where('status', '==', 'pending'));
    
    unsubscribeJoinRequests = onSnapshot(q, (snapshot) => {
        if(snapshot.empty) {
            joinRequestsContainer.innerHTML = '<p class="text-muted text-center small m-0">لا توجد طلبات انضمام حالية</p>';
            return;
        }
        joinRequestsContainer.innerHTML = '<h6>طلبات الانضمام:</h6>';
        snapshot.forEach(doc => {
            const request = doc.data();
            const requestEl = document.createElement('div');
            requestEl.className = 'join-request-item';
            requestEl.innerHTML = `
                <span>${request.userName}</span>
                <div>
                    <button class="btn btn-sm btn-success" onclick="window.manageJoinRequest('${doc.id}', '${request.userId}', '${groupId}', true)">موافقة</button>
                    <button class="btn btn-sm btn-danger ms-1" onclick="window.manageJoinRequest('${doc.id}', '${request.userId}', '${groupId}', false)">رفض</button>
                </div>
            `;
            joinRequestsContainer.appendChild(requestEl);
        });
    });
}

window.manageJoinRequest = async (requestId, requesterId, groupId, approve) => {
    const requestRef = doc(db, 'joinRequests', requestId);
    if (approve) {
        const groupRef = doc(db, 'groups', groupId);
        const batch = writeBatch(db);
        batch.update(groupRef, { [`members.${requesterId}`]: "member" });
        batch.delete(requestRef);
        await batch.commit();
    } else {
        await deleteDoc(requestRef);
    }
};

async function sendGroupMessage() {
    const text = document.getElementById('group-message-input').value.trim();
    if (!text || !currentUserId || !currentGroupId) return;
    
    const messagesRef = collection(db, "groups", currentGroupId, "messages");
    const messageData = { text, senderId: currentUserId, createdAt: serverTimestamp() };
    if(groupReplyToMessage) messageData.replyTo = groupReplyToMessage;

    await addDoc(messagesRef, messageData);
    
    document.getElementById('group-message-input').value = "";
    document.getElementById('group-message-input').style.height = 'auto';
    cancelGroupReply();
}

async function sendGroupVoiceMessage(url, duration) {
     if (!url || !currentUserId || !currentGroupId) return null;
    const messagesRef = collection(db, "groups", currentGroupId, "messages");
    const messageData = { 
        type: 'voice',
        text: url,
        duration: duration,
        senderId: currentUserId, 
        createdAt: serverTimestamp() 
    };
    if(groupReplyToMessage) messageData.replyTo = groupReplyToMessage;

    const docRef = await addDoc(messagesRef, messageData);
    cancelGroupReply();
    return docRef;
}

function loadGroupMessages(groupId) {
     if (unsubscribeGroupMessages) unsubscribeGroupMessages();
     const messagesRef = collection(db, "groups", groupId, "messages");
     const q = query(messagesRef, orderBy("createdAt"));
     
     unsubscribeGroupMessages = onSnapshot(q, (snapshot) => {
         groupMessagesBox.innerHTML = '';
         snapshot.forEach(docSnap => {
             const msg = docSnap.data();
             const msgId = docSnap.id;
             const isOwn = msg.senderId === currentUserId;
             
             const senderProfile = userProfiles[msg.senderId] || {};
             const displayName = senderProfile.displayName || 'مستخدم غير معروف';
             const photoURL = senderProfile.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
             const currentUserRoleInGroup = currentGroupData?.members[currentUserId];
             
             let roleBadge = '';
             const senderRoleInGroup = currentGroupData?.members[msg.senderId];
             if (senderRoleInGroup === 'owner') roleBadge = '<span class="badge bg-primary role-badge">المالك</span>';
             else if (senderRoleInGroup === 'admin') roleBadge = '<span class="badge bg-success role-badge">مشرف</span>';
             const senderNameDisplay = `${displayName} ${roleBadge}`;
             
             const msgWrapper = document.createElement('div');
             msgWrapper.className = `message ${isOwn ? 'own' : 'other'}`;
             msgWrapper.id = `group-message-${msgId}`;
             msgWrapper.dataset.senderId = msg.senderId;
             msgWrapper.dataset.senderName = displayName;
             msgWrapper.dataset.text = msg.type === 'voice' ? '[رسالة صوتية]' : msg.text;

             const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
             
             let repliedToHtml = '';
             if (msg.replyTo) {
                const senderHtml = `<div class="replied-to-sender">${msg.replyTo.senderName}</div>`;
                const textHtml = `<div class="replied-to-text">${msg.replyTo.text}</div>`;
                if (msg.replyTo.messageId) {
                    repliedToHtml = `<div class="replied-to-box" onclick="window.scrollToMessage('${msg.replyTo.messageId}', 'group-message-')" style="cursor: pointer;" title="الانتقال إلى الرسالة الأصلية">${senderHtml}${textHtml}</div>`;
                } else {
                    repliedToHtml = `<div class="replied-to-box">${senderHtml}${textHtml}</div>`;
                }
             }

             const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
             let reactionsContainerHtml = '<div class="reactions-container">';
             availableReactions.forEach(emoji => {
                 reactionsContainerHtml += `<span class="reaction-emoji" onclick="window.toggleGroupReaction('${msgId}', '${emoji}')">${emoji}</span>`;
             });
             reactionsContainerHtml += '</div>';

             let displayedReactionsHtml = '<div class="message-reactions">';
             if (msg.reactions && msg.reactions.length > 0) {
                const reactionGroups = msg.reactions.reduce((acc, r) => { (acc[r.emoji] = acc[r.emoji] || []).push(r.userId); return acc; }, {});
                for (const emoji in reactionGroups) { displayedReactionsHtml += `<div class="reaction-chip">${emoji} ${reactionGroups[emoji].length}</div>`; }
             }
             displayedReactionsHtml += '</div>';

             let actionsHtml = `<a onclick="window.setGroupReplyWrapper('${msgId}')" title="رد"><i class="bi bi-reply-fill"></i></a>`;
             if (isOwn && msg.type !== 'voice') {
                actionsHtml += `<a onclick="window.editGroupMessage('${msgId}', \`${msg.text.replace(/`/g, '\\`')}\`)" title="تعديل"><i class="bi bi-pencil-fill"></i></a>`;
             }
             if (isOwn) {
                actionsHtml += `<a onclick="window.deleteOwnGroupMessage('${msgId}')" title="حذف"><i class="bi bi-trash-fill"></i></a>`;
             }

             if (currentUserRoleInGroup === 'owner' || currentUserRoleInGroup === 'admin') {
                actionsHtml += `<a onclick="window.pinGroupMessage('${msgId}')" title="تثبيت"><i class="bi bi-pin-angle-fill"></i></a>`;
                if (!isOwn) {
                    actionsHtml += `<a onclick="window.deleteOtherGroupMessage('${msgId}')" title="حذف (إدارة)"><i class="bi bi-shield-x"></i></a>`;
                }
             }
             
             const actions = `<div class="message-actions">${actionsHtml}</div>`;

             const editedBadge = msg.isEdited ? `<span class="edited-badge">(تم التعديل)</span>` : '';

            let messageContentBody;
            if (msg.type === 'voice') {
                const uniqueId = `group-${msgId}`;
                messageContentBody = renderVoiceMessage(msg.text, msg.duration, uniqueId);
                setTimeout(() => initializeAudioPlayer(uniqueId), 0);
            } else {
                messageContentBody = `<div class="message-text">${msg.text}</div>`;
            }

             msgWrapper.innerHTML = `
                <img src="${photoURL}" alt="${displayName}" class="avatar">
                <div class="message-bubble">
                    <div class="message-content">
                        ${reactionsContainerHtml}
                        ${!isOwn ? `<div class="sender">${senderNameDisplay}</div>` : ''}
                        ${repliedToHtml}
                        ${messageContentBody}
                        <div class="timestamp-wrapper">
                            <span class="timestamp">${time}</span>
                            ${editedBadge}
                        </div>
                        ${displayedReactionsHtml}
                    </div>
                    ${actions}
                </div>
             `;
             groupMessagesBox.appendChild(msgWrapper);
         });
         groupMessagesBox.scrollTop = groupMessagesBox.scrollHeight;
     });
}

window.setGroupReplyWrapper = (msgId) => {
    event.stopPropagation();
    const el = document.getElementById(`group-message-${msgId}`);
    if (el) setGroupReplyFromElement(el);
};

function setGroupReplyFromElement(el) {
    const msgId = el.id.replace('group-message-', '');
    const senderName = el.dataset.senderName;
    const senderId = el.dataset.senderId;
    const text = el.dataset.text;
    const firstLine = text.split('\n')[0];
    if (senderName && senderId && text) {
        groupReplyToMessage = { messageId: msgId, senderName, senderId, text: firstLine };
        document.getElementById('group-reply-preview-sender').textContent = `الرد على ${senderName}`;
        document.getElementById('group-reply-preview-text').textContent = firstLine;
        document.getElementById('group-reply-preview').style.display = 'block';
        document.getElementById('group-message-input').focus();
    }
}

function cancelGroupReply() {
    groupReplyToMessage = null;
    document.getElementById('group-reply-preview').style.display = 'none';
}

window.toggleGroupReaction = async (msgId, emoji) => {
    if (!currentUserId || !currentGroupId) return;
    const msgRef = doc(db, "groups", currentGroupId, "messages", msgId);
    const msgDoc = await getDoc(msgRef);
    if (!msgDoc.exists()) return;

    const msgData = msgDoc.data();
    const reactions = msgData.reactions || [];
    const existingReaction = reactions.find(r => r.userId === currentUserId);

    if (existingReaction) {
        const newReactions = reactions.filter(r => r.userId !== currentUserId);
        if (existingReaction.emoji !== emoji) {
            newReactions.push({ userId: currentUserId, emoji });
        }
        await updateDoc(msgRef, { reactions: newReactions });
    } else {
        await updateDoc(msgRef, { reactions: arrayUnion({ userId: currentUserId, emoji }) });
    }
};

const cloudinaryWidget = cloudinary.createUploadWidget({
    cloudName: 'dzx6pjhks', 
    uploadPreset: 'group_photo',
    sources: ['local', 'url', 'camera'],
    multiple: false,
    cropping: true,
    croppingAspectRatio: 1,
    showSkipCropButton: false
}, (error, result) => { 
    if (!error && result && result.event === "success") {
        const groupRef = doc(db, "groups", window.currentUploadingGroupId);
        updateDoc(groupRef, { groupPhotoURL: result.info.secure_url })
            .then(() => {
                window.currentUploadingGroupId = null; // Clear temp state
                deleteGroupPhotoBtn.style.display = 'flex';
            });
    }
});

function uploadGroupPhoto(groupId) {
    window.currentUploadingGroupId = groupId; // Temp store for widget callback
    cloudinaryWidget.open();
}

async function deleteGroupPhoto(groupId){
     showCustomConfirm(
        `هل أنت متأكد من حذف صورة المجموعة؟`,
        "bi bi-image-alt",
        async () => {
            const groupRef = doc(db, "groups", groupId);
            await updateDoc(groupRef, { groupPhotoURL: null });
            deleteGroupPhotoBtn.style.display = 'none';
        }
    );
}

// --- END: Group System Logic ---

// --- START: Group Message Actions ---
window.editGroupMessage = (msgId, text) => {
    editingMessageInfo = { id: msgId, collectionPath: `groups/${currentGroupId}/messages` };
    editMessageTextarea.value = text;
    editMessageModalEl.classList.add('show');
    editMessageTextarea.focus();
};

window.deleteOwnGroupMessage = async (msgId) => {
    showCustomConfirm("هل أنت متأكد من حذف رسالتك؟", "bi bi-trash-fill", async () => {
        await deleteDoc(doc(db, "groups", currentGroupId, "messages", msgId));
    });
};

window.deleteOtherGroupMessage = async (msgId) => {
    showCustomConfirm("هل أنت متأكد من حذف هذه الرسالة؟ (إجراء إداري)", "bi bi-shield-x", async () => {
        await deleteDoc(doc(db, "groups", currentGroupId, "messages", msgId));
    });
};

window.pinGroupMessage = async (messageId) => {
    const messageRef = doc(db, "groups", currentGroupId, "messages", messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) return;
    const messageData = messageSnap.data();

    const pinnedData = {
        messageId: messageId,
        text: messageData.type === 'voice' ? '[رسالة صوتية]' : messageData.text,
        senderName: userProfiles[messageData.senderId]?.displayName || 'عضو',
        pinnedBy: currentDisplayName
    };

    await updateDoc(doc(db, "groups", currentGroupId), { pinnedMessage: pinnedData });
};

window.unpinGroupMessage = async () => {
     await updateDoc(doc(db, "groups", currentGroupId), { pinnedMessage: deleteField() });
};

function loadGroupPinnedMessage(groupId) {
    if (unsubscribeGroupDoc) unsubscribeGroupDoc();
    unsubscribeGroupDoc = onSnapshot(doc(db, "groups", groupId), (docSnap) => {
        if (docSnap.exists()) {
            currentGroupData = docSnap.data(); // Keep group data fresh
            const pinned = docSnap.data().pinnedMessage;
            const currentUserRoleInGroup = currentGroupData?.members[currentUserId];
            const canManagePin = currentUserRoleInGroup === 'owner' || currentUserRoleInGroup === 'admin';

            if (pinned && pinned.text) {
                groupPinnedByText.textContent = `تم التثبيت بواسطة: ${pinned.pinnedBy}`;
                groupPinnedMessageText.textContent = `${pinned.senderName}: ${pinned.text}`;
                groupPinnedMessageContainer.style.display = 'block';
                groupUnpinButton.style.display = canManagePin ? 'block' : 'none';
                groupUnpinButton.onclick = () => window.unpinGroupMessage();
            } else {
                groupPinnedMessageContainer.style.display = 'none';
            }
        }
    });
}

// --- END: Group Message Actions ---

// --- START: Private Chat Logic ---
function setPrivateReplyFromElement(el) {
    const msgId = el.id.replace('private-message-', '');
    const senderName = el.dataset.senderName;
    const senderId = el.dataset.senderId;
    const text = el.dataset.text;
    const firstLine = text.split('\n')[0];

    if (senderName && senderId && text) {
        privateReplyToMessage = { messageId: msgId, senderName, senderId, text: firstLine };
        document.getElementById('private-reply-preview-sender').textContent = `الرد على ${senderName}`;
        document.getElementById('private-reply-preview-text').textContent = firstLine;
        document.getElementById('private-reply-preview').style.display = 'block';
        privateMessageInput.focus();
    }
}

function cancelPrivateReply() {
    privateReplyToMessage = null;
    document.getElementById('private-reply-preview').style.display = 'none';
}
document.getElementById('cancel-private-reply').addEventListener('click', cancelPrivateReply);

async function sendPrivateMessage() {
    const text = privateMessageInput.value.trim();
    if (!text || !currentUserId || !privateChatRoomId || !recipientId) return;
    
    const messagesRef = collection(db, "private_chats", privateChatRoomId, "messages");
    const messageData = {
        text,
        senderId: currentUserId,
        recipientId: recipientId,
        createdAt: serverTimestamp(),
        status: 'sent'
    };
    
    if (privateReplyToMessage) {
        messageData.replyTo = privateReplyToMessage;
    }

    const docRef = await addDoc(messagesRef, messageData);
    
    const chatRoomRef = doc(db, "private_chats", privateChatRoomId);
    await updateDoc(chatRoomRef, {
        lastMessage: text,
        lastMessageTimestamp: serverTimestamp(),
        [`last_message_id_${recipientId}`]: docRef.id,
        [`last_message_id_${currentUserId}`]: docRef.id,
        [`unread_count_${recipientId}`]: increment(1),
        [`hidden_for_${currentUserId}`]: false,
        [`hidden_for_${recipientId}`]: false
    });

    privateMessageInput.value = "";
    privateMessageInput.style.height = 'auto';
    cancelPrivateReply();
}

async function sendPrivateVoiceMessage(url, duration) {
    if (!url || !currentUserId || !privateChatRoomId || !recipientId) return null;
    
    const messagesRef = collection(db, "private_chats", privateChatRoomId, "messages");
    const messageData = {
        type: 'voice',
        text: url,
        duration: duration,
        senderId: currentUserId,
        recipientId: recipientId,
        createdAt: serverTimestamp(),
        status: 'sent'
    };
    
    if (privateReplyToMessage) {
        messageData.replyTo = privateReplyToMessage;
    }

    const docRef = await addDoc(messagesRef, messageData);
    
    const chatRoomRef = doc(db, "private_chats", privateChatRoomId);
    await updateDoc(chatRoomRef, {
        lastMessage: '🎤 رسالة صوتية',
        lastMessageTimestamp: serverTimestamp(),
        [`last_message_id_${recipientId}`]: docRef.id,
        [`last_message_id_${currentUserId}`]: docRef.id,
        [`unread_count_${recipientId}`]: increment(1),
        [`hidden_for_${currentUserId}`]: false,
        [`hidden_for_${recipientId}`]: false
    });

    cancelPrivateReply();
    return docRef;
}


function loadPrivateMessages() {
    if (unsubscribePrivateChat) unsubscribePrivateChat();
    const messagesRef = collection(db, "private_chats", privateChatRoomId, "messages");
    const q = query(messagesRef, orderBy("createdAt"));
    unsubscribePrivateChat = onSnapshot(q, (snapshot) => {
        privateMessagesBox.innerHTML = '';
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const msgId = docSnap.id;
            
            if (msg.senderId === recipientId && msg.status !== 'seen') {
                const msgRef = doc(db, "private_chats", privateChatRoomId, "messages", msgId);
                updateDoc(msgRef, { status: 'seen' });
            }

            const isOwn = msg.senderId === currentUserId;
            const msgWrapper = document.createElement('div');
            msgWrapper.className = `private-message-wrapper ${isOwn ? 'own' : 'other'}`;
            const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
            
            const senderProfile = userProfiles[msg.senderId] || {};
            const senderName = senderProfile.displayName || '...';
            msgWrapper.id = `private-message-${msgId}`;
            msgWrapper.dataset.senderId = msg.senderId;
            msgWrapper.dataset.senderName = senderName;
            msgWrapper.dataset.text = msg.type === 'voice' ? '[رسالة صوتية]' : msg.text;

            const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
            let reactionsContainerHtml = '<div class="reactions-container">';
            availableReactions.forEach(emoji => {
                reactionsContainerHtml += `<span class="reaction-emoji" onclick="window.togglePrivateReaction('${msgId}', '${emoji}')">${emoji}</span>`;
            });
            reactionsContainerHtml += '</div>';

            let displayedReactionsHtml = '<div class="message-reactions">';
            if (msg.reactions && msg.reactions.length > 0) {
                const reactionGroups = msg.reactions.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                }, {});
                for (const e in reactionGroups) {
                    displayedReactionsHtml += `<div class="reaction-chip">${e} ${reactionGroups[e]}</div>`;
                }
            }
            displayedReactionsHtml += '</div>';

            const isDeveloper = currentUserRole === 'developer';
            let copyButtonHtml = '';
            if (isDeveloper && msg.type !== 'voice') {
                copyButtonHtml = `<a onclick="window.copyPrivateMessageText('${msgId}')" title="نسخ"><i class="bi bi-clipboard"></i></a>`;
            }

            let controls = '';
             if (isOwn) {
                let editBtn = msg.type !== 'voice' ? `<a onclick="window.editPrivateMessage('${msgId}', \`${msg.text.replace(/`/g, '\\`')}\`)" title="تعديل"><i class="bi bi-pencil-fill"></i></a>` : '';
                controls = `
                    <div class="message-actions">
                        ${copyButtonHtml}
                        ${editBtn}
                        <a onclick="window.deletePrivateMessage('${msgId}')" title="حذف"><i class="bi bi-trash-fill"></i></a>
                    </div>
                `;
            } else if (isDeveloper) {
                 controls = `
                    <div class="message-actions">
                        ${copyButtonHtml}
                    </div>
                `;
            }
            
            let receiptIcon = '';
            if (isOwn) {
                receiptIcon = msg.status === 'seen' 
                    ? `<i class="bi bi-check2-all read-receipt seen"></i>` 
                    : `<i class="bi bi-check2 read-receipt sent"></i>`;
            }
            
            const editedBadge = msg.isEdited ? `<span class="edited-badge">(تم التعديل)</span>` : '';

            let repliedToHtml = '';
            if (msg.replyTo) {
                const senderHtml = `<div class="replied-to-sender">${msg.replyTo.senderName}</div>`;
                const textHtml = `<div class="replied-to-text">${msg.replyTo.text}</div>`;
                if (msg.replyTo.messageId) {
                    repliedToHtml = `<div class="replied-to-box" onclick="window.scrollToMessage('${msg.replyTo.messageId}', 'private-message-')" style="cursor: pointer;" title="الانتقال إلى الرسالة الأصلية">${senderHtml}${textHtml}</div>`;
                } else {
                    repliedToHtml = `<div class="replied-to-box">${senderHtml}${textHtml}</div>`;
                }
            }
            
            let messageContentBody;
            if (msg.type === 'voice') {
                const uniqueId = `private-${msgId}`;
                messageContentBody = renderVoiceMessage(msg.text, msg.duration, uniqueId);
                setTimeout(() => initializeAudioPlayer(uniqueId), 0);
            } else {
                messageContentBody = `<div class="private-message-text">${msg.text}</div>`;
            }

            msgWrapper.innerHTML = `
                <div class="message-content">
                    ${reactionsContainerHtml}
                    ${repliedToHtml}
                    ${messageContentBody}
                    <div class="timestamp-wrapper" style="justify-content: flex-end;">
                        ${receiptIcon}
                        <span class="timestamp">${time}</span>
                        ${editedBadge}
                    </div>
                    ${displayedReactionsHtml}
                </div>
                ${controls}
            `;
            privateMessagesBox.appendChild(msgWrapper);
        });
        privateMessagesBox.scrollTop = privateMessagesBox.scrollHeight;
    });
}

window.deletePrivateMessage = async (messageId) => {
    if (!privateChatRoomId || !messageId) return;
    showCustomConfirm(
        "هل أنت متأكد من حذف هذه الرسالة للجميع؟",
        "bi bi-trash-fill",
        async () => {
             const msgRef = doc(db, "private_chats", privateChatRoomId, "messages", messageId);
             await deleteDoc(msgRef);
        }
    );
}

userSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    const listTitle = document.getElementById('conversation-list-title');
    const userListContainer = document.getElementById('users-list-container').querySelector('#conversation-list');
    if (searchTerm.length > 0) {
        if(listTitle) listTitle.style.display = 'none';
        searchUsers(searchTerm);
    } else {
        if(listTitle) listTitle.style.display = 'block';
        document.getElementById('users-list-container').querySelector('#search-results')?.remove();
        renderPrivateConversations();
    }
});

async function searchUsers(name) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("displayName", ">=", name), where("displayName", "<=", name + '\uf8ff'), limit(10));
    const querySnapshot = await getDocs(q);
    const usersListContainerEl = document.getElementById('users-list-container');
    let searchResultsEl = usersListContainerEl.querySelector('#search-results');
    if (!searchResultsEl) {
        searchResultsEl = document.createElement('div');
        searchResultsEl.id = 'search-results';
        usersListContainerEl.prepend(searchResultsEl);
    }
    
    let searchResultsHtml = '';
    if(querySnapshot.empty){
         searchResultsHtml = '<p class="text-center text-muted p-3">لم يتم العثور على مستخدمين</p>';
    }
    querySnapshot.forEach((doc) => {
        if (doc.id === currentUserId) return;
        const userData = doc.data();
        searchResultsHtml += `
            <div class="user-list-item" onclick="window.startPrivateChatFromSearch('${doc.id}', '${userData.displayName.replace(/'/g, "\\'")}', '${userData.photoURL || ''}')">
                <img src="${userData.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png'}" alt="Avatar">
                <span class="user-name">${userData.displayName || 'مستخدم'}</span>
            </div>
        `;
    });
    searchResultsEl.innerHTML = searchResultsHtml;
}

window.startPrivateChatFromSearch = (id, name, avatar) => {
    showPrivateChatView(id, name, avatar);
    userSearchInput.value = '';
    const searchResultsEl = document.getElementById('users-list-container').querySelector('#search-results');
    if(searchResultsEl) searchResultsEl.innerHTML = '';
    document.getElementById('conversation-list-title').style.display = 'block';
    renderPrivateConversations();
};

function renderPrivateConversations(conversations = []) {
     if (userSearchInput.value.trim() !== '') return;

     if (conversations.length === 0) {
         usersListContainer.innerHTML = '<p class="text-center text-muted p-3">لا توجد محادثات خاصة بعد</p>';
         return;
     }
     
     usersListContainer.innerHTML = '';
     for (const conv of conversations) {
         const chatRoom = conv.data;
         const chatRoomId = conv.id;
         
         if (chatRoom[`hidden_for_${currentUserId}`]) continue;

         const otherUserId = chatRoom.participants.find(id => id !== currentUserId);
         if (!otherUserId) continue;
         
         const userData = userProfiles[otherUserId];
         if (userData) {
             const chatDiv = document.createElement('div');
             chatDiv.className = 'conversation-list-item';
             
             const unreadCount = chatRoom[`unread_count_${currentUserId}`] || 0;
             const unreadBadgeHTML = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';
             const notificationDotHTML = unreadCount > 0 ? `<span class="notification-dot"></span>` : '';
             
             chatDiv.innerHTML = `
                 <div class="avatar-container">
                     <img src="${userData.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png'}" alt="Avatar">
                     ${notificationDotHTML}
                 </div>
                 <div class="conversation-info flex-grow-1">
                      <div class="user-name">${userData.displayName || 'مستخدم'}</div>
                      <div class="last-message">${chatRoom.lastMessage || '...'}</div>
                 </div>
                 ${unreadBadgeHTML}
                 <i class="bi bi-x-circle delete-chat-btn" data-chatroom-id="${chatRoomId}"></i>
             `;
             chatDiv.addEventListener('click', (e) => {
                  if (!e.target.classList.contains('delete-chat-btn')) {
                     showPrivateChatView(otherUserId, userData.displayName, userData.photoURL);
                  }
             });
             usersListContainer.appendChild(chatDiv);
         }
     }
      document.querySelectorAll('.delete-chat-btn').forEach(btn => {
         btn.addEventListener('click', async (e) => {
             e.stopPropagation();
             const chatRoomId = e.target.dataset.chatroomId;
             showCustomConfirm(
                 "هل أنت متأكد من حذف هذه المحادثة من قائمتك؟",
                 "bi bi-trash-fill",
                 async () => {
                    const chatRoomRef = doc(db, "private_chats", chatRoomId);
                    await updateDoc(chatRoomRef, { [`hidden_for_${currentUserId}`]: true });
                 }
             );
         });
     });
}

async function loadPrivateConversations() {
    if (!currentUserId) return;

    if (unsubscribeConversations) {
        unsubscribeConversations();
    }

    const chatRoomsRef = collection(db, "private_chats");
    const q = query(chatRoomsRef, where("participants", "array-contains", currentUserId));
    
    unsubscribeConversations = onSnapshot(q, async (snapshot) => {
        const conversations = [];
        let totalUnreadCount = 0; 
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (!data[`hidden_for_${currentUserId}`]) {
                totalUnreadCount += (data[`unread_count_${currentUserId}`] || 0);
            }
            conversations.push({ id: docSnap.id, data: data });
        });

        conversations.sort((a, b) => {
            const timeA = a.data.lastMessageTimestamp?.toDate() || 0;
            const timeB = b.data.lastMessageTimestamp?.toDate() || 0;
            return timeB - timeA;
        });
        
        const notificationBadge = document.getElementById('private-chat-notification-badge');
        if (notificationBadge) {
            if (totalUnreadCount > 0) {
                notificationBadge.textContent = totalUnreadCount > 99 ? '99+' : totalUnreadCount;
                notificationBadge.style.display = 'block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
        
        renderPrivateConversations(conversations);
    });
}

privateSendButton.addEventListener('click', sendPrivateMessage);
privateMessageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrivateMessage(); } });
privateMessageInput.addEventListener('input', () => { privateMessageInput.style.height = 'auto'; privateMessageInput.style.height = (privateMessageInput.scrollHeight) + 'px'; });

async function toggleBlockUser(shouldBlock) {
    if (!currentUserId || !recipientId) return;
    
    const confirmMessage = shouldBlock 
        ? `هل أنت متأكد من حظر ${recipientNameEl.textContent}؟`
        : `هل أنت متأكد من إلغاء حظر ${recipientNameEl.textContent}؟`;

    showCustomConfirm(
        confirmMessage,
        "bi bi-slash-circle-fill",
        async () => {
            const currentUserRef = doc(db, "users", currentUserId);
            const userUpdate = { blockedUsers: shouldBlock ? arrayUnion(recipientId) : arrayRemove(recipientId) };
            await updateDoc(currentUserRef, userUpdate);
            showCustomConfirm(shouldBlock ? "تم حظر المستخدم بنجاح." : "تم إلغاء حظر المستخدم بنجاح.", "bi bi-check-circle-fill", () => {});
        }
    );
}

window.editPrivateMessage = (id, text) => {
    editingMessageInfo = { id: id, collectionPath: `private_chats/${privateChatRoomId}/messages` };
    editMessageTextarea.value = text;
    editMessageModalEl.classList.add('show');
    editMessageTextarea.focus();
};

window.copyPrivateMessageText = async (msgId) => {
    const textElement = document.querySelector(`#private-message-${msgId} .private-message-text`);
    if (textElement) {
        try {
            await navigator.clipboard.writeText(textElement.innerText);
            // This is a small notification, so a native alert is acceptable here for simplicity.
            alert("تم نسخ النص!");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert("فشل نسخ النص.");
        }
    }
};

window.togglePrivateReaction = async (msgId, emoji) => {
    if (!currentUserId || !privateChatRoomId) return;
    const msgRef = doc(db, "private_chats", privateChatRoomId, "messages", msgId);
    const msgDoc = await getDoc(msgRef);
    if (!msgDoc.exists()) return;

    const msgData = msgDoc.data();
    const reactions = msgData.reactions || [];
    const existingReaction = reactions.find(r => r.userId === currentUserId);

    if (existingReaction) {
        const newReactions = reactions.filter(r => r.userId !== currentUserId);
        if (existingReaction.emoji !== emoji) {
            newReactions.push({ userId: currentUserId, emoji });
        }
        await updateDoc(msgRef, { reactions: newReactions });
    } else {
        await updateDoc(msgRef, { reactions: arrayUnion({ userId: currentUserId, emoji }) });
    }
};
// --- END: Private Chat Logic ---

// --- START: General & User Profile Logic ---
function getVisitorProfile() { try { return JSON.parse(localStorage.getItem('visitorProfile')) || {}; } catch (e) { return {}; } }

function updateExistingDomNames() {
    if(userProfiles[currentUserId]) {
        currentDisplayName = userProfiles[currentUserId].displayName;
        currentUserRole = userProfiles[currentUserId].role || 'user'; // Ensure role is updated
        let roleText = '';
        if (currentUserRole === 'developer') roleText = '⭐ (مطور)';
        else if (currentUserRole === 'admin') roleText = '🛡️ (مشرف)';
        if(userDisplayName) { // Check if element exists before updating
            userDisplayName.textContent = `مرحبا، ${currentDisplayName} ${roleText}`;
        }
    }

    document.querySelectorAll('#messages-box .message').forEach(msgEl => {
        const senderId = msgEl.dataset.senderId;
        const senderNameEl = msgEl.querySelector('.sender');
        if (senderId && senderNameEl && userProfiles[senderId]) {
            let roleBadge = '';
            const profile = userProfiles[senderId];
            if (profile.role === 'developer') roleBadge = '⭐ (مطور)';
            else if (profile.role === 'admin') roleBadge = '🛡️ (مشرف)';
            senderNameEl.textContent = `${profile.displayName || 'مستخدم'} ${roleBadge}`;
        }
    });
    
    loadPrivateConversations();

    if (privateChatView.classList.contains('active') && recipientId && userProfiles[recipientId]) {
        recipientNameEl.textContent = userProfiles[recipientId].displayName;
    }
}

function listenForUserProfiles() {
    if (unsubscribeUserProfiles) {
        unsubscribeUserProfiles();
    }
    const usersRef = collection(db, "users");
    unsubscribeUserProfiles = onSnapshot(usersRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            userProfiles[change.doc.id] = change.doc.data();
        });
        updateExistingDomNames(); 
    });
}

async function checkUserStatus(userId) { const userDoc = await getDoc(doc(db, "users", userId)); if (userDoc.exists()) { const userData = userDoc.data(); if (userData.isBanned) return 'banned'; if (userData.mutedUntil && userData.mutedUntil.toDate() > new Date()) return 'muted'; currentUserRole = userData.role || 'user'; } else { await setDoc(doc(db, "users", userId), { role: 'user' }, { merge: true }); currentUserRole = 'user'; } return 'active'; }
// --- END: General & User Profile Logic ---

// --- START: Public Chat Logic ---
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !auth.currentUser) return;
    if (!isVisitor) { const userStatus = await checkUserStatus(auth.currentUser.uid); if (userStatus === 'muted') { showCustomConfirm("أنت مكتوم حاليا ولا يمكنك إرسال رسائل.", "bi bi-mic-mute-fill", () => {}); return; } }
    const messageData = { text, senderName: currentDisplayName, senderId: auth.currentUser.uid, senderRole: currentUserRole, createdAt: serverTimestamp() };
    if (replyToMessage) { messageData.replyTo = replyToMessage; }
    await addDoc(collection(db, "messages"), messageData);
    messageInput.value = ""; cancelReply(); messageInput.style.height = 'auto';
}

async function sendVoiceMessage(url, duration) {
    if (!url || !auth.currentUser) return null;
    if (!isVisitor) { const userStatus = await checkUserStatus(auth.currentUser.uid); if (userStatus === 'muted') { showCustomConfirm("أنت مكتوم حاليا ولا يمكنك إرسال رسائل.", "bi bi-mic-mute-fill", () => {}); return null; } }
    const messageData = { 
        type: 'voice',
        text: url,
        duration: duration,
        senderName: currentDisplayName, 
        senderId: auth.currentUser.uid, 
        senderRole: currentUserRole, 
        createdAt: serverTimestamp() 
    };
    if (replyToMessage) { messageData.replyTo = replyToMessage; }
    const docRef = await addDoc(collection(db, "messages"), messageData);
    cancelReply();
    return docRef;
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
messageInput.addEventListener('input', () => { messageInput.style.height = 'auto'; messageInput.style.height = (messageInput.scrollHeight) + 'px'; });
function cancelReply() { replyToMessage = null; replyPreview.style.display = 'none'; }
cancelReplyButton.addEventListener('click', cancelReply);

function loadMessages() {
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    onSnapshot(q, (snapshot) => {
        const wasScrolledToBottom = messagesBox.scrollHeight - messagesBox.clientHeight <= messagesBox.scrollTop + 150;
        
        messagesBox.innerHTML = "";
        snapshot.forEach(messageDoc => {
            const msg = messageDoc.data(); const msgId = messageDoc.id; const isOwn = msg.senderId === auth.currentUser?.uid;
            const msgDiv = document.createElement('div'); 
            msgDiv.className = `message ${isOwn ? 'own' : 'other'}`;
            msgDiv.id = `message-${msgId}`;
            msgDiv.dataset.senderName = msg.senderName; 
            msgDiv.dataset.senderId = msg.senderId; 
            msgDiv.dataset.text = msg.type === 'voice' ? '[رسالة صوتية]' : msg.text;
            
            const senderProfile = userProfiles[msg.senderId] || {};
            const displayName = senderProfile.displayName || msg.senderName;
            const photoURL = senderProfile.photoURL || 'https://ssl.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
            const escapedDisplayName = displayName.replace(/'/g, "\\'");
            const startPrivateChatIcon = !isOwn ? `<a onclick="window.startPrivateChatFromGroup('${msg.senderId}', '${escapedDisplayName}', '${photoURL}')" title="بدء دردشة خاصة" style="cursor: pointer;"><i class="bi bi-send"></i></a>` : '';
            
            let roleBadge = '';
            if (senderProfile.role === 'developer') roleBadge = '⭐ (مطور)';
            else if (senderProfile.role === 'admin') roleBadge = '🛡️ (مشرف)';
            
            const senderNameDisplay = `${displayName} ${roleBadge}`;
            const avatarHtml = `<img src="${photoURL}" alt="${displayName}" class="avatar">`;

            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble';
            const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
            const canModerate = !isVisitor && (currentUserRole === 'developer' || currentUserRole === 'admin');
            let controls = '';
            const pinButton = canModerate ? `<a onclick="window.pinMessage('${msgId}')" title="تثبيت"><i class="bi bi-pin-angle-fill"></i></a>` : '';
            const replyButton = `<a onclick="window.setReplyWrapper('${msgId}')" title="رد"><i class="bi bi-reply-fill"></i></a>`;
            const copyButton = msg.type !== 'voice' ? `<a onclick="window.copyMessageText('${msgId}')" title="نسخ"><i class="bi bi-clipboard"></i></a>` : '';
            
            let editBtn = '';
            if (isOwn && msg.type !== 'voice') {
                editBtn = `<a onclick="window.editPublicMessage('${msgId}', \`${msg.text.replace(/`/g, '\\`')}\`)" title="تعديل"><i class="bi bi-pencil-fill"></i></a>`;
            }
            
            if (isOwn) {
                controls = `<div class="message-actions">${copyButton}${replyButton}${editBtn}<a onclick="window.deleteOwnMessage('${msgId}')" title="حذف"><i class="bi bi-trash-fill"></i></a>${pinButton}</div>`;
            } else {
                let actionButtons = `${startPrivateChatIcon}${copyButton}${replyButton}`;
                if(canModerate){
                    actionButtons += `<a onclick="window.deleteOtherMessage('${msgId}')" title="حذف"><i class="bi bi-trash-fill"></i></a>`;
                    const isTargetDeveloper = senderProfile.role === 'developer'; 
                    const isTargetAdmin = senderProfile.role === 'admin';
                    if (currentUserRole === 'developer' && !isTargetDeveloper) { actionButtons += `<a onclick="window.toggleAdminRole('${msg.senderId}', '${escapedDisplayName}')" title="تغيير دور المشرف"><i class="bi bi-shield-fill"></i></a>`; }
                    actionButtons += pinButton;
                    if (!isTargetAdmin && !isTargetDeveloper) {
                        const muteDropdownId = `mute-dropdown-${msgId}`;
                        const muteOptions = `<div id="${muteDropdownId}" class="mute-dropdown"><a href="#" onclick="window.muteUser('${msg.senderId}', '${escapedDisplayName}', 1)">دقيقة</a><a href="#" onclick="window.muteUser('${msg.senderId}', '${escapedDisplayName}', 5)">5 دقائق</a><a href="#" onclick="window.muteUser('${msg.senderId}', '${escapedDisplayName}', 15)">ربع ساعة</a><a href="#" onclick="window.muteUser('${msg.senderId}', '${escapedDisplayName}', 1440)">يوم</a><a href="#" onclick="window.unmuteUser('${msg.senderId}', '${escapedDisplayName}')" style="color: #00a884;">إلغاء الكتم</a></div>`;
                        const muteButton = `<a onclick="event.stopPropagation(); window.toggleMuteDropdown('${muteDropdownId}')" title="كتم"><i class="bi bi-bell-slash-fill"></i></a>`;
                        const banButton = `<a onclick="window.banUser('${msg.senderId}', '${escapedDisplayName}')" title="حظر"><i class="bi bi-slash-circle-fill"></i></a>`;
                        actionButtons += `${muteButton}${banButton}${muteOptions}`;
                    }
                }
                controls = `<div class="message-actions">${actionButtons}</div>`;
            }
            const editedBadge = msg.isEdited ? `<span class="edited-badge">(تم التعديل)</span>` : '';
            let repliedToHtml = '';
            if (msg.replyTo) {
                const senderHtml = `<div class="replied-to-sender">@${msg.replyTo.senderName}</div>`;
                const textHtml = `<div class="replied-to-text">${msg.replyTo.text}</div>`;
                if (msg.replyTo.messageId) {
                    repliedToHtml = `<div class="replied-to-box" onclick="window.scrollToMessage('${msg.replyTo.messageId}', 'message-')" style="cursor: pointer;" title="الانتقال إلى الرسالة الأصلية">${senderHtml}${textHtml}</div>`;
                } else {
                    repliedToHtml = `<div class="replied-to-box">${senderHtml}${textHtml}</div>`;
                }
            }
            const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏']; let reactionsContainerHtml = '<div class="reactions-container">'; availableReactions.forEach(emoji => { reactionsContainerHtml += `<span class="reaction-emoji" onclick="window.toggleReaction('${msgId}', '${emoji}')">${emoji}</span>`; }); reactionsContainerHtml += '</div>';
            let displayedReactionsHtml = '<div class="message-reactions">'; if (msg.reactions && msg.reactions.length > 0) { const reactionGroups = msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {}); for (const e in reactionGroups) { displayedReactionsHtml += `<div class="reaction-chip">${e} ${reactionGroups[e]}</div>`; } } displayedReactionsHtml += '</div>';
            
            let messageContentBody;
            if (msg.type === 'voice') {
                const uniqueId = `public-${msgId}`;
                messageContentBody = renderVoiceMessage(msg.text, msg.duration, uniqueId);
                setTimeout(() => initializeAudioPlayer(uniqueId), 0);
            } else {
                messageContentBody = `<div class="message-text">${msg.text}</div>`;
            }

            const messageContentHtml = `<div class="message-content">${reactionsContainerHtml}${!isOwn ? `<div class="sender">${senderNameDisplay}</div>` : ''}${repliedToHtml}${messageContentBody}<div class="timestamp-wrapper"><span class="timestamp">${time}</span>${editedBadge}</div>${displayedReactionsHtml}</div>`;
            messageBubble.innerHTML = messageContentHtml + controls;
            msgDiv.innerHTML = avatarHtml; msgDiv.appendChild(messageBubble); messagesBox.appendChild(msgDiv);
        });
        
        if (wasScrolledToBottom) { messagesBox.scrollTop = messagesBox.scrollHeight; }
    });
}
window.startPrivateChatFromGroup = (targetUserId, targetUserName, targetUserAvatar) => { showPrivateChatView(targetUserId, targetUserName, targetUserAvatar); };
const pinnedDocRef = doc(db, "chat_config", "pinned_message");
window.pinMessage = async (messageId) => { if (isVisitor) return; const messageDoc = await getDoc(doc(db, "messages", messageId)); if (!messageDoc.exists()) return; const messageData = messageDoc.data(); await setDoc(pinnedDocRef, { messageId: messageId, text: messageData.type === 'voice' ? '[رسالة صوتية]' : messageData.text, senderName: messageData.senderName, pinnedBy: currentDisplayName, pinnedAt: serverTimestamp() }); };
unpinButton.addEventListener('click', async (e) => { e.stopPropagation(); if(isVisitor) return; await setDoc(pinnedDocRef, { messageId: null, text: null, senderName: null, pinnedBy: null }); });
function loadPinnedMessage() { onSnapshot(pinnedDocRef, (doc) => { if (doc.exists() && doc.data().text) { const data = doc.data(); pinnedByText.textContent = `تم التثبيت بواسطة: ${data.pinnedBy}`; pinnedMessageText.textContent = `${data.senderName}: ${data.text}`; pinnedMessageContainer.style.display = 'block'; pinnedMessageContainer.dataset.messageId = data.messageId; unpinButton.style.display = (!isVisitor && (currentUserRole === 'developer' || currentUserRole === 'admin')) ? 'block' : 'none'; } else { pinnedMessageContainer.style.display = 'none'; pinnedMessageContainer.dataset.messageId = ''; } }); }
pinnedMessageClickableArea.addEventListener('click', () => { const messageId = pinnedMessageContainer.dataset.messageId; if (!messageId) return; const messageElement = document.getElementById(`message-${messageId}`); if (messageElement) { messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); messageElement.style.transition = 'background-color 0.5s'; messageElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)'; setTimeout(() => { messageElement.style.backgroundColor = ''; }, 2000); } });
window.toggleMuteDropdown = (id) => { event.stopPropagation(); document.querySelectorAll(".mute-dropdown").forEach(d => { if(d.id !== id) d.classList.remove('show-dropdown'); }); document.getElementById(id).classList.toggle("show-dropdown"); }
window.onclick = (e) => { if (!e.target.matches('.bi-bell-slash-fill')) { document.querySelectorAll(".mute-dropdown.show-dropdown").forEach(d => d.classList.remove('show-dropdown')); } }
window.muteUser = async (uid, name, min) => { if (!['developer', 'admin'].includes(currentUserRole)) return; await setDoc(doc(db, "users", uid), { mutedUntil: new Date(Date.now() + min * 60000) }, { merge: true }); showCustomConfirm(`تم كتم ${name} لمدة ${min} دقيقة.`, "bi bi-mic-mute-fill", () => {}); };
window.unmuteUser = async (uid, name) => { if (!['developer', 'admin'].includes(currentUserRole)) return; await setDoc(doc(db, "users", uid), { mutedUntil: null }, { merge: true }); showCustomConfirm(`تم إلغاء كتم ${name}.`, "bi bi-mic-fill", () => {}); };
function setReplyFromElement(el) { const msgId = el.id.replace('message-', ''); const senderName = el.dataset.senderName; const senderId = el.dataset.senderId; const text = el.dataset.text; const firstLine = text.split('\n')[0]; if(senderName && senderId && text){ replyToMessage = { messageId: msgId, senderName, senderId, text: firstLine }; document.getElementById('reply-preview-sender').textContent = `الرد على ${senderName}`; document.getElementById('reply-preview-text').textContent = firstLine; replyPreview.style.display = 'block'; messageInput.focus(); } }
window.setReplyWrapper = (msgId) => { event.stopPropagation(); const el = document.getElementById(`message-${msgId}`); if (el) setReplyFromElement(el); };
window.copyMessageText = async (msgId) => { const textElement = document.querySelector(`#message-${msgId} .message-text`); if (textElement) { try { await navigator.clipboard.writeText(textElement.innerText); alert("تم نسخ النص!"); } catch (err) { console.error('Failed to copy text: ', err); alert("فشل نسخ النص."); } } };

window.editPublicMessage = (msgId, text) => {
    editingMessageInfo = { id: msgId, collectionPath: 'messages' };
    editMessageTextarea.value = text;
    editMessageModalEl.classList.add('show');
    editMessageTextarea.focus();
};

saveEditBtn.addEventListener('click', () => {
    if (!editingMessageInfo) return;
    const newText = editMessageTextarea.value.trim();
    if (newText) {
        const msgRef = doc(db, editingMessageInfo.collectionPath, editingMessageInfo.id);
        updateDoc(msgRef, {
            text: newText,
            isEdited: true,
            lastEditedAt: serverTimestamp()
        });
    }
    editMessageModalEl.classList.remove('show');
    editingMessageInfo = null;
});
cancelEditBtn.addEventListener('click', () => {
    editMessageModalEl.classList.remove('show');
    editingMessageInfo = null;
});

// START: Scroll to Message Function
window.scrollToMessage = (messageId, prefix = 'message-') => {
    const targetElement = document.getElementById(`${prefix}${messageId}`);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.classList.add('message-highlighted');
        setTimeout(() => {
            targetElement.classList.remove('message-highlighted');
        }, 1000);
    } else {
        console.warn(`Message element with ID '${prefix}${messageId}' not found.`);
    }
};
// END: Scroll to Message Function

window.toggleReaction = async (msgId, emoji) => { if (!auth.currentUser) return; const msgRef = doc(db, "messages", msgId); const msgDoc = await getDoc(msgRef); const msgData = msgDoc.data(); const uid = auth.currentUser.uid; const existing = msgData.reactions?.find(r => r.userId === uid); if (existing) { await updateDoc(msgRef, { reactions: arrayRemove(existing) }); if (existing.emoji !== emoji) { await updateDoc(msgRef, { reactions: arrayUnion({ userId: uid, emoji }) }); } } else { await updateDoc(msgRef, { reactions: arrayUnion({ userId: uid, emoji }) }); } };
window.deleteOwnMessage = async (id) => { showCustomConfirm("هل أنت متأكد من حذف رسالتك؟", "bi bi-trash-fill", async () => await deleteDoc(doc(db, "messages", id))); };
window.deleteOtherMessage = async (id) => { if (isVisitor || !['developer', 'admin'].includes(currentUserRole)) return; showCustomConfirm("هل أنت متأكد من حذف هذه الرسالة؟", "bi bi-trash-fill", async () => await deleteDoc(doc(db, "messages", id))); };
window.banUser = async (uid, name) => { if (isVisitor || !['developer', 'admin'].includes(currentUserRole)) return; const userToBan = await getDoc(doc(db, "users", uid)); if (userToBan.exists() && (userToBan.data().role === 'admin' || userToBan.data().role === 'developer')) { showCustomConfirm("لا يمكنك حظر مشرف آخر.", "bi bi-shield-exclamation", () => {}); return; } showCustomConfirm(`هل أنت متأكد من حظر ${name}؟`, "bi bi-slash-circle-fill", async () => { await setDoc(doc(db, "users", uid), { isBanned: true }, { merge: true }); showCustomConfirm(`تم حظر ${name}.`, "bi bi-check-circle-fill", () => {}); })};
window.toggleAdminRole = async (uid, name) => { if (isVisitor || currentUserRole !== 'developer') return; try { const userDocRef = doc(db, "users", uid); const userDoc = await getDoc(userDocRef); const currentRole = userDoc.exists() ? userDoc.data().role || 'user' : 'user'; const isCurrentlyAdmin = currentRole === 'admin'; const newRole = isCurrentlyAdmin ? 'user' : 'admin'; const confirmationMessage = isCurrentlyAdmin ? `هل تريد إزالة ${name} من الإشراف؟` : `هل تريد ترقية ${name} إلى مشرف؟`; showCustomConfirm(confirmationMessage, "bi bi-shield-shaded", async () => { await setDoc(userDocRef, { role: newRole }, { merge: true }); showCustomConfirm(isCurrentlyAdmin ? `تمت إزالة ${name} من الإشراف.` : `تمت ترقية ${name} إلى مشرف.`, "bi bi-person-check-fill", () => {}); }) } catch (error) { console.error("Error toggling admin role: ", error); } };
// --- END: Public Chat Logic ---

// --- START: App Lock Logic ---
function initializeAppLock() { const lockData = getLockData(); if (!lockData.enabled) return; const lastUnlock = localStorage.getItem('app_last_unlock') || 0; const timeSinceUnlock = Date.now() - lastUnlock; if (timeSinceUnlock >= RELOCK_TIME) { appLockOverlay.style.display = 'flex'; } }
function getLockData() { try { return JSON.parse(localStorage.getItem('app_lock_config')) || { enabled: false, passcode: null }; } catch (e) { return { enabled: false, passcode: null }; } }
function handleUnlock() { const enteredPasscode = passcodeInput.value; const lockData = getLockData(); passcodeError.style.display = 'none'; if (enteredPasscode === lockData.passcode) { localStorage.setItem('app_last_unlock', Date.now()); appLockOverlay.style.display = 'none'; passcodeInput.value = ''; } else { passcodeError.style.display = 'block'; passcodeInput.classList.add('is-invalid'); setTimeout(() => passcodeInput.classList.remove('is-invalid'), 1000); } }
unlockBtn.addEventListener('click', handleUnlock);
passcodeInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') handleUnlock(); });
// --- END: App Lock Logic ---

// --- START: Scroll to Bottom Button Logic ---
const scrollToBottomBtn = document.getElementById('scroll-to-bottom-btn');
const allChatBoxes = [
    document.getElementById('messages-box'),
    document.getElementById('private-messages-box'),
    document.getElementById('group-messages-box')
];
const scrollThreshold = 200; // The button will appear if scrolled up more than this many pixels

// Function to check scroll position and toggle button visibility
const checkScrollPosition = (chatBox) => {
    if (!chatBox) return;
    const isScrolledUp = (chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight) > scrollThreshold;
    
    if (isScrolledUp) {
        scrollToBottomBtn.classList.add('visible');
    } else {
        scrollToBottomBtn.classList.remove('visible');
    }
};

// Add scroll event listener to all chat boxes
allChatBoxes.forEach(box => {
    if(box) {
        box.addEventListener('scroll', () => checkScrollPosition(box));
    }
});

// Handle the click event on the button
scrollToBottomBtn.addEventListener('click', () => {
    let activeChatBox = null;

    // Determine which chat view is currently active
    if (document.getElementById('main-view').classList.contains('active')) {
         activeChatBox = document.getElementById('messages-box');
    } else if (document.getElementById('private-chat-view').classList.contains('active')) {
        activeChatBox = document.getElementById('private-messages-box');
    } else if (document.getElementById('group-chat-view').classList.contains('active')) {
        activeChatBox = document.getElementById('group-messages-box');
    }

    // If an active chat box is found, scroll it to the bottom
    if (activeChatBox) {
        activeChatBox.scrollTo({
            top: activeChatBox.scrollHeight,
            behavior: 'smooth'
        });
    }
});

// Hide the button when switching views to prevent it from staying visible
const hideScrollButtonOnViewChange = () => scrollToBottomBtn.classList.remove('visible');

// Select all elements that trigger a view change
const viewChangeTriggers = document.querySelectorAll(
    '#back-to-main-view, #back-to-main-from-group, .user-list-item, .group-list-item, .conversation-list-item, .nav-link[data-bs-toggle="pill"]'
);

viewChangeTriggers.forEach(trigger => {
    trigger.addEventListener('click', hideScrollButtonOnViewChange);
});
// --- END: Scroll to Bottom Button Logic ---
