document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.sync.get({
        attackScenario: 'offline_slow',
        showSuggestions: true,
        showProgressBar: true
    }, function (items) {
        document.getElementById('attackScenario').value = items.attackScenario;
        document.getElementById('showSuggestions').checked = items.showSuggestions;
        document.getElementById('showProgressBar').checked = items.showProgressBar;
    });

    // Save options when the save button is clicked
    document.getElementById('save').addEventListener('click', function () {
        const saveButton = document.getElementById('save');
        const originalText = saveButton.textContent;

        // Adding loading animation
        saveButton.textContent = 'Saving...';
        saveButton.style.opacity = '0.8';
        saveButton.disabled = true;

        const attackScenario = document.getElementById('attackScenario').value;
        const showSuggestions = document.getElementById('showSuggestions').checked;
        const showProgressBar = document.getElementById('showProgressBar').checked;

        chrome.storage.sync.set({
            attackScenario: attackScenario,
            showSuggestions: showSuggestions,
            showProgressBar: showProgressBar
        }, function () {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                saveButton.textContent = 'Error!';
                saveButton.style.opacity = '1';
                saveButton.disabled = false;
                return;
            }

            // Reset button
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.style.opacity = '1';
                saveButton.disabled = false;

                const status = document.getElementById('status');
                status.classList.add('visible');

                setTimeout(() => {
                    status.classList.remove('visible');
                }, 2000);
            }, 600);
        });
    });
});