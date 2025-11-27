/**
 * StudioGrade Audio Converter
 * Main Application Logic
 * 
 * Handles UI interactions and file management
 */

// Initialize converter
const converter = new AudioConverter();

// State management
let selectedFiles = [];
let isConverting = false;

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const actionButtons = document.getElementById('actionButtons');
const themeToggle = document.getElementById('themeToggle');
const selectFilesBtn = document.getElementById('selectFilesBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const startConversionBtn = document.getElementById('startConversionBtn');

// ================================================
// THEME MANAGEMENT
// ================================================

/**
 * Toggle dark/light theme
 */
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

/**
 * Load saved theme preference
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
        themeToggle.setAttribute('aria-label', 'Switch to light mode');
    }
}

// ================================================
// DRAG & DROP HANDLERS
// ================================================

/**
 * Handle drag over event
 */
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
});

/**
 * Handle drag leave event
 */
dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
});

/**
 * Handle drop event
 */
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleFiles(files);
});

/**
 * Handle click on drop zone
 */
dropZone.addEventListener('click', (e) => {
    if (e.target !== selectFilesBtn && !selectFilesBtn.contains(e.target)) {
        fileInput.click();
    }
});

/**
 * Handle file input change
 */
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    // Reset input untuk allow re-selecting same files
    fileInput.value = '';
});

/**
 * Handle select files button click
 */
selectFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

// ================================================
// FILE MANAGEMENT
// ================================================

/**
 * Handle file selection
 * @param {FileList} files - Selected files
 */
function handleFiles(files) {
    if (isConverting) {
        showNotification('⏳ Tunggu hingga konversi selesai', 'warning');
        return;
    }

    const filesArray = Array.from(files);
    const validFiles = [];
    const invalidFiles = [];

    filesArray.forEach(file => {
        // Validate file type
        if (!converter.isValidAudioFile(file)) {
            invalidFiles.push({
                name: file.name,
                reason: 'Format tidak didukung'
            });
            return;
        }

        // Validate file size
        const sizeValidation = converter.validateFileSize(file);
        if (!sizeValidation.valid) {
            invalidFiles.push({
                name: file.name,
                reason: sizeValidation.message
            });
            return;
        }

        // Check for duplicates
        const isDuplicate = selectedFiles.some(f => 
            f.name === file.name && f.size === file.size
        );

        if (isDuplicate) {
            invalidFiles.push({
                name: file.name,
                reason: 'File sudah ada dalam daftar'
            });
            return;
        }

        validFiles.push(file);
    });

    // Add valid files
    if (validFiles.length > 0) {
        selectedFiles = [...selectedFiles, ...validFiles];
        renderFileList();
        actionButtons.classList.add('active');
        showNotification(`✅ ${validFiles.length} file ditambahkan`, 'success');
    }

    // Show errors for invalid files
    if (invalidFiles.length > 0) {
        const errorMessage = invalidFiles
            .map(f => `• ${f.name}: ${f.reason}`)
            .join('\n');
        showNotification(`❌ ${invalidFiles.length} file ditolak:\n${errorMessage}`, 'error');
    }

    // Show message if no files selected
    if (validFiles.length === 0 && invalidFiles.length === 0) {
        showNotification('⚠️ Tidak ada file yang dipilih', 'warning');
    }
}

/**
 * Render file list in UI
 */
function renderFileList() {
    if (selectedFiles.length === 0) {
        fileList.classList.remove('active');
        actionButtons.classList.remove('active');
        return;
    }

    fileList.classList.add('active');
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const fileItem = createFileItem(file, index);
        fileList.appendChild(fileItem);
    });
}

/**
 * Create file item element
 * @param {File} file - The file
 * @param {number} index - File index
 * @returns {HTMLElement}
 */
function createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.index = index;

    const extension = converter.getFileExtension(file.name).toUpperCase();
    const formattedSize = converter.formatFileSize(file.size);

    fileItem.innerHTML = `
        <div class="file-icon">🎵</div>
        <div class="file-info">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-size">${formattedSize} • ${extension}</div>
            <div class="progress-bar" id="progress-${index}">
                <div class="progress-fill"></div>
            </div>
        </div>
        <div class="file-status ready">Ready</div>
        <button class="remove-btn" onclick="removeFile(${index})" aria-label="Remove file">✕</button>
    `;

    return fileItem;
}

/**
 * Remove file from list
 * @param {number} index - File index to remove
 */
function removeFile(index) {
    if (isConverting) {
        showNotification('⏳ Tidak dapat menghapus saat konversi berlangsung', 'warning');
        return;
    }

    selectedFiles.splice(index, 1);
    renderFileList();

    if (selectedFiles.length === 0) {
        fileList.classList.remove('active');
        actionButtons.classList.remove('active');
    }

    showNotification('🗑️ File dihapus', 'info');
}

/**
 * Clear all files
 */
function clearAll() {
    if (isConverting) {
        showNotification('⏳ Tidak dapat menghapus saat konversi berlangsung', 'warning');
        return;
    }

    if (selectedFiles.length === 0) return;

    if (confirm(`🗑️ Hapus ${selectedFiles.length} file dari daftar?`)) {
        selectedFiles = [];
        fileList.classList.remove('active');
        actionButtons.classList.remove('active');
        showNotification('✅ Semua file dihapus', 'success');
    }
}

// ================================================
// CONVERSION PROCESS
// ================================================

/**
 * Start conversion process
 */
