document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const tableBody = document.getElementById('tableBody');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.querySelector('.input-group-text'); // Search button
    const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
    const successToast = new bootstrap.Toast(document.getElementById('successToast'));
    const tagsModal = new bootstrap.Modal(document.getElementById('tagsModal'));
    const tagsContainer = document.getElementById('tagsContainer');
    const languageButton = document.getElementById('languageButton');
    const channelCountButton = document.getElementById('channelCountButton');
    const channelCountText = document.getElementById('channelCountText');
    const languageModal = new bootstrap.Modal(document.getElementById('languageModal'));
    const languageOptions = document.querySelectorAll('.language-option');
    const supportModal = new bootstrap.Modal(document.getElementById('supportModal'));
    const contributeBtn = document.getElementById('contributeBtn');
    
    // Change text direction in search box based on input language
    searchInput.addEventListener('input', function() {
        const text = this.value.trim();
        const inputGroup = this.closest('.input-group');
        
        if (text === '') {
            this.setAttribute('dir', 'ltr'); // Default is LTR
            inputGroup.classList.remove('input-group-rtl');
            return;
        }
        
        // Detect Persian/Arabic text
        if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
            this.setAttribute('dir', 'rtl'); // RTL for Persian/Arabic
            inputGroup.classList.add('input-group-rtl');
        } else {
            this.setAttribute('dir', 'ltr'); // LTR for other languages
            inputGroup.classList.remove('input-group-rtl');
        }
    });
    
    // State variables
    let channelsData = [];
    let originalChannelsData = [];
    let searchTimeout = null;
    let currentLanguage = 'fa'; // Default language is Persian
    
    // Translations for UI elements
    const translations = {
        fa: {
            dir: 'rtl',
            languageButton: 'Language',
            channelCount: 'تعداد: {count} کانال',
            languageModalTitle: 'Select Language',
            closeButton: 'بستن',
            pageTitle: 'کانال‌های تلگرام مرتبط با امنیت سایبری',
            searchPlaceholder: 'مثال: iranian, osint',
            noResults: 'هیچ نتیجه‌ای برای "{searchTerm}" یافت نشد.',
            noChannels: 'هیچ کانالی یافت نشد.',
            loadError: 'خطا در بارگذاری داده‌ها. لطفاً صفحه را مجدداً بارگذاری کنید.',
            loading: 'در حال بارگذاری',
            errorTitle: 'خطا',
            successTitle: 'موفق',
            githubButton: 'مشاهده در گیت‌هاب',
            supportButton: 'حمایت',
            scamminderTooltip: 'تشخیص اعتبار وب‌سایت‌ها با هوش مصنوعی',
            tableHeaders: {
                name: 'نام کانال',
                link: 'لینک',
                status: 'وضعیت',
                tags: 'تگ‌ها',
                description: 'توضیحات'
            },
            statusLabels: {
                active: 'فعال',
                inactive: 'غیرفعال',
                unknown: 'نامشخص'
            },
            // Support modal translations
            supportModalTitle: 'راه‌های حمایت',
            supportOptions: {
                contribute: 'مشارکت در به‌روزرسانی',
                star: 'ستاره در گیت‌هاب',
                feedback: 'ارسال بازخورد',
                // donate: 'حمایت مالی',
                sponsor: 'حمایت رسمی'
            },
            // Sponsorship modal translations
            sponsorshipModalTitle: 'حمایت رسمی',
            sponsorshipInfo: 'اگه کانال تلگرام دارید، می‌تونید با اسپانسر شدن، نام کانال خودتون رو در ردیف اول جدول و همچنین نام برندتون رو به عنوان حامی رسمی، در وبسایت در معرض نمایش قرار بدید.',
            contactMe: 'ارتباط با من'
        },
        en: {
            dir: 'ltr',
            languageButton: 'Language',
            channelCount: 'Count: {count} channels',
            languageModalTitle: 'Select Language',
            closeButton: 'Close',
            pageTitle: 'Telegram Cybersecurity Channels',
            searchPlaceholder: 'Blue, Red, OSINT, CTI, ...',
            noResults: 'No results found for "{searchTerm}".',
            noChannels: 'No channels found.',
            loadError: 'Error loading data. Please reload the page.',
            loading: 'Loading',
            errorTitle: 'Error',
            successTitle: 'Success',
            githubButton: 'View on GitHub',
            supportButton: 'Support',
            scamminderTooltip: 'AI-Powered Scam Detector',
            tableHeaders: {
                name: 'Channel Name',
                link: 'Link',
                status: 'Status',
                tags: 'Tags',
                description: 'Description'
            },
            statusLabels: {
                active: 'Active',
                inactive: 'Inactive',
                unknown: 'Unknown'
            },
            // Support modal translations
            supportModalTitle: 'Support Options',
            supportOptions: {
                contribute: 'Contribute to Updates',
                star: 'Star on GitHub',
                feedback: 'Send Feedback',
                // donate: 'Donate',
                sponsor: 'Become a Sponsor'
            },
            // Sponsorship modal translations
            sponsorshipModalTitle: 'Sponsorship Information',
            sponsorshipInfo: 'If you have a Telegram channel related to cybersecurity, you can become a sponsor to have your channel displayed at the top of the table and your brand name shown as a sponsor in the website footer.',
            contactMe: 'Contact Me'
        },
        ru: {
            dir: 'ltr',
            languageButton: 'Язык',
            channelCount: 'Каналы: {count} каналов',
            languageModalTitle: 'Выбрать язык',
            closeButton: 'Закрыть',
            pageTitle: 'Репозиторий каналов Telegram по кибербезопасности',
            searchPlaceholder: 'Blue, Red, OSINT, CTI, ...',
            noResults: 'Результатов для "{searchTerm}" не найдено.',
            noChannels: 'Каналы не найдены.',
            loadError: 'Ошибка загрузки данных. Пожалуйста, перезагрузите страницу.',
            loading: 'Загрузка',
            errorTitle: 'Ошибка',
            successTitle: 'Успех',
            githubButton: 'Смотреть на GitHub',
            supportButton: 'Поддержка',
            scamminderTooltip: 'ИИ-детектор мошенничества',
            tableHeaders: {
                name: 'Название канала',
                link: 'Ссылка',
                status: 'Статус',
                tags: 'Теги',
                description: 'Описание'
            },
            statusLabels: {
                active: 'Активен',
                inactive: 'Неактивен',
                unknown: 'Неизвестно'
            },
            // Support modal translations
            supportModalTitle: 'Варианты поддержки',
            supportOptions: {
                contribute: 'Участвовать в обновлениях',
                star: 'Поставить звезду на GitHub',
                feedback: 'Отправить отзыв',
                // donate: 'Пожертвовать',
                sponsor: 'Стать спонсором'
            },
            // Sponsorship modal translations
            sponsorshipModalTitle: 'Информация о спонсорстве',
            sponsorshipInfo: 'Если у вас есть Telegram канал, связанный с кибербезопасностью, вы можете стать спонсором, чтобы ваш канал отображался в верхней части таблицы, а название вашего бренда было показано как спонсор в нижней части сайта.',
            contactMe: 'Связаться со мной'
        },
        zh: {
            dir: 'ltr',
            languageButton: '语言',
            channelCount: '频道: {count} 个',
            languageModalTitle: '选择语言',
            closeButton: '关闭',
            pageTitle: 'Telegram网络安全频道库',
            searchPlaceholder: 'Blue, Red, OSINT, CTI, ...',
            noResults: '未找到"{searchTerm}"的结果。',
            noChannels: '未找到频道。',
            loadError: '加载数据错误。请重新加载页面。',
            loading: '加载中',
            errorTitle: '错误',
            successTitle: '成功',
            githubButton: '在GitHub上查看',
            supportButton: '支持',
            scamminderTooltip: '人工智能驱动的诈骗检测器',
            tableHeaders: {
                name: '频道名称',
                link: '链接',
                status: '状态',
                tags: '标签',
                description: '描述'
            },
            statusLabels: {
                active: '活跃',
                inactive: '不活跃',
                unknown: '未知'
            },
            // Support modal translations
            supportModalTitle: '支持选项',
            supportOptions: {
                contribute: '参与更新',
                star: '在 GitHub 上加星标',
                feedback: '发送反馈',
                // donate: '捐赠',
                sponsor: '成为赞助商'
            },
            // Sponsorship modal translations
            sponsorshipModalTitle: '赞助信息',
            sponsorshipInfo: '如果您有与网络安全相关的Telegram频道，您可以成为赞助商，让您的频道显示在表格顶部，并在网站页脚显示您的品牌名称作为赞助商。',
            contactMe: '联系我'
        }
    };
    
    // Initialize language
    initLanguage();
    
    // Initialize tooltips
    initTooltips();
    
    // Function to set loading state
    function setLoading() {
        const t = translations[currentLanguage];
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    ${t.loading}
                </td>
            </tr>
        `;
    }
    
    // Show loading state
    setLoading();
    
    // Load channels data from JSON file
    loadChannelsData();
    
    // Set up auto-refresh (every 30 seconds)
    // let autoRefreshInterval = setInterval(loadChannelsData, 30000);
    
    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filterChannels(searchTerm);
            searchInput.blur();
            document.activeElement.blur();
            event.preventDefault();
        }
    });
    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filterChannels(searchTerm);
        searchInput.blur();
        document.activeElement.blur();
    });
    languageButton.addEventListener('click', () => languageModal.show());
    
    // Support modal event listeners
    document.querySelector('.footer-buttons a:nth-child(2)').addEventListener('click', function(e) {
        e.preventDefault();
        supportModal.show();
    });
    
    // Contribute button event listener
    contributeBtn.addEventListener('click', function() {
        supportModal.hide();
        
        // Open GitHub contribution page in a new tab
        window.open('https://github.com/mehrazino/tg-cybersec/edit/master/src/data/channels.md', '_blank');
    });
    
    // Star on GitHub button event listener
    document.querySelector('.support-option-star').addEventListener('click', function() {
        window.open('https://github.com/mehrazino/tg-cybersec', '_blank');
    });
    
    // Feedback button event listener
    document.querySelector('.support-option-feedback').addEventListener('click', function() {
        window.open('https://github.com/mehrazino/tg-cybersec/issues/new', '_blank');
    });
    
    // Temporarily disabled
    /*document.querySelector('.support-option-donate').addEventListener('click', function() {
        window.open('https://github.com/sponsors/mehrazino', '_blank');
    });*/
    
    // Sponsor button event listener
    document.querySelector('.support-option-sponsor').addEventListener('click', function() {
        supportModal.hide();
        const sponsorshipModal = new bootstrap.Modal(document.getElementById('sponsorshipModal'));
        sponsorshipModal.show();
    });
    
    // Add event listeners to language options
    languageOptions.forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
            languageModal.hide();
        });
    });
    
    // Functions
    function initLanguage() {
        // Check if language is stored in localStorage
        const storedLang = localStorage.getItem('language');
        if (storedLang && translations[storedLang]) {
            currentLanguage = storedLang;
        }
        
        // Mark the current language as active
        updateActiveLanguage();
        
        // Apply the current language
        applyLanguage();
        
        // Initialize tooltips after language is applied
        initTooltips();
    }
    
    function initTooltips() {
        // Enable tooltips for Scamminder button
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            // Set title attribute from current language
            if (tooltipTriggerEl.classList.contains('footer-btn') && tooltipTriggerEl.querySelector('.scamminder-logo')) {
                tooltipTriggerEl.setAttribute('title', translations[currentLanguage].scamminderTooltip);
            }
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    function changeLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            localStorage.setItem('language', lang);
            updateActiveLanguage();
            applyLanguage();
        }
    }
    
    function updateActiveLanguage() {
        // Remove active class from all options
        languageOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-lang') === currentLanguage) {
                option.classList.add('active');
            }
        });
    }
    
    function applyLanguage() {
        // Set document direction and language
        document.documentElement.setAttribute('dir', translations[currentLanguage].dir);
        document.documentElement.setAttribute('lang', currentLanguage);
        
        // Update text elements
        const t = translations[currentLanguage];
        
        // Update language button text (without globe icon)
        languageButton.innerHTML = `${t.languageButton}`;
        
        // Update page title
        document.title = t.pageTitle;
        document.querySelector('h1').textContent = t.pageTitle;
        
        // Update search placeholder
        searchInput.placeholder = t.searchPlaceholder;
        
        // Update language modal
        document.getElementById('languageModalLabel').textContent = t.languageModalTitle;
        document.querySelector('#languageModal .modal-footer button').textContent = t.closeButton;
        
        // Update footer buttons
        document.querySelector('.footer-buttons a:nth-child(1)').textContent = t.githubButton;
        document.querySelector('.footer-buttons a:nth-child(2)').textContent = t.supportButton;
        
        // Update toast headers
        document.querySelector('#errorToast .toast-header strong').textContent = t.errorTitle;
        document.querySelector('#successToast .toast-header strong').textContent = t.successTitle;
        
        // Update tags modal title
        document.getElementById('tagsModalLabel').textContent = 'تگ‌های کانال';
        
        // Update tooltips to reflect new language
        initTooltips();
        
        // Update channel count display if data is available
        if (channelsData.length > 0) {
            updateChannelCount(channelsData.length);
        } else {
            updateChannelCount(0);
        }
        
        // Update table headers
        const tableHeaders = document.querySelectorAll('thead th');
        if (tableHeaders.length >= 5) {
            tableHeaders[0].textContent = t.tableHeaders.name;
            tableHeaders[1].textContent = t.tableHeaders.link;
            tableHeaders[2].textContent = t.tableHeaders.status;
            tableHeaders[3].textContent = t.tableHeaders.tags;
            tableHeaders[4].textContent = t.tableHeaders.description;
        }
        
        // Update footer buttons
        document.querySelector('.footer-buttons a:nth-child(1)').textContent = t.githubButton;
        document.querySelector('.footer-buttons a:nth-child(2)').textContent = t.supportButton;
        
        // Update tags modal title
        document.getElementById('tagsModalLabel').textContent = t.tableHeaders.tags;
        
        // Update support modal content
        document.getElementById('supportModalLabel').textContent = t.supportModalTitle;
        document.querySelector('.support-option-contribute').textContent = t.supportOptions.contribute;
        document.querySelector('.support-option-star').textContent = t.supportOptions.star;
        document.querySelector('.support-option-feedback').textContent = t.supportOptions.feedback;
        // Fix: Only update donate button if it exists
        const donateBtn = document.querySelector('.support-option-donate');
        if (donateBtn && t.supportOptions.donate) {
            donateBtn.textContent = t.supportOptions.donate;
        }
        // Fix: Ensure sponsor button is updated
        const sponsorBtn = document.querySelector('.support-option-sponsor');
        if (sponsorBtn && t.supportOptions.sponsor) {
            sponsorBtn.textContent = t.supportOptions.sponsor;
        }
        
        // Update sponsorship modal content
        document.getElementById('sponsorshipModalLabel').textContent = t.sponsorshipModalTitle;
        const sponsorInfo = document.querySelector('.sponsor-info');
        if (sponsorInfo) {
            sponsorInfo.textContent = t.sponsorshipInfo;
        }
        const contactBtn = document.querySelector('.sponsor-contact-btn');
        if (contactBtn) {
            contactBtn.textContent = t.contactMe;
        }
        
        // Re-render the table to update status labels
        if (channelsData.length > 0) {
            renderTable();
        }
    }
    
    function loadChannelsData() {
        fetch('src/data/channels.json?' + new Date().getTime()) // Add timestamp to prevent caching
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load channels data');
                }
                return response.json();
            })
            .then(data => {
                // Sort channels alphabetically by channel ID (link)
                channelsData = sortChannelsByLink(data);
        
                // Make a deep copy for the original data
                originalChannelsData = JSON.parse(JSON.stringify(channelsData));
                
                // Display total number of channels
                updateChannelCount(originalChannelsData.length);
                
                // Render the table
                renderTable();
                    
                // If there's a search term, apply the filter
                if (searchInput.value.trim()) {
                    filterChannels(searchInput.value.trim());
                }
            })
            .catch(error => {
                console.error('Error loading data:', error);
                const t = translations[currentLanguage];
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            ${t.loadError}
                        </td>
                    </tr>
                `;
                channelCountText.textContent = t.channelCount.replace('{count}', 0);
            });
    }
    
    function renderTable() {
        const t = translations[currentLanguage];
        
        if (!channelsData || channelsData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        ${t.noChannels}
                    </td>
                </tr>
            `;
            return;
        }
        
        let tableHTML = '';
        
        channelsData.forEach((channel, index) => {
            // Check if the text is Persian to apply RTL
            const nameDir = isPersian(channel.name) ? 'rtl' : 'ltr';
            const descDir = isPersian(channel.description) ? 'rtl' : 'ltr';
            
            // Check if the channel is sponsored
            const isSponsored = channel.tags && channel.tags.some(tag => tag.toLowerCase() === 'sponsored');
            const sponsoredClass = isSponsored ? 'sponsored-row' : '';
            
            tableHTML += `
                <tr class="${sponsoredClass}">
                <td dir="${nameDir}">${escapeHtml(channel.name)}</td>
                    <td class="link-cell">${formatLink(channel.link)}</td>
                    <td>
                        <span class="status-badge status-${channel.status.toLowerCase()}">${
                            channel.status === 'Active' ? t.statusLabels.active : 
                            channel.status === 'Inactive' ? t.statusLabels.inactive : t.statusLabels.unknown
                        }</span>
                    </td>
                    <td>${formatTags(channel.tags, null, index)}</td>
                    <td dir="${descDir}">${formatDescription(channel.description)}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML;
        
        // Adding click events for 'show more tags' buttons
        const moreTagsButtons = tableBody.querySelectorAll('.more-tags[data-channel-index]');
        moreTagsButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation(); // Preventing event propagation to parent cell
                const channelIndex = parseInt(this.getAttribute('data-channel-index'));
                if (!isNaN(channelIndex) && channelIndex >= 0 && channelIndex < channelsData.length) {
                    showAllTags(channelsData[channelIndex].tags);
                }
            });
        });
    }
    
    function handleSearch() {
            clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filterChannels(searchTerm);
        }, 300);
    }
    
    // Adding comma usage guidance in the search field placeholder
    function updateSearchPlaceholder() {
        const t = translations[currentLanguage];
        const inputGroup = searchInput.closest('.input-group');
        
        // If translation for search guidance exists, we use it
        if (t.searchPlaceholder) {
            searchInput.placeholder = t.searchPlaceholder;
        } else {
            // Otherwise, we use the default text
            searchInput.placeholder = "Blue, Red, OSINT, CTI, ...";
        }
        
        // Check if there's text in the search box and adjust direction accordingly
        const text = searchInput.value.trim();
        if (text === '') {
            // For empty search box, use default direction based on current language
            if (currentLanguage === 'fa') {
                searchInput.setAttribute('dir', 'ltr');
                inputGroup.classList.remove('input-group-rtl');
            } else {
                searchInput.setAttribute('dir', t.dir);
                if (t.dir === 'rtl') {
                    inputGroup.classList.add('input-group-rtl');
                } else {
                    inputGroup.classList.remove('input-group-rtl');
                }
            }
        } else {
            // For existing text, set direction based on content
            if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
                searchInput.setAttribute('dir', 'rtl');
                inputGroup.classList.add('input-group-rtl');
            } else {
                searchInput.setAttribute('dir', 'ltr');
                inputGroup.classList.remove('input-group-rtl');
            }
        }
    }
    
    function filterChannels(searchTerm) {
        if (!searchTerm || searchTerm === '@') {
            renderTable();
            return;
        }
        
        // Checking for comma in the search term
        const hasComma = searchTerm.includes(',');
        
        // If comma exists, we convert the term to an array of terms
        let searchTerms = [];
        if (hasComma) {
            // Splitting search term by comma and removing extra spaces
            searchTerms = searchTerm.split(',').map(term => term.trim()).filter(term => term.length > 0);
        } else {
            searchTerms = [searchTerm];
        }
        
        const filteredChannels = channelsData.filter(channel => {
            // If we have multiple search terms, all of them must match the channel
            return searchTerms.every(term => {
                // Check if the term starts with @ for channel ID search
                if (term.startsWith('@') && term.length > 1) {
                    // Remove @ from the term for comparison
                    const channelId = term.substring(1).toLowerCase();
                    
                    // Check if the link contains the channel ID
                    // For t.me links, extract the username part
                    if (channel.link.includes('t.me/')) {
                        const username = channel.link.split('t.me/')[1].toLowerCase();
                        return username.includes(channelId);
                    }
                    // For links that are already in username format (starting with @)
                    else if (channel.link.startsWith('@')) {
                        const username = channel.link.substring(1).toLowerCase();
                        return username.includes(channelId);
                    }
                    // For other links, check if they contain the channel ID
                    else {
                        return channel.link.toLowerCase().includes(channelId);
                    }
                }
                
                // Regular search for other terms
                const nameMatch = channel.name.toLowerCase().includes(term.toLowerCase());
                const linkMatch = channel.link.toLowerCase().includes(term.toLowerCase());
                const descriptionMatch = channel.description.toLowerCase().includes(term.toLowerCase());
                
                // Checking match with tags
                const tagsMatch = channel.tags.some(tag => 
                    tag.toLowerCase().includes(term.toLowerCase())
                );
                
                return nameMatch || linkMatch || descriptionMatch || tagsMatch;
            });
        });
        
        // Sort filtered channels: sponsored first, then the rest
        const sortedFilteredChannels = sortChannelsByLink(filteredChannels);
        
        const t = translations[currentLanguage];
        
        if (sortedFilteredChannels.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <i class="bi bi-search me-2"></i>
                        ${t.noResults.replace('{searchTerm}', escapeHtml(searchTerm))}
                    </td>
                </tr>
            `;
            return;
        }
        
        let tableHTML = '';
        
        sortedFilteredChannels.forEach((channel, index) => {
            // Finding the main index of the channel in channelsData array
            const originalIndex = channelsData.findIndex(c => c.name === channel.name && c.link === channel.link);
            
            // Check if the text is Persian to apply RTL
            const nameDir = isPersian(channel.name) ? 'rtl' : 'ltr';
            const descDir = isPersian(channel.description) ? 'rtl' : 'ltr';
            
            // Check if the channel is sponsored
            const isSponsored = channel.tags && channel.tags.some(tag => tag.toLowerCase() === 'sponsored');
            const sponsoredClass = isSponsored ? 'sponsored-row' : '';
            
            // Create safely highlighted content
            let highlightedName = highlightText(channel.name, searchTerms);
            let displayLink = getDisplayLink(channel.link);
            let highlightedLink = highlightText(displayLink, searchTerms);
            let descriptionWithLinks = formatDescriptionWithHighlight(channel.description, searchTerms);
            
            tableHTML += `
                <tr class="${sponsoredClass}">
                    <td dir="${nameDir}">${highlightedName}</td>
                    <td class="link-cell"><a href="${escapeHtml(channel.link)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(channel.link)}">${highlightedLink}</a></td>
                    <td>
                        <span class="status-badge status-${channel.status.toLowerCase()}">${
                            channel.status === 'Active' ? t.statusLabels.active : 
                            channel.status === 'Inactive' ? t.statusLabels.inactive : t.statusLabels.unknown
                        }</span>
                    </td>
                    <td>${formatTags(channel.tags, searchTerms, originalIndex)}</td>
                    <td dir="${descDir}">${descriptionWithLinks}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = tableHTML;
        
        // Display search results count in another element or in another way
        // For example, you can add a new HTML element that shows the search results
        
        // Adding click events for 'show more tags' buttons
        const moreTagsButtons = tableBody.querySelectorAll('.more-tags[data-channel-index]');
        moreTagsButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.stopPropagation(); // Preventing event propagation to parent cell
                const channelIndex = parseInt(this.getAttribute('data-channel-index'));
                if (!isNaN(channelIndex) && channelIndex >= 0 && channelIndex < channelsData.length) {
                    showAllTags(channelsData[channelIndex].tags);
                }
            });
        });
    }
    
    function highlightText(text, searchTerm) {
        if (!text || !searchTerm || !searchTerm.length) return escapeHtml(text || '');
        
        try {
            // First remove any HTML in the original text
            const tempDiv = document.createElement('div');
            tempDiv.textContent = text;
            const plainText = tempDiv.textContent;
            
            // Now we escape the plain text to prevent XSS attacks
            const safeText = escapeHtml(plainText);
            
            // If search term doesn't exist or is empty after trim
            if (!searchTerm || 
                (typeof searchTerm === 'string' && !searchTerm.trim()) || 
                (Array.isArray(searchTerm) && (!searchTerm.length || !searchTerm.some(t => t && typeof t === 'string' && t.trim())))) {
                return safeText;
            }
            
            // Process an array of search terms
            if (Array.isArray(searchTerm)) {
                // Filter valid terms and sort by length (descending)
                const validTerms = searchTerm
                    .filter(term => term && typeof term === 'string' && term.trim())
                    .map(term => term.trim())
                    .sort((a, b) => b.length - a.length);
                
                if (!validTerms.length) return safeText;
                
                // Process each term separately
                let result = safeText;
                for (const term of validTerms) {
                    // Secure the regex pattern
                    const pattern = escapeRegExp(term);
                    const regex = new RegExp(`(${pattern})`, 'gi');
                    
                    // Replace terms with highlight tag
                    result = result.replace(regex, '<span class="highlight">$1</span>');
                }
                return result;
            } 
            // Process a single search term
            else if (typeof searchTerm === 'string' && searchTerm.trim()) {
                const pattern = escapeRegExp(searchTerm.trim());
                const regex = new RegExp(`(${pattern})`, 'gi');
                
                return safeText.replace(regex, '<span class="highlight">$1</span>');
            }
            
            // Default case - return safe text
            return safeText;
        } catch (e) {
            console.error('Error in highlightText:', e);
            return escapeHtml(text || '');
        }
    }
    
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    function formatTags(tagsArray, searchTerm, index) {
        if (!tagsArray || tagsArray.length === 0) return '';
        
        // Maximum number of visible tags
        const maxVisibleTags = 3;
        
        // Remove duplicate tags
        const uniqueTags = [...new Set(tagsArray)];
        
        // Filter out the 'sponsored' tag (to not display it)
        const visibleTags = uniqueTags.filter(tag => tag.toLowerCase() !== 'sponsored');
        
        // Function to create a single tag HTML
        const createTagHtml = (tag) => {
            // First escape the tag content
            const safeTagContent = escapeHtml(tag);
            
            let tagClass = 'tag';
            
            // Add specific classes based on tag content
            if (tag.toLowerCase() === 'sponsored') {
                tagClass += ' tag-sponsored';
            } else if (tag.toLowerCase().includes('blue')) {
                tagClass += ' tag-blue';
            } else if (tag.toLowerCase().includes('red')) {
                tagClass += ' tag-red';
            } else if (tag.toLowerCase().includes('news')) {
                tagClass += ' tag-news';
            } else if (tag.toLowerCase().includes('academy')) {
                tagClass += ' tag-academy';
            }
            
            // If search term exists, try to highlight it
            let tagContent = safeTagContent;
            if (searchTerm) {
                try {
                    if (Array.isArray(searchTerm) && searchTerm.some(term => term && typeof term === 'string' && tag.toLowerCase().includes(term.toLowerCase()))) {
                        tagContent = highlightText(tag, searchTerm);
                    } else if (typeof searchTerm === 'string' && tag.toLowerCase().includes(searchTerm.toLowerCase())) {
                        tagContent = highlightText(tag, searchTerm);
                    }
                } catch (e) {
                    console.error("Error highlighting tag:", e);
                    tagContent = safeTagContent; // Fallback to safe content
                }
            }
            
            return `<span class="${tagClass}">${tagContent}</span>`;
        };
        
        // If the number of displayable tags is greater than the maximum allowed
        if (visibleTags.length > maxVisibleTags) {
            const displayTags = visibleTags.slice(0, maxVisibleTags);
            const remainingCount = visibleTags.length - maxVisibleTags;
            
            // Create HTML for visible tags
            let tagsHtml = displayTags.map(createTagHtml).join(' ');
            
            // Add button to show more tags
            tagsHtml += ` <span class="more-tags" data-channel-index="${index}" title="Show all tags">+${remainingCount}</span>`;
            
            return tagsHtml;
        } else {
            // If the number of tags is less than or equal to the maximum allowed
            return visibleTags.map(createTagHtml).join(' ');
        }
    }
    
    function formatLink(link) {
        if (!link) return '';
        
        try {
            const displayLink = getDisplayLink(link);
            const safeDisplayLink = escapeHtml(displayLink);
            const safeLink = escapeHtml(link);
            
            return `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" title="${safeLink}">${safeDisplayLink}</a>`;
        } catch (e) {
            console.error("Error in formatLink:", e, "for link:", link);
            return escapeHtml(link || '');
        }
    }
    
    function formatDescription(description) {
        if (!description) return '';
        
        try {
            // First we need to completely remove any HTML in the original text
            // This converts it to a simple text string
            const tempDiv = document.createElement('div');
            tempDiv.textContent = description;
            const plainText = tempDiv.textContent;
            
            // Now we escape the plain text to prevent XSS attacks
            const safeText = escapeHtml(plainText);
            
            // Pattern for detecting links
            const urlRegex = /(https?:\/\/[^\s]+)|(ftp:\/\/[^\s]+)|(www\.[^\s]+)|(@[a-zA-Z0-9_]{5,})|((https?:\/\/)?(t\.me\/[^\s]+))/g;
            
            // Replace links with a tags
            const formattedText = safeText.replace(urlRegex, function(url) {
                let href = url;
                
                // Add http:// to links that start with www
                if (url.startsWith('www.')) {
                    href = 'http://' + url;
                }
                
                // Convert Telegram username to link
                if (url.startsWith('@') && url.length > 5) {
                    href = 'https://t.me/' + url.substring(1);
                }
                
                return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="description-link">${url}</a>`;
            });
            
            return formattedText;
        } catch (e) {
            console.error('Error in formatDescription:', e);
            // In case of error, return the original text as escaped
            return escapeHtml(description);
        }
    }
    
    function formatDescriptionWithHighlight(description, searchTerm) {
        if (!description) return '';
        
        try {
            // Step 1: Remove any HTML in the original text
            const tempDiv = document.createElement('div');
            tempDiv.textContent = description;
            const plainText = tempDiv.textContent;
            
            // Step 2: Escape the plain text
            const safeText = escapeHtml(plainText);
            
            // Step 3: Mark links with a temporary marker (placeholder)
            // This allows us to retrieve links later
            const urlRegex = /(https?:\/\/[^\s]+)|(ftp:\/\/[^\s]+)|(www\.[^\s]+)|(@[a-zA-Z0-9_]{5,})|((https?:\/\/)?(t\.me\/[^\s]+))/g;
            
            // Find all links
            const links = [];
            let markedText = safeText.replace(urlRegex, (match, ...args) => {
                const id = links.length;
                links.push({
                    url: match,
                    id: id
                });
                return `__LINK_${id}__`;
            });
            
            // Step 4: Now highlight the text with search terms
            let highlightedText = (searchTerm && searchTerm.length) 
                ? highlightSearchTerms(markedText, searchTerm)
                : markedText;
            
            // Step 5: Replace link markers with appropriate HTML tags
            for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const linkMarker = `__LINK_${i}__`;
                
                let href = link.url;
                
                // Process special link types
                if (link.url.startsWith('www.')) {
                    href = 'http://' + link.url;
                } else if (link.url.startsWith('@') && link.url.length > 5) {
                    href = 'https://t.me/' + link.url.substring(1);
                }
                
                // Highlight link text if it contains search term
                let linkText = link.url;
                if (searchTerm && searchTerm.length) {
                    linkText = highlightSearchTerms(linkText, searchTerm);
                }
                
                const linkHtml = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="description-link">${linkText}</a>`;
                
                // Replace marker with HTML tag
                highlightedText = highlightedText.replace(linkMarker, linkHtml);
            }
            
            return highlightedText;
        } catch (e) {
            console.error('Error in formatDescriptionWithHighlight:', e);
            return escapeHtml(description || '');
        }
    }
    
    function getDisplayLink(link) {
        // If it's a Telegram link, format it nicely
        if (link.includes('t.me/')) {
            return '@' + link.split('t.me/')[1];
        }
        
        // If it's already a username format
        if (link.startsWith('@')) {
            return link;
        }
        
        // Otherwise, return the link as is
        return link;
    }
    
    function isPersian(text) {
        if (!text) return false;
        // Persian Unicode range (approximate)
        const persianRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return persianRegex.test(text);
    }
    
    function escapeHtml(unsafe) {
        if (unsafe === undefined || unsafe === null) return '';
        
        try {
            // Ensure unsafe is treated as a string
            unsafe = String(unsafe);
            
            // Extra replacement for curly braces, hash, and other potentially problematic characters
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/`/g, "&#96;")  // Backtick
                .replace(/\$/g, "&#36;"); // Dollar sign
        } catch (e) {
            console.error("Error in escapeHtml:", e, "for input:", unsafe);
            return '';
        }
    }
    
    // Function to update the channel count display
    function updateChannelCount(count) {
        const t = translations[currentLanguage];
        // Always display the total number of channels
        // If originalChannelsData exists, use it; otherwise use count
        const totalCount = originalChannelsData && originalChannelsData.length ? originalChannelsData.length : count;
        channelCountText.textContent = t.channelCount.replace('{count}', totalCount);
    }
    
    function showError(message) {
        const errorToastBody = document.getElementById('errorToastBody');
        errorToastBody.textContent = message;
        errorToast.show();
    }
    
    function showSuccess(message) {
        const successToastBody = document.getElementById('successToastBody');
        successToastBody.textContent = message;
        successToast.show();
    }
    
    // Function to display all tags in modal
    function showAllTags(tagsArray) {
        if (!tagsArray || tagsArray.length === 0) return;
        
        // Remove duplicate tags
        const uniqueTags = [...new Set(tagsArray)];
        
        // Filter out the 'sponsored' tag (to not display it)
        const visibleTags = uniqueTags.filter(tag => tag.toLowerCase() !== 'sponsored');
        
        // Creating HTML for displaying tags
        const tagsHtml = visibleTags.map(tag => {
            // First escape any HTML in the tag
            const safeTag = escapeHtml(tag);
            
            let tagClass = 'tag';
            
            // Add specific classes based on tag content
            if (tag.toLowerCase().includes('blue')) {
                tagClass += ' tag-blue';
            } else if (tag.toLowerCase().includes('red')) {
                tagClass += ' tag-red';
            } else if (tag.toLowerCase().includes('news')) {
                tagClass += ' tag-news';
            } else if (tag.toLowerCase().includes('academy')) {
                tagClass += ' tag-academy';
            }
            
            return `<span class="${tagClass}">${safeTag}</span>`;
        }).join(' ');
        
        // Placing tags in modal
        tagsContainer.innerHTML = tagsHtml;
        
        // Showing modal
        tagsModal.show();
    }
    
    // Function to return channels in random order
    function sortChannelsByLink(channels) {
        // First separate the sponsored channels
        const sponsoredChannels = channels.filter(channel => 
            channel.tags && channel.tags.some(tag => tag.toLowerCase() === 'sponsored')
        );
        
        // Sort the rest of the channels randomly
        const otherChannels = channels.filter(channel => 
            !channel.tags || !channel.tags.some(tag => tag.toLowerCase() === 'sponsored')
        );
        
        // Random sorting for non-sponsored channels
        const shuffledOtherChannels = [...otherChannels];
        for (let i = shuffledOtherChannels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOtherChannels[i], shuffledOtherChannels[j]] = [shuffledOtherChannels[j], shuffledOtherChannels[i]];
        }
        
        // Combine sponsored channels (at the top) with the rest of the channels
        return [...sponsoredChannels, ...shuffledOtherChannels];
    }
    
    // Helper function to extract username from link
    function getChannelUsername(link) {
        // If it's a Telegram link, extract the username
        if (link.includes('t.me/')) {
            return link.split('t.me/')[1];
        }
        
        // If it's already a username format
        if (link.startsWith('@')) {
            return link.substring(1);
        }
        
        // Otherwise, return the link as is
        return link;
    }
    
    // Helper function for highlighting search terms
    function highlightSearchTerms(text, searchTerms) {
        if (!text || !searchTerms || !searchTerms.length) return text;
        
        try {
            // First secure the text
            let safeText = text;
            
            // If we have an array of search terms
            if (Array.isArray(searchTerms)) {
                // Filter and sort valid terms (from longest to shortest)
                const validTerms = searchTerms
                    .filter(term => term && typeof term === 'string' && term.trim())
                    .map(term => term.trim())
                    .sort((a, b) => b.length - a.length);
                
                if (validTerms.length === 0) return safeText;
                
                // Replace terms with highlight tags
                for (const term of validTerms) {
                    const escapedPattern = escapeRegExp(term);
                    const regex = new RegExp(`(${escapedPattern})`, 'gi');
                    safeText = safeText.replace(regex, '<span class="highlight">$1</span>');
                }
            } 
            // If we have a single search term
            else if (typeof searchTerms === 'string' && searchTerms.trim()) {
                const escapedPattern = escapeRegExp(searchTerms.trim());
                const regex = new RegExp(`(${escapedPattern})`, 'gi');
                safeText = safeText.replace(regex, '<span class="highlight">$1</span>');
            }
            
            return safeText;
        } catch (e) {
            console.error('Error in highlightSearchTerms:', e);
            return text;
        }
    }
});
