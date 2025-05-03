(function () {
    // Checking if zxcvbn is available
    function checkZxcvbnLoaded() {
        return typeof window.zxcvbn === 'function';
    }

    // Initialize our password detection
    function initExtension() {
        // If zxcvbn isn't loaded yet, try again after a short delay
        if (!checkZxcvbnLoaded()) {
            console.log('zxcvbn not loaded yet, retrying...');
            setTimeout(initExtension, 100);
            return;
        }

        console.log('zxcvbn loaded successfully');
        initPasswordDetection();
    }

    document.addEventListener('DOMContentLoaded', function () {
        initExtension();
    });

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initExtension();
    }

    function initPasswordDetection() {
        chrome.storage.sync.get({
            attackScenario: 'offline_slow',
            showSuggestions: true,
            showProgressBar: true
        }, function (options) {
            const passwordInputs = document.querySelectorAll('input[type="password"]');

            passwordInputs.forEach(input => {
                addPasswordListener(input, options);
            });

            observeDOM(options);
        });
    }

    function formatCrackTime(result, attackScenario) {
        let crackTime;

        switch (attackScenario) {
            case 'online':
                crackTime = result.crack_times_display.online_throttling_100_per_hour;
                return `Time to hack: ${crackTime}`;
            case 'offline_fast':
                crackTime = result.crack_times_display.offline_fast_hashing_1e10_per_second;
                return `Time to hack: ${crackTime}`;
            case 'offline_slow':
            default:
                crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second;
                return `Time to hack: ${crackTime}`;
        }
    }

    function getSuggestions(result) {
        if (!result.feedback || !result.feedback.suggestions || result.feedback.suggestions.length === 0) {
            return null;
        }

        const suggestions = result.feedback.suggestions;
        const warning = result.feedback.warning;

        const suggestionsList = document.createElement('ul');
        suggestionsList.className = 'password-suggestions';

        // Add warning if available
        if (warning) {
            const warningItem = document.createElement('li');
            warningItem.textContent = warning;
            warningItem.style.setProperty('--i', 0);
            suggestionsList.appendChild(warningItem);
        }

        // Add suggestions with animation indices
        suggestions.forEach((suggestion, index) => {
            const suggestionItem = document.createElement('li');
            suggestionItem.textContent = suggestion;
            suggestionItem.style.setProperty('--i', index + 1);
            suggestionsList.appendChild(suggestionItem);
        });

        return suggestionsList;
    }

    function createProgressBar(score) {
        const progressBar = document.createElement('div');
        progressBar.className = 'password-progress-bar';

        const progressBarFill = document.createElement('div');
        progressBarFill.className = `password-progress-bar-fill score-${score}`;

        progressBar.appendChild(progressBarFill);

        return progressBar;
    }

    function addPasswordListener(input, options) {
        let wrapper = document.createElement('div');
        wrapper.className = 'pw-strength-wrapper';

        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        let container = document.createElement('div');
        container.className = 'password-hack-time-container';
        container.style.display = 'none';

        // Creating hack time element
        let hackTimeElement = document.createElement('div');
        hackTimeElement.className = 'password-hack-time';
        container.appendChild(hackTimeElement);

        // Add the container to our wrapper
        wrapper.appendChild(container);

        input.addEventListener('input', function () {
            if (this.value.length === 0) {
                container.style.display = 'none';
                return;
            }

            // Calculate password strength using zxcvbn
            const result = window.zxcvbn(this.value);

            // Display the hack time
            container.style.display = 'block';
            hackTimeElement.textContent = formatCrackTime(result, options.attackScenario);

            // Override score for very fast to crack passwords
            let displayScore = result.score;
            const crackTimeSeconds = result.crack_times_seconds.offline_slow_hashing_1e4_per_second;
            if (crackTimeSeconds < 1) {
                displayScore = 0; // Force "very weak" for <1 second
            }

            // Update the class based on the adjusted strength score
            hackTimeElement.className = `password-hack-time score-${displayScore}`;

            // Remove any existing suggestions and progress bar
            const existingSuggestions = container.querySelector('.password-suggestions');
            if (existingSuggestions) {
                container.removeChild(existingSuggestions);
            }

            const existingProgressBar = container.querySelector('.password-progress-bar');
            if (existingProgressBar) {
                container.removeChild(existingProgressBar);
            }

            // Add suggestions if enabled and available
            if (options.showSuggestions) {
                const suggestions = getSuggestions(result);
                if (suggestions) {
                    // Use the adjusted score for styling
                    suggestions.className = `password-suggestions score-${displayScore}`;
                    container.appendChild(suggestions);
                }
            }

            if (options.showProgressBar) {
                const progressBar = createProgressBar(displayScore);
                container.appendChild(progressBar);
            }
        });
    }

    // Observe DOM for dynamically added password fields
    function observeDOM(options) {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        // Check if the added node is an element
                        if (node.nodeType === 1) {
                            // Check if the node itself is a password input
                            if (node.tagName === 'INPUT' && node.type === 'password') {
                                addPasswordListener(node, options);
                            }

                            // Check if the node contains password inputs
                            const passwordInputs = node.querySelectorAll('input[type="password"]');
                            passwordInputs.forEach(input => {
                                addPasswordListener(input, options);
                            });
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();