async function startConversion() {
    if (selectedFiles.length === 0) {
        showNotification('⚠️ Pilih file terlebih dahulu', 'warning');
        return;
    }

    if (isConverting) {
        showNotification('⏳ Konversi sedang berlangsung', 'warning');
        return;
    }

    isConverting = true;
    startConversionBtn.disabled = true;
    clearAllBtn.disabled = true;
    startConversionBtn.innerHTML = '<span>⏳</span> Converting...';

    try {
        // Get all remove buttons and disable them
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => btn.disabled = true);

        // Process files in batches
        const batchSize = 10;
        let completedCount = 0;

        for (let i = 0; i < selectedFiles.length; i += batchSize) {
            const batch = selectedFiles.slice(i, Math.min(i + batchSize, selectedFiles.length));
            
            await Promise.all(
                batch.map((file, batchIndex) => 
                    convertSingleFile(file, i + batchIndex)
                )
            );

            completedCount += batch.length;
            updateConversionProgress(completedCount, selectedFiles.length);
        }

        // All conversions completed
        startConversionBtn.innerHTML = '<span>✅</span> All Completed!';
        showCompletionDialog();

    } catch (error) {
        console.error('Conversion error:', error);
        showNotification('❌ Terjadi kesalahan saat konversi', 'error');
        startConversionBtn.innerHTML = '<span>⚡</span> Start All Conversion';
    } finally {
        isConverting = false;
        startConversionBtn.disabled = false;
        clearAllBtn.disabled = false;
        
        // Re-enable remove buttons
        const removeButtons = document.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => btn.disabled = false);
    }
}

/**
 * Convert single file
 * @param {File} file - File to convert
 * @param {number} index - File index
 */
async function convertSingleFile(file, index) {
    const fileItem = document.querySelector(`.file-item[data-index="${index}"]`);
    if (!fileItem) return;

    const statusEl = fileItem.querySelector('.file-status');
    const progressBar = fileItem.querySelector('.progress-bar');
    const progressFill = progressBar.querySelector('.progress-fill');

    // Update status to converting
    statusEl.textContent = 'Converting...';
    statusEl.className = 'file-status converting';
    progressBar.classList.add('active');

    try {
        // Start conversion
        await converter.convertToFLAC(file, (progress) => {
            progressFill.style.width = `${progress}%`;
        });

        // Conversion completed
        progressFill.style.width = '100%';
        statusEl.textContent = 'Completed ✓';
        statusEl.className = 'file-status completed';

    } catch (error) {
        console.error(`Error converting ${file.name}:`, error);
        statusEl.textContent = 'Failed ✗';
        statusEl.className = 'file-status ready';
        statusEl.style.background = 'rgba(255, 59, 48, 0.1)';
        statusEl.style.color = 'var(--error-color)';
        progressBar.classList.remove('active');
    }
}

/**
 * Update overall conversion progress
 * @param {number} completed - Number of completed files
 * @param {number} total - Total number of files
 */
function updateConversionProgress(completed, total) {
    const percentage = Math.round((completed / total) * 100);
    startConversionBtn.innerHTML = `<span>⏳</span> Converting... ${percentage}%`;
}

/**
 * Show completion dialog
 */
function showCompletionDialog() {
    const qualityInfo = converter.getQualityInfo();
    const message = `
✨ Konversi Selesai!

📊 Kualitas Output:
• Format: ${qualityInfo.format}
• Sample Rate: ${qualityInfo.sampleRate}
• Channels: ${qualityInfo.channels}
• Bit Depth: ${qualityInfo.bitDepth}
• Quality: ${qualityInfo.quality}

⚠️ CATATAN PENTING:
Ini adalah demo UI untuk menunjukkan konsep dan antarmuka.

Untuk konversi audio yang sebenarnya, diperlukan:
1. Backend server (Node.js/Python/PHP)
2. FFmpeg untuk audio processing
3. API endpoints untuk upload & conversion
4. Storage untuk temporary files

File yang dikonversi akan otomatis diunduh dalam format FLAC 96kHz/7.1 Surround.

🔒 Privasi: Semua file akan dihapus otomatis dalam 1 jam.
    `.trim();

    alert(message);

    setTimeout(() => {
        startConversionBtn.innerHTML = '<span>⚡</span> Start All Conversion';
    }, 2000);
}

// ================================================
// NOTIFICATIONS
// ================================================

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
    // For now, use console and alert for important messages
    console.log(`[${type.toUpperCase()}]`, message);
    
    // You can implement a custom notification system here
    // For demo purposes, we'll use alert for errors
    if (type === 'error') {
        alert(message);
    }
}

// ================================================
// EVENT LISTENERS
// ================================================

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Clear all button
clearAllBtn.addEventListener('click', clearAll);

// Start conversion button
startConversionBtn.addEventListener('click', startConversion);

// Prevent default drag behavior on document
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Handle paste event for files
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    const files = [];
    
    for (let item of items) {
        if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) files.push(file);
        }
    }
    
    if (files.length > 0) {
        handleFiles(files);
    }
});

// ================================================
// INITIALIZATION
// ================================================

/**
 * Initialize application
 */
function init() {
    loadTheme();
    console.log('🎧 StudioGrade Audio Converter initialized');
    console.log('📝 Supported formats:', converter.supportedFormats);
    console.log('⚙️ Quality settings:', converter.getQualityInfo());
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make functions available globally for onclick handlers
window.removeFile = removeFile;
window.clearAll = clearAll;
window.startConversion = startConversion;
window.toggleTheme = toggleTheme;
