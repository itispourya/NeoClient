/**
 * NeoClient v1.1.1 Front-End JavaScript
 * Powered by NeoNotion.net
 */
const NEOCLIENT = window.neoclient_data || {};

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node/CommonJS
        module.exports = function(root, jQuery) {
            if (jQuery === undefined) {
                if (typeof window !== 'undefined') {
                    jQuery = require('jquery');
                } else {
                    jQuery = require('jquery')(root);
                }
            }
            factory(jQuery);
            return jQuery;
        };
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function($) {
    'use strict';


    const config = {
        ajaxUrl: window.neoclient_data && window.neoclient_data.ajax_url ? window.neoclient_data.ajax_url : '/wp-admin/admin-ajax.php',
        nonce: window.neoclient_data && window.neoclient_data.nonce ? window.neoclient_data.nonce : '',
        userId: window.neoclient_data && window.neoclient_data.user_id ? window.neoclient_data.user_id : 0,
        isLoggedIn: window.neoclient_data && window.neoclient_data.is_user_logged_in ? window.neoclient_data.is_user_logged_in : false,
        iconsUrl: window.neoclient_data && window.neoclient_data.icons_url ? window.neoclient_data.icons_url : './icons/'
    };


    // Function to create Persian date dropdowns
    function createPersianDateDropdowns(containerId) {
        const container = $(`#${containerId}`);
        container.empty(); // Clear existing content

        const currentYear = new Date().getFullYear();
        let jalaaliCurrentYear;
        if (typeof jalaali !== 'undefined') {
            const jalaaliToday = jalaali.toJalaali(currentYear, 1, 1);
            jalaaliCurrentYear = jalaaliToday.jy;
        } else {
            jalaaliCurrentYear = currentYear; // Fallback for Gregorian if jalaali.js is not loaded
        }

        const startYear = jalaaliCurrentYear - 100; // 100 years back
        const endYear = jalaaliCurrentYear + 10;   // 10 years forward

        const yearSelect = $('<select class="neoclient-date-year"></select>');
        const monthSelect = $('<select class="neoclient-date-month"></select>');
        const daySelect = $('<select class="neoclient-date-day"></select>');

        // Populate years
        for (let year = endYear; year >= startYear; year--) {
            yearSelect.append(`<option value="${year}">${year}</option>`);
        }

        // Populate months
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        months.forEach((monthName, index) => {
            monthSelect.append(`<option value="${index + 1}">${monthName}</option>`);
        });

        // Append to container
        container.append(yearSelect).append(monthSelect).append(daySelect);

        // Function to update days based on selected year and month
        function updateDays() {
            const selectedYear = parseInt(yearSelect.val());
            const selectedMonth = parseInt(monthSelect.val());
            daySelect.empty();

            if (isNaN(selectedYear) || isNaN(selectedMonth)) {
                return; // Do nothing if year or month is not selected
            }

            let daysInMonth;
            if (typeof jalaali !== 'undefined') {
                daysInMonth = jalaali.jalaaliMonthLength(selectedYear, selectedMonth);
            } else {
                // Fallback for Gregorian if jalaali.js is not loaded
                const gregorianDate = new Date(selectedYear, selectedMonth - 1, 1);
                daysInMonth = new Date(gregorianDate.getFullYear(), gregorianDate.getMonth() + 1, 0).getDate();
            }

            for (let day = 1; day <= daysInMonth; day++) {
                daySelect.append(`<option value="${day}">${day}</option>`);
            }
        }

        // Event listeners for changes
        yearSelect.on('change', updateDays);
        monthSelect.on('change', updateDays);

        function setDropdownValues(date) {
            if (date) {
                let year, month, day;
                if (typeof jalaali !== 'undefined') {
                    const jalaaliDate = jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
                    year = jalaaliDate.jy;
                    month = jalaaliDate.jm;
                    day = jalaaliDate.jd;
                } else {
                    year = date.getFullYear();
                    month = date.getMonth() + 1;
                    day = date.getDate();
                }
                yearSelect.val(year);
                monthSelect.val(month);
                updateDays(); // Update days based on initial year/month
                daySelect.val(day);
            } else {
                // Optionally clear or set to default if date is null
                yearSelect.val('');
                monthSelect.val('');
                daySelect.val('');
            }
        }

        // Initial call to populate days
        updateDays();

        // Return a function to get the selected date and a setter
        return {
            getSelectedDate: () => {
                const y = parseInt(yearSelect.val());
                const m = parseInt(monthSelect.val());
                const d = parseInt(daySelect.val());
                if (isNaN(y) || isNaN(m) || isNaN(d)) {
                    return null;
                }
                if (typeof jalaali !== 'undefined') {
                    const gregorianDate = jalaali.toGregorian(y, m, d);
                    return new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd);
                } else {
                    return new Date(y, m - 1, d);
                }
            },
            setDropdownValues: setDropdownValues
        };
    }

    function updateDateTime() {
        const now = new Date();
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
        const day = new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(now);
        const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
        const year = new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(now);

        const date = `${weekday} - ${day} / ${month} / ${year}`;

        const hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        };
        const time = new Intl.DateTimeFormat('en-US', options).format(now);

        // Set direction for the digital-date div to ensure RTL display
        // This is handled by CSS, but adding it here for explicit control if needed
        // const clockHtml = `
        //     <div class="digital-date" style="direction: ltr;">${date}</div>
        //     <div class="digital-time">${time}</div>
        // `;

        const clockHtml = `
            <div class="digital-date">${date}</div>
            <div class="digital-time">${time}</div>
        `;
        const dateTimeElement = $('#neoclient-datetime');
        if (dateTimeElement.length) {
            dateTimeElement.html(clockHtml);
        } else {
        }
    }






    function loadChartJs() {
        return new Promise((resolve, reject) => {
            const checkChart = (retries) => {
                if (typeof window.Chart !== 'undefined' && window.Chart) {
                    debugLog('Chart.js already loaded. Chart object:', window.Chart);
                    if (typeof window.Chart.getChart === 'function') {
                        debugLog('Chart.getChart is available.');
                    } else {
                        debugLog('Chart.getChart is NOT available. Chart object details:', window.Chart);
                    }
                    resolve();
                } else if (retries > 0) {
                    debugLog(`Chart is undefined or null. Retrying... (${retries} retries left)`);
                    setTimeout(() => checkChart(retries - 1), 100);
                } else {
                    debugLog('Chart is undefined or null. typeof window.Chart is: ' + typeof window.Chart + '. Value of window.Chart:', window.Chart);
                    // Chart.js should be enqueued by PHP, so if it's not here, something is wrong.
                    showNotification('Error loading chart library', 'error');
                    debugLog('Chart.js not found. Check PHP enqueue. typeof window.Chart is: ' + typeof window.Chart);
                    reject(new Error('Chart.js not loaded after multiple retries.'));
                }
            };
            checkChart(10); // Try up to 10 times with 100ms delay
        });
    }


const translations = {
    en: {
        view_client_appointments: 'View Client Appointments',
        login_title: 'Login to System',
        show_password: 'Show Password',
        remember_me: 'Remember Me',
        login: 'Login',
        forgot_password: 'Forgot Password?',
        client_name: 'Name',
        birthdate: 'Birthdate',
        year: 'Year',
        month: 'Month',
        day: 'Day',
        occupation: 'Occupation',
        client_phone: 'Phone',
        client_email: 'Email',
        client_appointments: 'Client Appointments',
        skin_type: 'Skin Type',
        sensitivities: 'Sensitivities',
        skin_tone: 'Skin Tone',
        hydration_level: 'Hydration Level',
        acne_level: 'Acne Level',
        acne_prone_areas: 'Acne-Prone Areas',
        sun_exposure: 'Sun Exposure',
        skincare_routine: 'Skincare Routine',
        purchased_products: 'Purchased Products',
        skin_needs: 'Skin Needs',
        care_instructions: 'Care Instructions',
        skin_concerns: 'Skin Concerns',
        date: 'Date',
        time: 'Time',
        services: 'Services',
        priority: 'Priority',
        status: 'Status',
        amount: 'Amount',
        notes: 'Notes',
        register: 'Register',
        register_title: 'Registration',
        registration_success: 'Registration completed successfully.',
        forgot_password_title: 'Reset Password',
        reset_password: 'Reset Password',
        dashboard_title: 'Dashboard',
        total_clients: 'Total Clients',
        monthly_appointments: 'Monthly Appointments',
        monthly_revenue: 'Monthly Revenue',
        pending_appointments: 'Pending Appointments',
        manage_appointments: 'Manage Appointments',
        new_appointment: 'New Appointment',
        recent_documents: 'Recent Documents',
        manage_documents: 'Manage Documents',
        new_document: 'New Document',
        reports_title: 'Reports',
        stats_charts: 'Statistics Charts',
        total_appointments: 'Total Appointments',
        cancelled_appointments: 'Cancelled Appointments',
        total_revenue: 'Total Revenue',
        best_month_by_revenue: 'Best Month by Revenue',
        best_month_by_customers: 'Best Month by Customers',
        profile_title: 'Profile',
        save: 'Save',
        change_password: 'Change Password',
        change_password_title: 'Change Password',
        support: 'Contact Support',
        upgrade_to_pro: 'Upgrade to Premium',
        backup: 'Backup (CSV)',
        restore: 'Restore Backup',
        logout: 'Logout',
        new_appointment_title: 'New Appointment',
        edit_appointment_title: 'Edit Appointment',
        save_changes: 'Save Changes',
        close: 'Cancel',
        new_document_title: 'New Document',
        edit_document_title: 'Edit Document',
        user_details_title: 'User Details',
        appointments: 'Appointments',
        documents: 'Documents',
        reports: 'Reports',
        profile: 'Profile',
        confirm_client_title: 'Confirm Client',
        yes: 'Yes',
        no: 'No',
        returning_client_title: 'Returning Client',
        yes_add_to_document: 'Yes, Add to Document',
        no_create_new_document: 'No, Create New Document',
        confirm_delete_appointment: 'Are you sure you want to delete this appointment?',
        confirm_delete_document: 'Are you sure you want to delete this document?',
        confirm_delete_title: 'Confirm Deletion',
        error_login: 'Login Error',
        error_register: 'Registration Error',
        error_reset_password: 'Password Reset Error',
        error_change_password: 'Change Password Error',
        error_new_appointment: 'You have reached your storage limit. Please upgrade to premium for more access. <a href="https://neoclient.ir/premium" target="_blank" style="color: #007bff; text-decoration: underline;">NEOCLIENT.IR/PREMIUM <img src="' + NEOCLIENT.icons_url + 'premium.png" alt="Premium" style="vertical-align: middle; width: 20px; height: 20px;"></a>',
        error_edit_appointment: 'Error Editing Appointment',
        error_delete_appointment: 'Error Deleting Appointment',
        error_new_document: 'Error Creating New Document',
        error_edit_document: 'Error Editing Document',
        error_delete_document: 'Error Deleting Document',
        error_confirm_client: 'Error Confirming Client',
        error_update_profile: 'Error Updating Profile',
        error_load_profile: 'Error Loading Profile',
        error_backup: 'Error Creating Backup',
        error_restore: 'Error Restoring Backup',
        error_get_holidays: 'Error Loading Holidays',
        server_error: 'A server error occurred. Please try again later.',
        view_appointment_title: 'View Appointment',
        view_document_title: 'View Document',
        edit: 'Edit',
        delete: 'Delete',
        no_data: 'No data available to display',
        pending: 'Pending',
        completed: 'Completed',
        cancelled: 'Cancelled',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        address: 'Address',
        fear_of_closed_spaces: 'Fear of Closed Spaces',
        consumables: 'Consumables',
        cigarette: 'Cigarette',
        hookah: 'Hookah',
        alcohol: 'Alcohol',
        pregnancy_status: 'Pregnancy Status',
        pregnant: 'Pregnant',
        lactating: 'Lactating',
        normal: 'Normal',
        oily: 'Oily',
        dry: 'Dry',
        combination: 'Combination',
        information: 'About the Program',
        light: 'Light',
        medium_tone: 'Medium',
        dark: 'Dark',
        add_past_appointment: 'Add Past Appointment',
        appointment_history: 'Appointment History',
        no_history_found: 'No History Found',
        open_camera: 'Open Camera',
        camera_access_error: 'Camera Access Error',
        appointment_added_to_history: 'Appointment Successfully Added to History',
        monthly_revenue: 'Monthly Revenue',
        monthly_customers: 'Monthly Customers',
        best_month_revenue: 'Best Month by Revenue',
        best_month_customers: 'Best Month by Customers',
        enter_client_name_for_appointments: 'Please enter the client name to view appointments',
        skin_type_distribution: 'Skin Type Distribution',
        skin_type_legend: 'Skin Type Color Legend',
        sensitive: 'Sensitive',
        unknown: 'Unknown',
        appointments_by_status: 'Appointments by Status',
        revenue_by_month: 'Revenue by Month',
        status_legend: 'Status Color Legend'
    }
};



    // Determine language safely with fallback to English
    const containerLang = $('.neoclient-container').data('lang');
    const lang = translations[containerLang] ? containerLang : 'en';
    
    // Safe translate function that avoids TypeError when lang set is missing
    function translate(key) {
        const dict = translations[lang] || translations.en;
        return (dict && dict[key]) ? dict[key] : key;
    }


    function persianNumber(number) {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(number).replace(/[0-9]/g, d => persianDigits[parseInt(d)]);
    }


    function debugLog(message) {
        console.log(`[NeoClient v5 ${new Date().toISOString()}] ${message}`);
    }

    // Load Flatpickr dynamically (CDN) and resolve when available
    function loadFlatpickr() {
        return new Promise((resolve, reject) => {
            if (window.flatpickr) {
                resolve();
                return;
            }
            const cssId = 'flatpickr-css';
            const jsId = 'flatpickr-js';
            if (!document.getElementById(cssId)) {
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
                document.head.appendChild(link);
            }
            if (!document.getElementById(jsId)) {
                const script = document.createElement('script');
                script.id = jsId;
                script.src = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.js';
                script.async = true;
                script.onload = () => {
                    setTimeout(() => {
                        if (window.flatpickr) {
                            resolve();
                        } else {
                            reject(new Error('Flatpickr failed to load'));
                        }
                    }, 50);
                };
                script.onerror = () => reject(new Error('Failed to load Flatpickr script'));
                document.body.appendChild(script);
            } else {
                let retries = 20;
                const timer = setInterval(() => {
                    if (window.flatpickr) {
                        clearInterval(timer);
                        resolve();
                    } else if (--retries <= 0) {
                        clearInterval(timer);
                        reject(new Error('Flatpickr not available after waiting.'));
                    }
                }, 100);
            }
        });
    }

    // Unified Gregorian datepicker initializer
    function initDatePicker(selector, opts = {}) {
        const el = document.querySelector(selector);
        if (!el) {
            debugLog(`initDatePicker: element not found for selector ${selector}`);
            return;
        }
        const defaultOptions = {
            dateFormat: 'Y/m/d',
            allowInput: true,
            locale: 'default'
        };
        const options = Object.assign({}, defaultOptions, opts);
        return loadFlatpickr()
            .then(() => {
                el.style.display = '';
                const dropdownId = `${el.id}-dropdown-container`;
                const existing = document.getElementById(dropdownId);
                if (existing) existing.remove();
                return window.flatpickr(el, options);
            })
    .catch(err => {
        debugLog(`initDatePicker error for ${selector}: ${err.message}`);
    });
}
// Expose for external usage (e.g., preview harness)
window.initDatePicker = initDatePicker;

// Parse a Gregorian date/time like 'YYYY/MM/DD' and 'HH:MM' to Date
function parseGregorianDateTime(dateStr, timeStr) {
    try {
        if (!dateStr) return null;
        const parts = (dateStr || '').split('/');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 1;
            const d = parseInt(parts[2], 10) || 1;
            const [hh, mm] = (timeStr || '00:00').split(':').map(n => parseInt(n, 10) || 0);
            return new Date(y, m - 1, d, hh, mm);
        }
        // Fallback to native parsing if unexpected format
        return new Date(`${dateStr}${timeStr ? ' ' + timeStr : ''}`);
    } catch (e) {
        debugLog(`parseGregorianDateTime error: ${e.message}`);
        return new Date();
    }
}


    function validateForm(formId) {
    // ... existing code ...
    const inputs = document.querySelectorAll(`#${formId} input[required]`);
    let valid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) {
            valid = false;
            // show error
        }
    });
    return valid;
}
// ... existing code ...

    function showNotification(message, type = 'info', details = '') {
        console.log('showNotification called with:', { message, type, details });
        if (!message) {
            return; // Do not display empty notifications
        }
        let $notification = $('#neoclient-notification');
        if (!$notification.length) {
            $('body').append('<div id="neoclient-notification" class="neoclient-notification"></div>');
            $notification = $('#neoclient-notification');
        }

        let notificationContent = `<div class="notification-message"><p>${message}</p>`;
        if (details) {
            notificationContent += `<small>${details}</small>`;
        }
        notificationContent += `</div>`;

        // Reset any existing animations
        $notification.stop(true, true);

        $notification
            .html(notificationContent)
            .removeClass('info success error warning')
            .addClass(type)
            .css({
                display: 'flex',
                opacity: 0
            })
            .animate({
                opacity: 1,
                top: '+=20'
            }, {
                duration: 300,
                start: function() {
                    $(this).css('top', '0');
                }
            });

        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                $notification.animate({
                    opacity: 0,
                    top: '-=20'
                }, {
                    duration: 300,
                    complete: function() {
                        $(this).hide().removeClass(type);
                    }
                });
            }, 5000);
        } else {
            if ($notification.find('.close-notification').length === 0) {
                $notification.prepend('<button class="close-notification">×</button>');
                $notification.addClass('has-close-button');
                $notification.on('click', '.close-notification', function() {
                    $notification.animate({
                        opacity: 0,
                        top: '-=20'
                    }, {
                        duration: 300,
                        complete: function() {
                            $(this).hide();
                        }
                    });
                });
            }
        }
    }


    function createPopup(popupId, content) {
        if (!$(`#${popupId}`).length) {
            debugLog(`Creating popup: ${popupId}`);
            $('body').append(`
                <div id="${popupId}" class="neoclient-popup">
                    <div class="neoclient-popup-content">
                        ${content}
                    </div>
                </div>
            `);
        }
    }

 
    function initPopups() {
        createPopup('edit-appointment-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('edit_appointment_title')}</h3>
            <form class="neoclient-form">
                <input type="hidden" id="edit-appointment-id">
                <label for="edit-appointment-client_name">${translate('client_name')}</label>
                <input type="text" id="edit-appointment-client_name" required autocomplete="off">
                <label for="edit-appointment-date">${translate('date')}</label>
                <input type="text" id="edit-appointment-date" placeholder="${translate('date')}" required autocomplete="off">
                <label for="edit-appointment-time">${translate('time')}</label>
                <input type="time" id="edit-appointment-time" required autocomplete="off">
                <label for="edit-appointment-services">${translate('services')}</label>
                <input type="text" id="edit-appointment-services" autocomplete="off">
                <label for="edit-appointment-priority">${translate('priority')}</label>
                <select id="edit-appointment-priority">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <label for="edit-appointment-status">${translate('status')}</label>
                <select id="edit-appointment-status">
                    <option value="pending">${translate('pending')}</option>
                    <option value="completed">${translate('completed')}</option>
                    <option value="cancelled">${translate('cancelled')}</option>
                </select>
                <label for="edit-appointment-amount">${translate('amount')}</label>
                <input type="number" id="edit-appointment-amount" min="0" autocomplete="off">
                <label for="edit-appointment-notes">${translate('notes')}</label>
                <textarea id="edit-appointment-notes" autocomplete="off"></textarea>
                <div class="neoclient-form-row">
                    <input type="checkbox" id="edit-appointment-append_to_document">
                    <label for="edit-appointment-append_to_document">Append to Document</label>
                </div>
                <div id="edit-appointment-document-select-container" style="display: none;">
                    <label for="edit-appointment-document_id">${translate('select_document')}</label>
                    <select id="edit-appointment-document_id"></select>
                </div>
                <div class="neoclient-form-actions">
                    <button type="submit" id="edit-appointment-submit" class="neoclient-button">${translate('save_changes')}</button>
                </div>
            </form>
        `);

        createPopup('edit-document-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('edit_document_title')}</h3>
            <form class="neoclient-form">
                <input type="hidden" id="edit-document-id">
                <label for="edit-document-client_name">${translate('client_name')}</label>
                <input type="text" id="edit-document-client_name" required autocomplete="off">
                <button id="edit-document-client-appointments-button" class="neoclient-button">${translate('client_appointments')}</button>
                <label for="edit-document-birthdate">${translate('birthdate')}</label>
                <input type="text" id="edit-document-birthdate" placeholder="${translate('birthdate')}" autocomplete="off">
// ... existing code ...
                <label for="edit-document-occupation">${translate('occupation')}</label>
                <input type="text" id="edit-document-occupation" autocomplete="off">
                <label for="edit-document-client_phone">${translate('client_phone')}</label>
                <input type="text" id="edit-document-client_phone" autocomplete="off">
                <label for="edit-document-client_email">${translate('client_email')}</label>
                <input type="email" id="edit-document-client_email" autocomplete="off">
                <label for="edit-document-skin_type">${translate('skin_type')}</label>
                <select id="edit-document-skin_type">
                    <option value="normal">${translate('normal')}</option>
                    <option value="oily">${translate('oily')}</option>
                    <option value="dry">${translate('dry')}</option>
                    <option value="combination">${translate('combination')}</option>
                </select>
                <label for="edit-document-skin_concerns">${translate('skin_concerns')}</label>
                <textarea id="edit-document-skin_concerns" autocomplete="off"></textarea>
                <label for="edit-document-sensitivities">${translate('sensitivities')}</label>
                <textarea id="edit-document-sensitivities" autocomplete="off"></textarea>
                <label for="edit-document-skin_tone">${translate('skin_tone')}</label>
                <select id="edit-document-skin_tone">
                    <option value="light">${translate('light')}</option>
                    <option value="medium">${translate('medium_tone')}</option>
                    <option value="dark">${translate('dark')}</option>
                </select>
                <label for="edit-document-hydration_level">${translate('hydration_level')}</label>
                <select id="edit-document-hydration_level">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <label for="edit-document-acne_level">${translate('acne_level')}</label>
                <input type="text" id="edit-document-acne_level" autocomplete="off">
                <label for="edit-document-sun_exposure">${translate('sun_exposure')}</label>
                <select id="edit-document-sun_exposure">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <label for="edit-document-skincare_routine">${translate('skincare_routine')}</label>
                <textarea id="edit-document-skincare_routine" autocomplete="off"></textarea>
                <label for="edit-document-purchased_products">${translate('purchased_products')}</label>
                <textarea id="edit-document-purchased_products" autocomplete="off"></textarea>
                <label for="edit-document-skin_needs">${translate('skin_needs')}</label>
                <textarea id="edit-document-skin_needs" autocomplete="off"></textarea>
                <label for="edit-document-care_instructions">${translate('care_instructions')}</label>
                <textarea id="edit-document-care_instructions" autocomplete="off"></textarea>
                
                <label for="edit-document-address">${translate('address')}</label>
                <input type="text" id="edit-document-address" autocomplete="off">
                <label for="edit-document-fear_of_closed_spaces">${translate('fear_of_closed_spaces')}</label>
                <select id="edit-document-fear_of_closed_spaces">
                    <option value="yes">${translate('yes')}</option>
                    <option value="no">${translate('no')}</option>
                </select>
                <label>${translate('consumables')}</label>
                <div id="edit-document-consumables-checklist" class="neoclient-dropdown-check-list">
                    <div class="neoclient-dropdown-field">${translate('select_consumables')}</div>
                    <div class="neoclient-dropdown-list">
                        <label><input type="checkbox" value="consumable1"> ${translate('consumable1')}</label>
                        <label><input type="checkbox" value="consumable2"> ${translate('consumable2')}</label>
                        <label><input type="checkbox" value="consumable3"> ${translate('consumable3')}</label>
                    </div>
                </div>
                <label for="edit-document-pregnancy_status">${translate('pregnancy_status')}</label>
                <select id="edit-document-pregnancy_status">
                    <option value="not_pregnant">${translate('not_pregnant')}</option>
                    <option value="first_trimester">${translate('first_trimester')}</option>
                    <option value="second_trimester">${translate('second_trimester')}</option>
                    <option value="third_trimester">${translate('third_trimester')}</option>
                    <option value="postpartum">${translate('postpartum')}</option>
                </select>
                <label for="edit-document-image">${translate('image')}</label>
                <input type="file" id="edit-document-image" accept="image/*">
                <button type="button" id="edit-document-camera-button" class="neoclient-button">${translate('open_camera')}</button>
                <video id="edit-document-camera-feed" style="display:none; width: 100%; height: auto;"></video>
                <canvas id="edit-document-camera-canvas" style="display:none;"></canvas>
                <input type="hidden" id="edit-document-captured-image">
                <div id="edit-document-history-section">
                    <h4>${translate('document_history')}</h4>
                    <div id="edit-document-history"></div>
                    <button type="button" id="edit-document-add-past-appointment" class="neoclient-button">${translate('add_past_appointment')}</button>
                </div>
                <div class="neoclient-form-actions">
                    <button type="submit" id="edit-document-submit" class="neoclient-button">${translate('save_changes')}</button>
                </div>
            </form>
        `);

        createPopup('confirm-delete-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('confirm_delete_title')}</h3>
            <p id="confirm-delete-message"></p>
            <div class="neoclient-form-actions">
                <button id="confirm-delete-yes" class="neoclient-button">${translate('yes')}</button>
                <button class="neoclient-close-popup neoclient-button">${translate('no')}</button>
            </div>
        `);

        createPopup('new-appointment-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('new_appointment_title')}</h3>
            <form class="neoclient-form">
                <label for="new-appointment-client_name">${translate('client_name')}</label>
                <input type="text" id="new-appointment-client_name" required autocomplete="off">
                <label for="new-appointment-date">${translate('date')}</label>
                <input type="text" id="new-appointment-date" placeholder="${translate('date')}" required autocomplete="off">
                <label for="new-appointment-time">${translate('time')}</label>
                <input type="time" id="new-appointment-time" required autocomplete="off">
                <label for="new-appointment-services">${translate('services')}</label>
                <input type="text" id="new-appointment-services" autocomplete="off">
                <label for="new-appointment-priority">${translate('priority')}</label>
                <select id="new-appointment-priority">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <div class="neoclient-form-actions">
                    <button type="submit" id="new-appointment-submit" class="neoclient-button">${translate('save')}</button>
                </div>
            </form>
        `);

        createPopup('new-document-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('new_document_title')}</h3>
            <form class="neoclient-form">
                <label for="new-document-client_name">${translate('client_name')}</label>
                <input type="text" id="new-document-client_name" required autocomplete="off">
                <div id="new-document-history-section">
                    <h4>${translate('appointment_history')}</h4>
                    <div id="new-document-history"></div>
                    <button type="button" id="new-document-add-past-appointment" class="neoclient-button">${translate('add_past_appointment')}</button>
                </div>
                <div id="new-document-past-appointments-container" style="display: none;">
                    <h4>${translate('past_appointments')}</h4>
                    <div id="new-document-past-appointments"></div>
                </div>
                <label for="new-document-birthdate">${translate('birthdate')}</label>
                <input type="text" id="new-document-birthdate" autocomplete="off">
                <label for="new-document-occupation">${translate('occupation')}</label>
                <input type="text" id="new-document-occupation" autocomplete="off">
                <label for="new-document-client_phone">${translate('client_phone')}</label>
                <input type="text" id="new-document-client_phone" autocomplete="off">
                <label for="new-document-client_email">${translate('client_email')}</label>
                <input type="email" id="new-document-client_email" autocomplete="off">
                <label for="new-document-skin_type">${translate('skin_type')}</label>
                <select id="new-document-skin_type">
                    <option value="normal">${translate('normal')}</option>
                    <option value="oily">${translate('oily')}</option>
                    <option value="dry">${translate('dry')}</option>
                    <option value="combination">${translate('combination')}</option>
                </select>
                <label for="new-document-skin_concerns">${translate('skin_concerns')}</label>
                <textarea id="new-document-skin_concerns" autocomplete="off"></textarea>
                <label for="new-document-sensitivities">${translate('sensitivities')}</label>
                <textarea id="new-document-sensitivities" autocomplete="off"></textarea>
                <label for="new-document-skin_tone">${translate('skin_tone')}</label>
                <select id="new-document-skin_tone">
                    <option value="light">${translate('light')}</option>
                    <option value="medium">${translate('medium_tone')}</option>
                    <option value="dark">${translate('dark')}</option>
                </select>
                <label for="new-document-hydration_level">${translate('hydration_level')}</label>
                <select id="new-document-hydration_level">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <label for="new-document-acne_level">${translate('acne_level')}</label>
                <input type="text" id="new-document-acne_level" autocomplete="off">
                <label for="new-document-sun_exposure">${translate('sun_exposure')}</label>
                <select id="new-document-sun_exposure">
                    <option value="low">${translate('low')}</option>
                    <option value="medium">${translate('medium')}</option>
                    <option value="high">${translate('high')}</option>
                </select>
                <label for="new-document-skincare_routine">${translate('skincare_routine')}</label>
                <textarea id="new-document-skincare_routine" autocomplete="off"></textarea>
                <label for="new-document-purchased_products">${translate('purchased_products')}</label>
                <textarea id="new-document-purchased_products" autocomplete="off"></textarea>
                <label for="new-document-skin_needs">${translate('skin_needs')}</label>
                <textarea id="new-document-skin_needs" autocomplete="off"></textarea>
                <label for="new-document-care_instructions">${translate('care_instructions')}</label>
                <textarea id="new-document-care_instructions" autocomplete="off"></textarea>
                <label for="new-document-notes">${translate('notes')}</label>
                <textarea id="new-document-notes" autocomplete="off"></textarea>
                <label for="new-document-address">${translate('address')}</label>
                <input type="text" id="new-document-address" autocomplete="off">
                <label for="new-document-fear_of_closed_spaces">${translate('fear_of_closed_spaces')}</label>
                <select id="new-document-fear_of_closed_spaces">
                    <option value="yes">${translate('yes')}</option>
                    <option value="no">${translate('no')}</option>
                </select>
                <label>${translate('consumables')}</label>
                <div id="new-document-consumables-checklist" class="neoclient-dropdown-check-list">
                    <div class="neoclient-dropdown-field">${translate('select_consumables')}</div>
                    <div class="neoclient-dropdown-list">
                        <label><input type="checkbox" value="consumable1"> ${translate('consumable1')}</label>
                        <label><input type="checkbox" value="consumable2"> ${translate('consumable2')}</label>
                        <label><input type="checkbox" value="consumable3"> ${translate('consumable3')}</label>
                    </div>
                </div>
                <label for="new-document-pregnancy_status">${translate('pregnancy_status')}</label>
                <select id="new-document-pregnancy_status">
                    <option value="not_pregnant">${translate('not_pregnant')}</option>
                    <option value="first_trimester">${translate('first_trimester')}</option>
                    <option value="second_trimester">${translate('second_trimester')}</option>
                    <option value="third_trimester">${translate('third_trimester')}</option>
                    <option value="postpartum">${translate('postpartum')}</option>
                </select>
                <label for="new-document-image">${translate('image')}</label>
                <input type="file" id="new-document-image" accept="image/*" autocomplete="off">
                <button type="button" id="new-document-camera-button" class="neoclient-button">${translate('open_camera')}</button>
                <video id="new-document-camera-feed" style="display:none; width: 100%; height: auto;"></video>
                <canvas id="new-document-camera-canvas" style="display:none;"></canvas>
                <input type="hidden" id="new-document-captured-image">
                <div class="neoclient-form-actions">
                    <button type="submit" id="new-document-submit" class="neoclient-button">${translate('save')}</button>
                </div>
            </form>
        `);

        createPopup('confirm-client-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('confirm_client_title')}</h3>
            <p>Is the client <span id="confirm-client-name"></span> the same as the existing client?</p>
            <input type="hidden" id="confirm-client-appointment-id">
            <input type="hidden" id="confirm-client-existing-doc-id">
            <input type="hidden" id="confirm-client-appointment-data">
            <div class="neoclient-form-actions">
                <button id="confirm-client-yes" class="neoclient-button">${translate('yes')}</button>
                <button id="confirm-client-no" class="neoclient-button">${translate('no')}</button>
            </div>
        `);

        createPopup('confirm-returning-client-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('returning_client_title')}</h3>
            <p>A document for <strong id="confirm-returning-client-name"></strong> already exists. Do you want to add this appointment to this client's document?</p>
            <div class="popup-buttons">
                <button id="confirm-returning-client-yes" class="button">${translate('yes_add_to_document')}</button>
                <button id="confirm-returning-client-no" class="button button-secondary">${translate('no_create_new_document')}</button>
            </div>
        `);

        createPopup('edit-history-item-popup', `
            <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
            <h3>${translate('edit_history_item_title')}</h3>
            <form class="neoclient-form" id="edit-history-item-form">
                <input type="hidden" id="edit-history-item-doc-id">
                <input type="hidden" id="edit-history-item-index">
                <label for="edit-history-item-date">${translate('date')}</label>
                <input type="text" id="edit-history-item-date" placeholder="${translate('date')}" required autocomplete="off">
                <label for="edit-history-item-time">${translate('time')}</label>
                <input type="time" id="edit-history-item-time" required autocomplete="off">
                <label for="edit-history-item-services">${translate('services')}</label>
                <input type="text" id="edit-history-item-services" autocomplete="off">
                <label for="edit-history-item-status">${translate('status')}</label>
                <select id="edit-history-item-status">
                    <option value="pending">${translate('pending')}</option>
                    <option value="completed">${translate('completed')}</option>
                    <option value="cancelled">${translate('cancelled')}</option>
                </select>
                <label for="edit-history-item-amount">${translate('amount')}</label>
                <input type="number" id="edit-history-item-amount" min="0" autocomplete="off">
                <label for="edit-history-item-notes">${translate('notes')}</label>
                <textarea id="edit-history-item-notes" autocomplete="off"></textarea>
                <div class="neoclient-form-actions">
                    <button type="submit" id="edit-history-item-submit" class="neoclient-button">${translate('save_changes')}</button>
                </div>
            </form>
        `);

        createPopup('view-appointment-popup', `
            <div class="neoclient-popup-content">
                <div class="neoclient-popup-actions">
                    <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                    <div class="neoclient-action-buttons"></div>
                </div>
                <div class="view-content"></div>
            </div>
        `);

        createPopup('view-document-popup', `
            <div class="neoclient-popup-content">
                <div class="neoclient-popup-actions">
                    <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                    <div class="neoclient-action-buttons"></div>
                </div>
                <div class="view-content"></div>

                </div>
            </div>
        `);
    }


    const formDrafts = {};
    function saveFormDraft(popupId) {
        const $form = $(`#${popupId} .neoclient-form`);
        if (!$form.length) return;
        formDrafts[popupId] = {};
        $form.find('input, textarea, select').not('[type="file"]').each(function() {
            const $this = $(this);
            const id = $this.attr('id');

            if ($this.is('input[type="checkbox"]') && $this.closest('.neoclient-dropdown-check-list').length) {
                // This is a checkbox within a custom dropdown, handle it separately
                // The actual value is stored in a hidden input with the same data-target-input
                // We need to ensure the hidden input's value is correctly updated before saving
                // This part should ideally be handled by the dropdown's own change listener
                // For now, we'll just save the value of the hidden input if it exists
                const targetInputId = $this.closest('.neoclient-dropdown-check-list').data('target-input');
                if (targetInputId) {
                    const hiddenInput = $(`#${popupId} #${popupId.replace('-popup', '')}-${targetInputId}`);
                    if (hiddenInput.length) {
                        formDrafts[popupId][hiddenInput.attr('id')] = hiddenInput.val();
                    }
                }
            } else if ($this.is('input[type="checkbox"]')) {
                formDrafts[popupId][id] = $this.prop('checked');
            } else if ($this.is('input[type="radio"]')) {
                if ($this.is(':checked')) {
                    formDrafts[popupId][id] = $this.val();
                }
            } else {
                formDrafts[popupId][id] = $this.val();
            }
        });

        // Additionally, for the custom dropdowns, ensure their hidden inputs are captured
        $form.find('.neoclient-dropdown-check-list').each(function() {
            const $checklist = $(this);
            const targetInputName = $checklist.data('target-input');
            if (targetInputName) {
                const hiddenInputId = `${popupId.replace('-popup', '')}-${targetInputName}`;
                const selectedValues = [];
                $checklist.find('input[type="checkbox"]:checked').each(function() {
                    selectedValues.push($(this).val());
                });
                formDrafts[popupId][hiddenInputId] = JSON.stringify(selectedValues);
            }
        });
        debugLog(`Form draft saved: ${popupId}`);
    }

    function loadFormDraft(popupId) {
        if (formDrafts[popupId]) {
            Object.entries(formDrafts[popupId]).forEach(([id, value]) => {
                const $element = $(`#${id}`);
                if ($element.is('input[type="checkbox"]')) {
                    $element.prop('checked', value);
                } else if ($element.is('input[type="radio"]')) {
                    $(`input[name="${$element.attr('name')}"][value="${value}"]`).prop('checked', true);
                } else {
                    $element.val(value);
                }
            });

            // Handle custom dropdown checkboxes for consumables and acne_prone_areas
            const $form = $(`#${popupId} .neoclient-form`);
            $form.find('.neoclient-dropdown-check-list').each(function() {
                const $checklist = $(this);
                const targetInputName = $checklist.data('target-input');
                if (targetInputName) {
                    const hiddenInputId = `${popupId.replace('-popup', '')}-${targetInputName}`;
                    const storedValue = formDrafts[popupId][hiddenInputId];
                    if (storedValue) {
                        try {
                            const selectedValues = JSON.parse(storedValue);
                            $checklist.find('input[type="checkbox"]').prop('checked', false); // Uncheck all first
                            selectedValues.forEach(val => {
                                $checklist.find(`input[type="checkbox"][value="${val}"]`).prop('checked', true);
                            });
                            const selectedTexts = selectedValues.map(val => $checklist.find(`input[type="checkbox"][value="${val}"]`).next('label').text());
                            $checklist.find('.neoclient-dropdown-field').text(selectedTexts.length > 0 ? selectedTexts.join(', ') : 'Select...');
                        } catch (e) {
                            console.error(`Error parsing stored value for ${hiddenInputId}:`, e);
                        }
                    }
                }
            });
            debugLog(`Form draft loaded: ${popupId}`);
        }
    }


    function initApp() {
        debugLog('Initializing NeoClient v5');
        applyTranslations();
        initPopups();
        setupEventListeners();
        if (config.isLoggedIn) {
            loadFormData();
            checkThemeStyle();
            const lastTab = localStorage.getItem('neoclient_active_tab') || 'dashboard';
            switchTab(lastTab);
            showNotification('Welcome to NeoClient', 'success');
        } else {
            initializeLoginForm();
        }
    }


    $(document).ready(function() {
        initApp();
    });


    function applyTranslations() {
        $('[data-lang-key]').each(function() {
            $(this).text(translate($(this).data('lang-key')));
        });
    }


    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            debugLog('Page was restored from BFCache.');
            initApp();
        }
    });

    window.addEventListener('pagehide', function(event) {
        if (event.persisted) {
            debugLog('Page is being saved to BFCache.');
        }
    });


    function initializeCharts() {
        loadDashboard();
    }

    function loadFormData() {
        loadDashboard();
        loadAppointments();
        loadDocuments();
        loadProfile();
        loadChartJs().then(() => {
            console.log('Type of Chart before initializeCharts:', typeof Chart);
            initializeCharts();
        });
    }


    function setupEventListeners() {
        // Click handler for viewing details
        $(document).on('click', '.view-booking-details', function() {
            var bookingId = $(this).closest('.neoclient-list-item').data('booking-id');
            // Fetch details via AJAX if needed
            // Show popup with details and buttons
            var popupHtml = `
                <div id="booking-popup" class="neoclient-popup">
                    <!-- Details here -->
                    <button class="confirm-booking">Confirm</button>
                    <button class="cancel-booking">Cancel</button>
                </div>
            `;
            $('body').append(popupHtml);
        });

        // Confirm button handler
        $(document).on('click', '.confirm-booking', function() {
            var bookingId = $(this).closest('.neoclient-list-item').data('booking-id');
            $.post(neoclient_data.ajax_url, { action: 'neoclient_confirm_booking', booking_id: bookingId, nonce: neoclient_data.nonce }, function(response) {
                if (response.success) {
                    alert('Appointment confirmed.');
                    $('#booking-popup').remove();
                }
            });
        });

        // Cancel button handler
        $(document).on('click', '.cancel-booking', function() {
            var bookingId = $(this).closest('.neoclient-list-item').data('booking-id');
            $.post(neoclient_data.ajax_url, { action: 'neoclient_cancel_booking', booking_id: bookingId, nonce: neoclient_data.nonce }, function(response) {
                if (response.success) {
                    alert('Appointment canceled.');
                    $('#booking-popup').remove();
                }
            });
        });

        $('#neoclient-show-password').on('change', function() {
            $('#neoclient-login-password').attr('type', this.checked ? 'text' : 'password');
        });

        $('body').on('click', '[data-popup]', function(e) {
            e.preventDefault();
            openPopup($(this).data('popup'), $(this).data('id'));
        });

        // Camera functionality
        let currentStream;

        function stopCamera() {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
                currentStream = null;
            }
        }

        async function startCamera(videoId, canvasId, capturedInputId) {
            stopCamera(); // Stop any existing camera stream
            const video = document.getElementById(videoId);
            const canvas = document.getElementById(canvasId);
            const capturedInput = document.getElementById(capturedInputId);
            const context = canvas.getContext('2d');

            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = currentStream;
                video.style.display = 'block';
                video.play();

                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                };

                // Add a click listener to the video to capture image
                video.onclick = () => {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = canvas.toDataURL('image/png');
                    capturedInput.value = imageData;
                    video.style.display = 'none'; // Hide video after capture
                    stopCamera(); // Stop camera after capture
                };

            } catch (err) {
                console.error("Error accessing camera: ", err);
                showNotification(translate('camera_access_error'), 'error');
            }
        }

        $(document).on('click', '#new-document-camera-button', function() {
            startCamera('new-document-camera-feed', 'new-document-camera-canvas', 'new-document-captured-image');
        });

        $(document).on('click', '#edit-document-camera-button', function() {
            startCamera('edit-document-camera-feed', 'edit-document-camera-canvas', 'edit-document-captured-image');
        });

        // When popups are closed, stop the camera
        $(document).on('click', '.neoclient-close-popup, .neoclient-popup-close', function(e) {
            e.preventDefault();
            closePopup($(this).closest('.neoclient-popup').attr('id'));
        });

        $('body').on('click', '.neoclient-popup', function(e) {
            if (e.target.classList.contains('neoclient-popup')) {
                closePopup(e.target.id);
            }
        });

        $('.neoclient-nav-item').on('click', function() {
            const tab = $(this).data('tab');
            switchTab(tab);
        });

        $('#neoclient-login-submit').on('click', handleLogin);
        $('#neoclient-register-submit').on('click', handleRegister);
        $('#neoclient-forgot-submit').on('click', handleForgotPassword);
        $('#neoclient-logout').on('click', handleLogout);
        $('body').on('click', '#new-appointment-submit', handleNewAppointment);
        $('body').off('click', '#edit-appointment-submit').on('click', '#edit-appointment-submit', handleEditAppointment);
        $('body').on('click', '#new-document-submit', handleNewDocument);
        $('body').on('click', '#edit-document-submit', handleEditDocument);
        $('#profile-save').on('click', handleProfileUpdate);
        $('#change-password-submit').on('click', handleChangePassword);
        $('body').on('click', '#confirm-client-yes, #confirm-client-no', handleConfirmClient);
        $('body').on('click', '#confirm-delete-yes', handleConfirmDelete);
        $('body').on('click', '#confirm-returning-client-yes', handleConfirmReturningClientYes);
        $('body').on('click', '#confirm-returning-client-no', handleConfirmReturningClientNo);
        $('body').on('click', '.history-edit', handleHistoryEdit);
        $('body').on('click', '.history-delete', handleHistoryDelete);
        $('body').on('submit', '#edit-history-item-form', handleEditHistoryItem);
        $('body').on('click', '.add-past-appointment-btn', handleAddPastAppointment);
        $('body').on('click', '#new-document-add-past-appointment', handleAddPastAppointmentToNewDocument);

        $('#appointment-filter-status, #appointment-filter-priority').on('change', loadAppointments);
        $('#document-filter').on('input', debounce(loadDocuments, 300));
        $('#report-filter-period').on('change', loadReports);

        $('#profile-theme-style').on('change', updateThemeStyle);

        $('.neoclient-backup').on('click', function(e) {
            e.preventDefault();
            handleBackup();
        });
        $('#neoclient-restore').on('change', function(e) {
            e.preventDefault();
            handleRestore(e);
        });

        $('body').on('click', '.neoclient-item-info, .neoclient-action-icon.view', function(e) {
            e.preventDefault();
            const popup = $(this).data('popup');
            const id = $(this).data('id') || $(this).closest('.neoclient-list-item').data('id');
            if (popup && id) {
                const viewPopupName = popup.replace('edit-', 'view-');
                openPopup(viewPopupName, id);
            }
        });

        $('body').on('click', '.neoclient-action-icon.edit, .neoclient-action-button.edit', function(e) {
            e.preventDefault();
            const popup = $(this).data('popup');
            const id = $(this).data('id') || $(this).closest('.neoclient-list-item').data('id');
            debugLog(`Click handler: popup=${popup}, id=${id}`);
            if (popup && id) openEditPopup(popup, id);
        });

        $('body').on('click', '.neoclient-action-icon.delete, .neoclient-action-button.delete', function(e) {
            e.preventDefault();
            const id = $(this).data('id') || $(this).closest('.neoclient-list-item').data('id');
            const type = $(this).data('type') || ($(this).closest('.neoclient-list').attr('id') === 'appointment-list' ? 'appointment' : 'document');
            openDeleteConfirmPopup(type, id);
        });

        $('body').on('blur', '#new-document-client_name', handleClientNameBlur);

        // Handle click to copy referral code
        $('body').on('click', '#neoclient-referral-code-display', function() {
            const referralCode = $(this).text();
            navigator.clipboard.writeText(referralCode).then(() => {
                showNotification('کد دعوت کپی شد!', 'success');
            }).catch(err => {
                console.error('Failed to copy referral code: ', err);
                showNotification('خطا در کپی کد دعوت.', 'error');
            });
        });

        $('body').on('click', '.neoclient-action-icon.confirm', function() {
            const appointmentId = $(this).data('id');
            sendAjaxRequest('neoclient_confirm_booking', { booking_id: appointmentId }, response => {
                showNotification(response.message, 'success');
                loadAppointments();
                loadDashboard();
            });
        });

        $('body').on('click', '.neoclient-action-icon.cancel', function() {
            const appointmentId = $(this).data('id');
            sendAjaxRequest('neoclient_cancel_booking', { booking_id: appointmentId }, response => {
                showNotification(response.message, 'success');
                loadAppointments();
                loadDashboard();
            });
        });
    }


    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    let currentOpenPopupId = null;
    let popupLock = false;

    function closePopup(popupId) {
        return new Promise((resolve) => {
            const $popup = $(`#${popupId}`);
            if ($popup.length && $popup.is(':visible')) {
                saveFormDraft(popupId);
                $popup.stop(true, true).animate(
                    { opacity: 0 },
                    {
                        duration: 300,
                        start: () => {
                            $popup.css('pointer-events', 'none');
                        },
                        complete: () => {
                            $popup.css({ display: 'none', opacity: 1, 'pointer-events': 'auto' });
                            if (currentOpenPopupId === popupId) {
                                currentOpenPopupId = null;
                            }
                            if (popupId === 'confirm-returning-client-popup') {
                                closePopup('new-appointment-popup');
                            }
                            resolve();
                        }
                    }
                );
            } else {
                if (currentOpenPopupId === popupId) {
                    currentOpenPopupId = null;
                }
                if (popupId === 'confirm-returning-client-popup') {
                    closePopup('new-appointment-popup');
                }
                resolve();
            }
        });
    }

    function openPopup(popupName, itemId = null) {
        if (popupLock) return;
        popupLock = true;
        const popupId = popupName.endsWith('-popup') ? popupName : popupName + '-popup';

        if (popupId === 'new-document-popup' && currentOpenPopupId === 'confirm-returning-client-popup') {
            popupLock = false;
            return;
        }

        Promise.resolve().then(() => {
            if (currentOpenPopupId && currentOpenPopupId !== popupId) {
                return closePopup(currentOpenPopupId);
            }
            return Promise.resolve();
        }).then(() => {
            const $popup = $(`#${popupId}`);
            if ($popup.length) {
                if ($popup.is(':visible')) {
                    popupLock = false;
                    return;
                }
                currentOpenPopupId = popupId;
                // Reset scroll position to top
                // Reset scroll position of popup content to the top
                // Adding a small delay to ensure content is rendered before scrolling
                setTimeout(() => {
                    $popup.find('.neoclient-popup-content').scrollTop(0);
                }, 50);
                if (popupId === 'new-appointment-popup' || popupId === 'new-document-popup') {
                    // For new popups, clear the form
                    clearForm(popupId);
                    loadFormDraft(popupId); // Moved here

                    // Initialize neoclient-dropdown-check-list for new document popups
                    if (popupId === 'new-document-popup') {
                        // Clear and reset for new document popups
                        $('#new-document-consumables').val('[]');
                        $('#new-document-acne_prone_areas').val('[]');

                        // Reset consumables checkboxes and display
                        const $newDocConsumablesChecklist = $('.neoclient-dropdown-check-list[data-target-input="consumables"]');
                        $newDocConsumablesChecklist.find('input[type="checkbox"]').prop('checked', false);
                        $newDocConsumablesChecklist.find('.neoclient-dropdown-field').text('انتخاب کنید...');

                        // Reset acne_prone_areas checkboxes and display
                        const $newDocAcneProneAreasChecklist = $('.neoclient-dropdown-check-list[data-target-input="acne_prone_areas"]');
                        $newDocAcneProneAreasChecklist.find('input[type="checkbox"]').prop('checked', false);
                        $newDocAcneProneAreasChecklist.find('.neoclient-dropdown-field').text('انتخاب کنید...');
                    }
                } else if (popupId.startsWith('edit-') && itemId) {
                    // For edit popups, open with item data
                    openEditPopup(popupId, itemId);
                } else if (popupId.startsWith('view-') && itemId) {
                    // For view popups, open with item data
                    openViewPopup(popupId, itemId);
                } else if (popupId.startsWith('confirm-delete-') && itemId) {
                    // For confirm delete popups
                    openDeleteConfirmPopup(popupId, itemId);
                }

                if (popupId === 'new-appointment-popup' || popupId === 'new-document-popup') {
                    const dateInputId = popupId === 'new-appointment-popup' ? 'new-appointment-date' :
                                       popupId === 'edit-appointment-popup' ? 'edit-appointment-date' :
                                       popupId === 'new-document-popup' ? 'new-document-birthdate' :
                                       popupId === 'edit-document-popup' ? 'edit-document-birthdate' :
                                       'edit-history-item-date';

                    // Initialize Gregorian date pickers with Flatpickr
                    if (dateInputId === 'new-appointment-date' || dateInputId === 'edit-appointment-date' ||
                        dateInputId === 'new-document-birthdate' || dateInputId === 'edit-document-birthdate' ||
                        dateInputId === 'edit-history-item-date' || dateInputId === 'new-doc-past-appointment-date' ||
                        dateInputId === 'past-appointment-date') {
                        const inputElement = $(`#${dateInputId}`);
                        initDatePicker(`#${dateInputId}`).then(fp => {
                            if (fp && !inputElement.val()) {
                                fp.setDate(new Date(), true);
                            }
                        });
                    }
                    // Flatpickr is the only datepicker used now
                }
                if (popupId === 'new-document-popup') {
                    $('#new-document-history').data('history', []);
                    renderNewDocumentHistory([]);
    
                }
                $popup.css({ display: 'flex', opacity: 0 }).stop(true, true).animate(
                    { opacity: 1 },
                    {
                        duration: 300,
                        start: () => {
                            $popup.css('pointer-events', 'auto');
                        },
                        complete: () => {
                            popupLock = false;
                        }
                    }
                );
            } else {
                showNotification(`پاپ آپ "${popupName}" یافت نشد.`, 'error');
                currentOpenPopupId = null;
                popupLock = false;
            }
        });
    }

    function renderNewDocumentHistory(history) {
        const $container = $('#new-document-history');
        $container.empty();
        history.forEach((item, index) => {
            $container.append(`
                <div class="history-item" data-index="${index}">
                    <p>${item.date} - ${item.time} - ${item.services} - ${translate(item.status)} - ${item.amount} - ${item.notes}</p>
                    <button class="neoclient-button edit-history" data-index="${index}">${translate('edit')}</button>
                    <button class="neoclient-button delete-history" data-index="${index}">${translate('delete')}</button>
                </div>
            `);
        });
    }

    $(document).on('click', '#new-document-add-past-appointment', function(e) {
        handleAddPastAppointment(e, 'new-document-popup');
    });

    $(document).on('click', '#new-document-history .edit-history', function() {
        const index = $(this).data('index');
        const history = $('#new-document-history').data('history') || [];
        const item = history[index];
        openEditHistoryItemPopup(item, index, 'new-document-popup');
    });

    $(document).on('click', '#new-document-history .delete-history', function() {
        const index = $(this).data('index');
        let history = $('#new-document-history').data('history') || [];
        history.splice(index, 1);
        $('#new-document-history').data('history', history);
        renderNewDocumentHistory(history);
    });

    // تابع افزودن نوبت گذشته برای پرونده جدید
    function handleAddPastAppointmentToNewDocument() {
        createPopup('add-past-appointment-new-doc-popup', `
            <div class="neoclient-popup-content">
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <h3>${translate('add_past_appointment')}</h3>
                <form id="add-past-appointment-new-doc-form">
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-date">${translate('date')}</label>
                        <input type="text" id="new-doc-past-appointment-date" required autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-time">${translate('time')}</label>
                        <input type="time" id="new-doc-past-appointment-time" required autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-services">${translate('services')}</label>
                        <input type="text" id="new-doc-past-appointment-services" required autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-amount">${translate('amount')}</label>
                        <input type="number" id="new-doc-past-appointment-amount" min="0" autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-notes">${translate('notes')}</label>
                        <textarea id="new-doc-past-appointment-notes" autocomplete="off"></textarea>
                    </div>
                    <div class="neoclient-form-group">
                        <label for="new-doc-past-appointment-status">${translate('status')}</label>
                        <select id="new-doc-past-appointment-status">
                            <option value="completed">${translate('completed')}</option>
                            <option value="cancelled">${translate('cancelled')}</option>
                        </select>
                    </div>
                    <div class="neoclient-form-actions">
                        <button type="submit" class="neoclient-button">${translate('add')}</button>
                    </div>
                </form>
            </div>
        `);
        
        // Initialize Gregorian date picker and set to today
        initDatePicker('#new-doc-past-appointment-date').then(fp => {
            if (fp) fp.setDate(new Date(), true);
        });
        
        openPopup('add-past-appointment-new-doc');

        $('#add-past-appointment-new-doc-form').on('submit', function(e) {
            e.preventDefault();
            const appointmentData = {
                date: $('#new-doc-past-appointment-date').val(),
                time: $('#new-doc-past-appointment-time').val(),
                services: $('#new-doc-past-appointment-services').val(),
                status: $('#new-doc-past-appointment-status').val(),
                amount: $('#new-doc-past-appointment-amount').val(),
                notes: $('#new-doc-past-appointment-notes').val(),
            };

            // افزودن نوبت به تاریخچه محلی
            const history = $('#new-document-history').data('history') || [];
            history.push(appointmentData);
            $('#new-document-history').data('history', history);
            renderNewDocumentHistory(history);
            
            showNotification(translate('appointment_added_to_history'), 'success');
            closePopup('add-past-appointment-new-doc-popup');
        });
    }


    function switchTab(tabId) {
        if (!tabId) {
            debugLog('Invalid tab ID');
            return;
        }
        $('.neoclient-tab-content').removeClass('active').hide();
        $(`#${tabId}`).addClass('active').fadeIn(300);
        $('.neoclient-nav-item').removeClass('active');
        $(`.neoclient-nav-item[data-tab="${tabId}"]`).addClass('active');
        localStorage.setItem('neoclient_active_tab', tabId);
        debugLog(`Switched to tab: ${tabId}`);

        if (tabId === 'statistics') {
            loadReports();
        }


    }


    function sendAjaxRequest(action, data, successCallback, errorCallback = () => {}) {
        const formData = new FormData();
        formData.append('action', 'neoclient_action');
        formData.append('neoclient_action', action);
        formData.append('nonce', neoclient_data.nonce);
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));

        $.ajax({
            url: neoclient_data.ajax_url,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: response => {
                if (response.success) {
                    console.log('sendAjaxRequest success:', action, data, response);
                    successCallback(response.data);
                } else {
                    let errorMessage = (response.data && response.data.message) || translate(`error_${action}`) || translate('server_error');
                console.error('sendAjaxRequest error response:', response);
                    if (action === 'new_appointment' && response.data.message.includes('لطفاً به پلن Pro ارتقا دهید')) {
                        errorMessage = translate('error_new_appointment');
                    }
                    showNotification(errorMessage, 'error', (response.data && response.data.details) || '');
                    console.error('sendAjaxRequest error details:', (response.data && response.data.details));
                    errorCallback(response.data);
                }
            },
            error: xhr => {
                console.error('sendAjaxRequest error:', action, data, xhr);
                let errorMessage = translate('server_error');
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse && errorResponse.data && errorResponse.data.message) {
                        errorMessage = errorResponse.data.message;
                        if (action === 'new_appointment' && errorMessage.includes('لطفاً به پلن Pro ارتقا دهید')) {
                            errorMessage = translate('error_new_appointment');
                        }
                    }
                } catch (e) {
                    debugLog(`Failed to parse error response as JSON: ${e}`);
                }
                showNotification(errorMessage, 'error', `Status: ${xhr.status}`);
                debugLog(`AJAX error for ${action}: Status ${xhr.status} - ${xhr.statusText}. Response: ${xhr.responseText}`);
                errorCallback(xhr);
            }
        });
    }


    function initializeLoginForm() {
        $('#neoclient-login-username').focus();
        $('#neoclient-login-form').addClass('neoclient-login-form');
        debugLog('Login form initialized');
    }


    function handleLogin(e) {
        e.preventDefault();
        const data = {
            username: $('#neoclient-login-username').val(),
            password: $('#neoclient-login-password').val(),
            remember: $('#neoclient-remember-me').is(':checked')
        };
        sendAjaxRequest('login', data, () => window.location.reload());
    }


    function handleRegister(e) {
        e.preventDefault();
        const data = {
            first_name: $('#neoclient-register-first_name').val(),
            last_name: $('#neoclient-register-last_name').val(),
            email: $('#neoclient-register-email').val(),
            phone: $('#neoclient-register-phone').val(),
            password: $('#neoclient-register-password').val(),
            occupation: $('#neoclient-register-occupation').val(),
referral_code: $('#neoclient-register-referral_code').val()
        };
        sendAjaxRequest('register', data, () => {
            showNotification(translate('registration_success'), 'success');
            setTimeout(() => window.location.reload(), 1500); // Reload after a short delay
        }, (errorData) => {
            // Error handling is already done in sendAjaxRequest, but we can add specific logic here if needed
            console.error('Registration failed:', errorData);
        });
    }


    function handleForgotPassword(e) {
        e.preventDefault();
        const data = {
            email: $('#neoclient-forgot-email').val(),
            new_password: $('#neoclient-forgot-new-password').val(),
            confirm_password: $('#neoclient-forgot-confirm-password').val()
        };
        sendAjaxRequest('forgot_password', data, data => {
            showNotification(data.message, 'success');
            closePopup('forgot-password-popup');
        });
    }


    function handleLogout(e) {
        e.preventDefault();
        sendAjaxRequest('logout', {}, () => window.location.reload());
    }


    function loadDashboard() {
        sendAjaxRequest('get_dashboard_stats', {}, function(response) {
            debugLog('get_dashboard_stats response:', response);
            if (response.success) {
                let appointments = response.data.appointments || [];

                appointments.sort((a, b) => {
                    const dateTimeA = parseGregorianDateTime(a.date, a.time);
                    const dateTimeB = parseGregorianDateTime(b.date, b.time);
                    return (dateTimeA ? dateTimeA.getTime() : 0) - (dateTimeB ? dateTimeB.getTime() : 0);
                });

                const documents = response.data.documents || [];
                // Filter pending appointments
                const pending = appointments.filter(a => a.status === 'pending').slice(0, 5);
                const pendingBookings = response.data.pending_bookings || [];
                debugLog('Pending appointments:', pending);
                debugLog('Pending bookings:', pendingBookings);
                let pendingHtml = '';

                // Render pending appointments
                if (pending.length > 0) {
                    pendingHtml += renderAppointments(pending);
                }

                // Render pending bookings
                if (pendingBookings.length > 0) {
                    pendingHtml += pendingBookings.map(booking => {
                        const formattedDate = booking.date ? booking.date.replace(/-/g, '/') : 'Unknown';
                        const formattedTime = booking.time ? booking.time : 'Unknown';
                        return `
                            <div class="neoclient-list-item" data-id="${booking.id}">
                                <div class="neoclient-list-item-main">
                                    <p><strong>${translate('client_name')}:</strong> ${booking.name || 'Unknown'}</p>
                                    <p><strong>${translate('date')}:</strong> ${formattedDate}</p>
                                    <p><strong>${translate('time')}:</strong> ${formattedTime}</p>
                                    <p><strong>${translate('services')}:</strong> ${booking.service || 'Unknown'}</p>
                                </div>
                                <div class="neoclient-list-item-actions">
                                    <span class="neoclient-action-icon confirm-booking" data-id="${booking.id}" title="${translate('confirm')}"></span>
                                    <span class="neoclient-action-icon delete-booking" data-id="${booking.id}" title="${translate('delete')}"></span>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                debugLog('Final pending HTML:', pendingHtml);

                // Set the final HTML content
                if (pendingHtml) {
                    $('#pending-appointments').html(pendingHtml);
                } else {
                    $('#pending-appointments').html(`<p>${translate('no_pending_appointments')}</p>`);
                }

                $('#recent-documents').html(renderDocuments(documents.slice(0, 5)));
                $('#total-clients').text(new Set(appointments.map(a => a.client_name)).size);
                $('#monthly-appointments').text(appointments.filter(a => new Date(a.date).getMonth() === new Date().getMonth()).length);
                $('#monthly-revenue').text(appointments.filter(a => a.status === 'completed' && new Date(a.date).getMonth() === new Date().getMonth()).reduce((sum, a) => sum + parseFloat(a.amount || 0), 0));

                // Update pending activities count to include both pending appointments and bookings
                const pendingCount = pending.length + pendingBookings.length;
                $('#pending-activities').text(pendingCount);
                
                debugLog('Data for dashboard charts - appointments:', appointments);
                debugLog('Data for dashboard charts - documents:', documents);
                loadChartJs().then(() => {
                    renderCharts(appointments, documents);
                }).catch(err => {
                    debugLog(`Chart rendering failed: ${err.message}`);
                });
            }
        });
    }


    function loadProfile() {
        sendAjaxRequest('get_user_profile', {}, data => {

            $('#profile-first_name').val(data.first_name || '');
            $('#profile-last_name').val(data.last_name || '');
            $('#profile-email').val(data.email || '');
            $('#profile-phone').val(data.phone || '');
            $('#profile-clinic_name').val(data.clinic_name || '');
            $('#profile-city').val(data.city || '');
$('#profile-theme-style').val(data.theme_style || 'default');
$('#profile-referral-code').val(data.referral_code || '');

        }, () => {
            showNotification(translate('error_load_profile'), 'error');
        });
    }


    function handleProfileUpdate(e) {
        e.preventDefault();
        const data = {
            first_name: $('#profile-first_name').val(),
            last_name: $('#profile-last_name').val(),
            email: $('#profile-email').val(),
            phone: $('#profile-phone').val(),
            clinic_name: $('#profile-clinic_name').val(),
            city: $('#profile-city').val(),
            theme_style: $('#profile-theme-style').val()
        };
        sendAjaxRequest('update_user_profile', data, response => {
            showNotification(response.message, 'success');
        }, (error) => {
            const errorMessage = error.responseJSON && error.responseJSON.data ? error.responseJSON.data : translate('error_update_profile');
            showNotification(errorMessage, 'error');
        });
    }


    function handleChangePassword(e) {
        e.preventDefault();
        const data = {
            new_password: $('#change-password-new').val(),
            confirm_password: $('#change-password-confirm').val()
        };
        sendAjaxRequest('change_password', data, data => {
            showNotification(data.message, 'success');
            closePopup('change-password-popup');
        });
    }


    function loadAppointments() {
        const status = $('#appointment-filter-status').val() || '';
        const priority = $('#appointment-filter-priority').val() || '';
        const search = $('#appointment-filter').val().toLowerCase() || '';
        sendAjaxRequest('get_appointments', { status, priority }, data => {
            let appointments = data.appointments || [];

            appointments.sort((a, b) => {
                const dateTimeA = parseGregorianDateTime(a.date, a.time);
                const dateTimeB = parseGregorianDateTime(b.date, b.time);
                return (dateTimeA ? dateTimeA.getTime() : 0) - (dateTimeB ? dateTimeB.getTime() : 0);
            });

            if (search) {
                appointments = appointments.filter(a =>
                    (a.client_name || '').toLowerCase().includes(search) ||
                    (a.services || '').toLowerCase().includes(search)
                );
            }
            appointments.sort((a, b) => {
                const dateTimeA = new Date(`${a.date}T${a.time}`);
                const dateTimeB = new Date(`${b.date}T${b.time}`);
                return dateTimeA.getTime() - dateTimeB.getTime();
            });
            $('#appointment-list').html(renderAppointments(appointments));
        });
    }


    function renderAppointments(appointments) {
    if (!appointments.length) return `<p>${translate('no_data')}</p>`;
    return appointments.map(a => {
        const formattedDate = a.date ? a.date.replace(/-/g, '/') : 'Unknown';
        const formattedTime = a.time ? a.time : 'Unknown';
        const services = a.services || 'Unknown';
        const priority = a.priority && translate(a.priority) ? translate(a.priority) : 'Unknown';
        const status = a.status && translate(a.status) ? translate(a.status) : 'Unknown';

        let actions = `
            <span class="neoclient-action-icon edit" data-popup="edit-appointment" data-id="${a.id}" title="${translate('edit')}"></span>
            <span class="neoclient-action-icon delete" data-type="appointment" data-id="${a.id}" title="${translate('delete')}"></span>
        `;
        if (a.status === 'pending') {
            actions += `<span class="neoclient-action-icon confirm" data-id="${a.id}" title="Confirm appointment"></span>`;
        }
        actions += `<span class="neoclient-action-icon cancel" data-id="${a.id}" title="Cancel appointment"></span>`;

        return `
            <div class="neoclient-list-item" data-id="${a.id}" data-popup="edit-appointment">
                <div class="neoclient-item-info">
                    <strong class="neoclient-client-name-link" data-id="${a.id}" data-popup="edit-appointment">${a.client_name || 'Unknown'}</strong><br>
                    ${formattedDate} - ${formattedTime}<br>
                    ${translate('services')}: ${services}<br>
                    ${translate('priority')}: ${priority}<br>
                    ${translate('status')}: ${status}
                </div>
                <div class="neoclient-item-actions">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}


    function loadDocuments() {
        const filterElement = document.getElementById('document-filter');
        const search = filterElement ? filterElement.value.toLowerCase() : '';
        sendAjaxRequest('get_documents', {}, data => {
            let documents = data.documents || [];
            if (search) {
                documents = documents.filter(doc =>
                    (doc.client_name || '').toLowerCase().includes(search)
                );
            }
            $('#document-list').html(renderDocuments(documents));
            documents.forEach(doc => {
                if (doc.client_name) {
                    sendAjaxRequest('get_appointments', { client_name: doc.client_name }, apptData => {
                        const appointments = apptData.appointments || [];
                        $(`#document-appointments-list-${doc.id}`).html(renderAppointmentsForDocument(appointments, doc.id));
                        // Add event listeners for edit and delete icons within the document's appointment list
                        $(`#document-appointments-list-${doc.id}`).find('.neoclient-action-icon.edit').on('click', function() {
                            const appointmentId = $(this).data('id');
                            openPopup('edit-appointment-popup', appointmentId);
                        });
                        $(`#document-appointments-list-${doc.id}`).find('.neoclient-action-icon.delete').on('click', function() {
                            const appointmentId = $(this).data('id');
                            const appointmentType = $(this).data('type');
                            openPopup('confirm-delete-popup', { id: appointmentId, type: appointmentType });
                        });
                    });
                }
            });
        });
    }

    function renderAppointmentsForDocument(appointments, docId) {
        if (!appointments.length) return `<p>${translate('no_data')}</p>`;
        return appointments.map(a => {
            const formattedDate = a.date ? a.date.replace(/-/g, '/') : 'Unknown';
            const formattedTime = a.time ? a.time : 'Unknown';
            const services = a.services || 'Unknown';
            const priority = a.priority && translate(a.priority) ? translate(a.priority) : 'Unknown';
            const status = a.status && translate(a.status) ? translate(a.status) : 'Unknown';

            return `
                <div class="neoclient-list-item neoclient-appointment-item" data-id="${a.id}" data-doc-id="${docId}">
                    <div class="neoclient-item-info">
                        <strong>${formattedDate} - ${formattedTime}</strong><br>
                        ${translate('services')}: ${services}<br>
                        ${translate('priority')}: ${priority}<br>
                        ${translate('status')}: ${status}
                    </div>
                    <div class="neoclient-item-actions">
                        <span class="neoclient-action-icon edit" data-popup="edit-appointment" data-id="${a.id}" title="${translate('edit')}"></span>
                        <span class="neoclient-action-icon delete" data-type="appointment" data-id="${a.id}" title="${translate('delete')}"></span>
                    </div>
                </div>
            `;
        }).join('');
    }


    function renderDocuments(documents) {
        if (!documents.length) return `<p>${translate('no_data')}</p>`;
        return documents.map(d => {
            const skinType = d.skin_type && translate(d.skin_type) ? translate(d.skin_type) : 'Unknown';
            const clientPhone = d.client_phone || 'Unknown';
            const address = d.address || 'Unknown';
            const fearOfClosedSpaces = d.fear_of_closed_spaces ? translate(d.fear_of_closed_spaces) : 'Unknown';
            const consumables = Array.isArray(d.consumables) && d.consumables.length > 0 ? d.consumables.map(c => translate(c)).join(', ') : 'Unknown';
            const pregnancyStatus = d.pregnancy_status ? translate(d.pregnancy_status) : 'Unknown';

            const historyHtml = Array.isArray(d.history) && d.history.length > 0 ? `
                <div class="neoclient-document-history">
                    <h5>${translate('appointment_history')}</h5>
                    ${d.history.map((h, index) => `
                        <div class="neoclient-history-item" data-doc-id="${d.id}" data-history-index="${index}">
                            <span>${h.date} ${h.time}: ${h.services} (${translate(h.status)}) - Amount: ${h.amount ? h.amount.toString() : '0'} - Notes: ${h.notes}</span>
                            <div class="neoclient-item-actions">
                                <span class="neoclient-action-icon edit history-edit" title="${translate('edit')}" data-doc-id="${d.id}" data-history-index="${index}"></span>
                                <span class="neoclient-action-icon delete history-delete" title="${translate('delete')}" data-doc-id="${d.id}" data-history-index="${index}"></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="neoclient-list-item" data-id="${d.id}">
                    <div class="neoclient-item-info">
                        <strong class="neoclient-client-name-link" data-id="${d.id}" data-popup="edit-document">${d.client_name || 'Unknown'}</strong><br>
                        ${translate('birthdate')}: ${d.birthdate ? d.birthdate.replace(/-/g, '/') : 'Unknown'}
                    </div>

                    <div class="neoclient-item-actions">

                        <span class="neoclient-action-icon edit" data-popup="edit-document" data-id="${d.id}" title="${translate('edit')}"></span>
                        <span class="neoclient-action-icon delete" data-type="document" data-id="${d.id}" title="${translate('delete')}"></span>
                    </div>
                </div>
            `;
        }).join('');
    }


    function getAppointments() {
        return new Promise((resolve, reject) => {
            const period = $('#report-filter-period').val() || 'all';
            sendAjaxRequest('get_appointments', { period },
                data => resolve(data.appointments || []),
                error => reject(error)
            );
        });
    }

    function getDocuments() {
        return new Promise((resolve, reject) => {
            const period = $('#report-filter-period').val() || 'all';
            sendAjaxRequest('get_documents', { period },
                data => resolve(data.documents || []),
                error => reject(error)
            );
        });
    }

    function updateStats(appointments, documents) {
        $('#report-total-clients').text(new Set(appointments.map(a => a.client_name)).size);
        $('#report-total-appointments').text(appointments.length);
        $('#report-cancelled-appointments').text(appointments.filter(a => a.status === 'cancelled').length);
        $('#report-total-revenue').text(appointments.filter(a => a.status === 'completed').reduce((sum, a) => sum + parseFloat(a.amount || 0), 0));
    }

    function loadReports() {
        debugLog('loadReports function called.');
        showNotification('Loading reports...', 'info');

        loadChartJs().then(() => {
            Promise.all([getAppointments(), getDocuments()])
                .then(([appointments, documents]) => {
                    debugLog('Data for reports loaded successfully.', {
                        appointments,
                        documents
                    });
                    if (appointments && documents && appointments.length > 0) {
                        renderCharts(appointments, documents);
                        updateStats(appointments, documents);
                        showNotification('Reports loaded successfully.', 'success');
                    } else {
                        $('.neoclient-chart-container').html(`<p>${translate('no_data')}</p>`);
                        showNotification('No data available for reports.', 'info');
                        debugLog('No data available for reports.');
                    }
                })
                .catch(error => {
                    console.error('Error loading reports data:', error);
                    showNotification('Error loading report data.', 'error', error.message);
                    debugLog('Error in loadReports data fetching: ' + error.message);
                });
        }).catch(error => {
            console.error('Error loading Chart.js:', error);
            showNotification('Error loading chart library.', 'error', error.message);
            debugLog('Error in loadReports from loadChartJs: ' + error.message);
        });
    }

    let tempAppointmentData = {};


    function handleNewAppointment(e) {
        e.preventDefault();
        const clientName = $('#new-appointment-client_name').val();
        if (!clientName) {
            showNotification('Client name is required', 'error');
            return;
        }


        

        const appointmentData = {
            client_name: clientName,
            date: $('#new-appointment-date').val(),
            time: $('#new-appointment-time').val(),
            services: $('#new-appointment-services').val(),
            priority: $('#new-appointment-priority').val(),
        };

        tempAppointmentData = appointmentData;
        sendAjaxRequest('new_appointment', appointmentData, response => {
            if (response.confirm_client) {
                $('#confirm-returning-client-name').text(response.client_name);
                $('#confirm-client-appointment-data').val(JSON.stringify(appointmentData));
                $('#confirm-client-existing-doc-id').val(response.doc_id);
                openPopup('confirm-returning-client');
            } 
            
            showNotification(response.message, 'success');
            closePopup('new-appointment-popup');
            clearForm('new-appointment-popup');
                
                loadAppointments();
                loadDashboard();
            
        });
    }


    function handleConfirmReturningClientYes() {
        sendAjaxRequest('add_appointment_to_existing_client', tempAppointmentData, response => {
            showNotification(response.message, 'success');
            closePopup('confirm-returning-client-popup');
            closePopup('new-appointment-popup');
            clearForm('new-appointment-popup');
            loadAppointments();
            loadDocuments();
            loadDashboard();
        });
    }

    function handleConfirmReturningClientNo() {
        const appointmentData = tempAppointmentData; // Get the appointment data
        closePopup('confirm-returning-client-popup');

        // Send AJAX request to create a new document with a numbered client name
        sendAjaxRequest('create_numbered_document_with_appointment', {
            appointment: appointmentData,
            original_client_name: appointmentData.client_name // Pass original client name
        }, response => {
            showNotification(response.message, 'success');
            closePopup('edit-appointment-popup'); // Close the edit appointment popup
            loadAppointments();
            loadDocuments();
            loadDashboard();
        });
    }


    function handleEditAppointment(e) {
        e.preventDefault();
        const data = {
            appointment_id: $('#edit-appointment-id').val(),
            client_name: $('#edit-appointment-client_name').val(),
            date: $('#edit-appointment-date').val(),
            time: $('#edit-appointment-time').val(),
            services: $('#edit-appointment-services').val(),
            priority: $('#edit-appointment-priority').val(),
            status: $('#edit-appointment-status').val(),
            amount: $('#edit-appointment-amount').val(),
            notes: $('#edit-appointment-notes').val(),
            append_to_document: $('#edit-appointment-append_to_document').is(':checked'),
            document_id: $('#edit-appointment-document_id').val()
        };

        const shouldUpdateDocumentHistory = data.append_to_document && (data.status === 'completed' || data.status === 'cancelled');

        if (shouldUpdateDocumentHistory) {
            console.log('handleEditAppointment: Status is completed or cancelled. Data:', data);
            sendAjaxRequest('check_client_document_existence', { client_name: data.client_name }, response => {
                console.log('handleEditAppointment: check_client_document_existence response:', response);
                if (data.document_id) {
                    sendAjaxRequest('add_appointment_to_history', { doc_id: data.document_id, appointment: data }, response => {
                        showNotification(response.message, 'success');
                        closePopup('edit-appointment-popup');
                        loadAppointments();
                        loadDocuments();
                        loadDashboard();
                    });
                } else {
                    // Create new document with appointment
                    sendAjaxRequest('create_numbered_document_with_appointment', {
                        appointment: {
                            appointment_id: data.appointment_id,
                            client_name: data.client_name,
                            date: data.date,
                            time: data.time,
                            services: data.services,
                            priority: data.priority,
                            status: data.status,
                            amount: data.amount,
                            notes: data.notes
                        },
                        original_client_name: data.client_name
                    }, response => {
                        showNotification(response.message, 'success');
                        closePopup('edit-appointment-popup');
                        loadAppointments();
                        loadDocuments();
                        loadDashboard();
                    });
                }
            });
        } else {
            // Just edit the appointment
            sendAjaxRequest('edit_appointment', data, response => {
                showNotification(response.message, 'success');
                closePopup('edit-appointment-popup');
                loadAppointments();
                loadDocuments();
                loadDashboard();
            });
        }
    }


    function handleClientNameBlur() {
        const client_name = $(this).val();
        if (client_name) {
            sendAjaxRequest('get_unlinked_appointments', { client_name }, appointments => {
                const container = $('#new-document-past-appointments');
                container.empty();
                if (appointments.length > 0) {
                    appointments.forEach(appt => {
                        container.append(`
                            <div class="neoclient-form-row">
                                <input type="checkbox" id="past-appointment-${appt.id}" value="${appt.id}" class="past-appointment-checkbox">
                                <label for="past-appointment-${appt.id}">${appt.date} - ${appt.services}</label>
                            </div>
                        `);
                    });
                    $('#new-document-past-appointments-container').show();
                } else {
                    $('#new-document-past-appointments-container').hide();
                }
            });
        }
    }


    function handleNewDocument(e) {
        e.preventDefault();
        const fileInput = $('#new-document-image')[0];
        const past_appointments = [];
        $('.past-appointment-checkbox:checked').each(function() {
            past_appointments.push($(this).val());
        });
        const history = $('#new-document-history').data('history') || [];

        

        const data = {
            client_name: $('#new-document-client_name').val(),
            birthdate: $('#new-document-birthdate').val(),
            occupation: $('#new-document-occupation').val(),
            client_phone: $('#new-document-client_phone').val(),
            client_email: $('#new-document-client_email').val(),
            skin_type: $('#new-document-skin_type').val(),
            skin_concerns: $('#new-document-skin_concerns').val(),
            sensitivities: $('#new-document-sensitivities').val(),
            skin_tone: $('#new-document-skin_tone').val(),
            hydration_level: $('#new-document-hydration_level').val(),
            acne_level: $('#new-document-acne_level').val(),
            sun_exposure: $('#new-document-sun_exposure').val(),
            skincare_routine: $('#new-document-skincare_routine').val(),
            purchased_products: $('#new-document-purchased_products').val(),
            skin_needs: $('#new-document-skin_needs').val(),
            care_instructions: $('#new-document-care_instructions').val(),
            notes: $('#new-document-notes').val(),
            acne_prone_areas: $('#new-document-acne_prone_areas').val(), // This should already be a JSON string from the hidden input
            address: $('#new-document-address').val(),
            fear_of_closed_spaces: $('#new-document-fear_of_closed_spaces').val(),
            consumables: $('#new-document-consumables').val(), // This should already be a JSON string from the hidden input
            pregnancy_status: $('#new-document-pregnancy_status').val(),
            past_appointments: past_appointments,
            history: history
        };

        if (!data.client_name) {
      showNotification('نام مشتری الزامی است', 'error');
      return;
    }
    var skinType = $('#new-document-skin_type').val();
    if (skinType.trim() === '') {
        showNotification('لطفاً نوع پوست را وارد کنید.', 'error');
        return;
    }
    // اعتبارسنجی برای skin_trap و فیلدهای دیگر

        const capturedImageData = $('#new-document-captured-image').val();

        if (capturedImageData) {
            data.image_data = capturedImageData;
            sendDocumentRequest('new_document', data, () => {
                clearForm('new-document-popup');
            });
        } else if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = e => {
                data.image_data = e.target.result;
                sendDocumentRequest('new_document', data, () => {
                    clearForm('new-document-popup');
                });
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            sendDocumentRequest('new_document', data, () => {
                clearForm('new-document-popup');
            });
        }
    }


    function handleEditDocument(e) {
        e.preventDefault();
        const fileInput = $('#edit-document-image')[0];
        const data = {
            document_id: $('#edit-document-id').val(),
            client_name: $('#edit-document-client_name').val(),
            birthdate: $('#edit-document-birthdate').val(),
            occupation: $('#edit-document-occupation').val(),
            client_phone: $('#edit-document-client_phone').val(),
            client_email: $('#edit-document-client_email').val(),
            skin_type: $('#edit-document-skin_type').val(),
            skin_concerns: $('#edit-document-skin_concerns').val(),
            sensitivities: $('#edit-document-sensitivities').val(),
            skin_tone: $('#edit-document-skin_tone').val(),
            hydration_level: $('#edit-document-hydration_level').val(),
            acne_level: $('#edit-document-acne_level').val(),
            sun_exposure: $('#edit-document-sun_exposure').val(),
            skincare_routine: $('#edit-document-skincare_routine').val(),
            purchased_products: $('#edit-document-purchased_products').val(),
            skin_needs: $('#edit-document-skin_needs').val(),
            care_instructions: $('#edit-document-care_instructions').val(),
            notes: $('#edit-document-notes').val(),
            acne_prone_areas: $('#edit-document-acne_prone_areas').val(), // This should already be a JSON string from the hidden input
            address: $('#edit-document-address').val(),
            fear_of_closed_spaces: $('#edit-document-fear_of_closed_spaces').val(),
            consumables: $('#edit-document-consumables').val(), // This should already be a JSON string from the hidden input
            pregnancy_status: $('#edit-document-pregnancy_status').val(),
            history: $('#edit-document-history').data('history') || []
        };

        if (!data.client_name) {
          showNotification('نام مشتری الزامی است', 'error');
          return;
        }

        const capturedImageData = $('#edit-document-captured-image').val();
        console.log('handleEditDocument data before sending:', data);
        console.log('handleEditDocument data:', data);

        if (capturedImageData) {
            data.image_data = capturedImageData;
            sendDocumentRequest('edit_document', data);
        } else if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = e => {
                data.image_data = e.target.result;
                sendDocumentRequest('edit_document', data);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            sendDocumentRequest('edit_document', data);
        }
    }

    function sendDocumentRequest(action, data, callback = () => {}) {
        sendAjaxRequest(action, data, data => {
            
            showNotification(data.message, 'success');
            closePopup(`${action === 'new_document' ? 'new' : 'edit'}-document-popup`);
            loadDocuments();
            callback();
        });
    }


    function handleConfirmClient(e) {
        e.preventDefault();
        const isSameClient = this.id === 'confirm-client-yes';
        const appointmentData = JSON.parse($('#confirm-client-appointment-data').val() || '{}');

        if (isSameClient) {
            const docId = $('#confirm-client-existing-doc-id').val();
            sendAjaxRequest('add_appointment_to_history', { doc_id: docId, appointment: appointmentData }, data => {
                showNotification(data.message, 'success');
                closePopup('confirm-client-popup');
                closePopup('new-appointment-popup');
                loadDocuments();
                loadAppointments();
                loadDashboard();
            });
        } else {
            closePopup('confirm-client-popup');
            openPopup('new-document');
            $('#new-document-client_name').val(appointmentData.client_name);
        }
    }


    function handleHistoryEdit() {
        const docId = $(this).data('doc-id');
        const historyIndex = $(this).data('history-index');
        sendAjaxRequest('get_documents', {}, data => {
            const doc = data.documents.find(d => d.id == docId);
            if (doc && doc.history && doc.history[historyIndex]) {
                const historyItem = doc.history[historyIndex];
                $('#edit-history-item-doc-id').val(docId);
                $('#edit-history-item-index').val(historyIndex);
                $('#edit-history-item-date').val(historyItem.date);
                $('#edit-history-item-time').val(historyItem.time);
                $('#edit-history-item-services').val(historyItem.services);
                $('#edit-history-item-status').val(historyItem.status);
                $('#edit-history-item-amount').val(historyItem.amount);
                $('#edit-history-item-notes').val(historyItem.notes);
                openPopup('edit-history-item');
                // Initialize Gregorian date picker for history item date
                initDatePicker('#edit-history-item-date');
            } else {
                showNotification('مورد تاریخچه یافت نشد', 'error');
            }
        });
    }


    function handleHistoryDelete() {
        const docId = $(this).data('doc-id');
        const historyIndex = $(this).data('history-index');
        openDeleteConfirmPopup('history_item', { doc_id: docId, history_index: historyIndex });
    }


    function handleEditHistoryItem(e) {
        e.preventDefault();
        const docId = $('#edit-history-item-doc-id').val();
        const historyIndex = $('#edit-history-item-index').val();
        const historyItem = {
            date: $('#edit-history-item-date').val(),
            time: $('#edit-history-item-time').val(),
            services: $('#edit-history-item-services').val(),
            status: $('#edit-history-item-status').val(),
            amount: $('#edit-history-item-amount').val(),
            notes: $('#edit-history-item-notes').val(),
        };

        sendAjaxRequest('edit_history_item', { 
            doc_id: docId, 
            history_index: historyIndex, 
            history_item: historyItem 
        }, data => {
            showNotification(data.message || 'تاریخچه ویرایش شد', 'success');
            closePopup('edit-history-item-popup');
            openEditPopup('edit-document', docId);
        });
    }


    function handleAddPastAppointment(e) {
        const docId = e.target.dataset['docId'];
        createPopup('add-past-appointment-popup', `
            <div class="neoclient-popup-content">
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <h3>${translate('add_past_appointment')}</h3>
                <form id="add-past-appointment-form">
                    <input type="hidden" id="past-appointment-doc-id" value="${docId}">
                    <div class="neoclient-form-group">
                        <label for="past-appointment-date">${translate('date')}</label>
                        <input type="text" id="past-appointment-date" required autocomplete="off">
                        <div id="past-appointment-date-dropdown-container" class="persian-date-dropdown-container"></div>
                    </div>
                    <div class="neoclient-form-group">
                        <label for="past-appointment-time">${translate('time')}</label>
                        <input type="time" id="past-appointment-time" required autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="past-appointment-services">${translate('services')}</label>
                        <input type="text" id="past-appointment-services" required autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="past-appointment-amount">${translate('amount')}</label>
                        <input type="number" id="past-appointment-amount" min="0" autocomplete="off">
                    </div>
                    <div class="neoclient-form-group">
                        <label for="past-appointment-notes">${translate('notes')}</label>
                        <textarea id="past-appointment-notes" autocomplete="off"></textarea>
                    </div>
                    <div class="neoclient-form-group">
                        <label for="past-appointment-status">${translate('status')}</label>
                        <select id="past-appointment-status">
                            <option value="completed">${translate('completed')}</option>
                            <option value="cancelled">${translate('cancelled')}</option>
                        </select>
                    </div>
                    <div class="neoclient-form-actions">
                        <button type="submit" class="neoclient-button">${translate('add')}</button>
                    </div>
                </form>
            </div>
        `);
        // Initialize Gregorian date picker and set to today
        initDatePicker('#past-appointment-date').then(fp => {
            if (fp) fp.setDate(new Date(), true);
        });
        openPopup('add-past-appointment');

        $('#add-past-appointment-form').on('submit', function(e) {
            e.preventDefault();
            const appointment_data = {
                doc_id: $('#past-appointment-doc-id').val(),
                appointment: {
                    date: $('#past-appointment-date').val(),
                    time: $('#past-appointment-time').val(),
                    services: $('#past-appointment-services').val(),
                    status: $('#past-appointment-status').val(),
                    amount: $('#past-appointment-amount').val(),
                    notes: $('#past-appointment-notes').val(),
                }
            };

            sendAjaxRequest('add_appointment_to_history', appointment_data, response => {
                showNotification(response.message, 'success');
                closePopup('add-past-appointment-popup');
                loadDocuments();
            });
        });
    }


    function clearForm(popupId) {
        $(`#${popupId} input[type="text"], #${popupId} input[type="email"], #${popupId} input[type="tel"], #${popupId} input[type="number"], #${popupId} input[type="date"], #${popupId} input[type="time"], #${popupId} textarea`).val('');
        $(`#${popupId} select`).prop('selectedIndex', 0);
        $(`#${popupId} input[type="checkbox"]`).prop('checked', false);
        $(`#${popupId} input[type="file"]`).val('');
        $(`#${popupId} .past-appointment-checkbox`).prop('checked', false);
        $(`#${popupId}-past-appointments-container`).hide();
        
        // Clear consumables dropdown
        $(`#${popupId} .neoclient-dropdown-check-list[data-target-input="consumables"]`).each(function() {
            const targetInputId = $(this).data('target-input');
            $(`#${popupId} #${targetInputId}`).val('');
            $(this).find('input[type="checkbox"]').prop('checked', false);
            $(this).find('.neoclient-dropdown-display').text('');
        });

        // Clear acne_prone_areas dropdown
        $(`#${popupId} .neoclient-dropdown-check-list[data-target-input="acne_prone_areas"]`).each(function() {
            const targetInputId = $(this).data('target-input');
            $(`#${popupId} #${targetInputId}`).val('');
            $(this).find('input[type="checkbox"]').prop('checked', false);
            $(this).find('.neoclient-dropdown-display').text('');
        });

        // پاک کردن داده های تاریخچه برای پرونده جدید
        if (popupId === 'new-document-popup') {
            $('#new-document-history').data('history', []);
            renderNewDocumentHistory([]);
        }
    }


    function handleConfirmDelete(e) {
        e.preventDefault();
        const $popup = $('#confirm-delete-popup');
        const type = $popup.data('type');
        const id = $popup.data('id');
        debugLog(`Confirming delete: ${type}, ID: ${JSON.stringify(id)}`);

        let action = '';
        let params = {};

        if (type === 'appointment') {
            action = 'delete_appointment';
            params = { appointment_id: id };
        } else if (type === 'document') {
            action = 'delete_document';
            params = { doc_id: id };
        } else if (type === 'history_item') {
            action = 'delete_history_item';
            params = { doc_id: id.doc_id, history_index: id.history_index };
        }

        if (action) {
            sendAjaxRequest(action, params, data => {
                showNotification(data.message, 'success');
                closePopup('confirm-delete-popup');
                if (type === 'appointment') {
                    loadAppointments();
                    loadDashboard();
                } else {
                    loadDocuments();
                }
            });
        }
    }


    function openViewPopup(popup, id) {
        const type = popup.includes('appointment') ? 'appointment' : 'document';
        debugLog(`Attempting to open view popup for type: ${type}, ID: ${id}`);
        sendAjaxRequest(`get_${type}s`, {}, data => {
            debugLog(`AJAX response for get_${type}s:`, data);
            const items = data[type === 'appointment' ? 'appointments' : 'documents'];
            const item = items.find(i => i.id == id);
            debugLog(`Found ${type} item:`, item);
            debugLog('Item details for view popup:', item);

            if (!item) {
                debugLog(`Error: ${type} item with ID ${id} not found.`);
                showNotification(translate(`error_${type}_not_found`), 'error');
                return;
            }

            debugLog(`Populating ${type} form with data:`, item);

            let content = '';
            if (type === 'appointment') {
                content = generateAppointmentDetailsHtml(item);
            } else {
                content = generateDocumentDetailsHtml(item);
            }

            // After content is set, initialize select2 on the relevant elements
            // This needs to be done after the elements are added to the DOM
            setTimeout(() => {
                $('#edit-appointment-document_id').select2();

            }, 0); // Use setTimeout to ensure elements are in DOM

            function generateAppointmentDetailsHtml(item) {
                return `
                    <p><strong>${translate('client_name')}:</strong> ${item.client_name || ''}</p>
                    <p><strong>${translate('date')}:</strong> ${item.date || ''}</p>
                    <p><strong>${translate('time')}:</strong> ${item.time || ''}</p>
                    <p><strong>${translate('services')}:</strong> ${item.services || ''}</p>
                    <p><strong>${translate('priority')}:</strong> ${translate(item.priority || '')}</p>
                    <p><strong>${translate('status')}:</strong> ${translate(item.status || '')}</p>
                    <p><strong>${translate('amount')}:</strong> ${persianNumber(item.amount || 0)}</p>
                    <p><strong>${translate('notes')}:</strong> ${item.notes || ''}</p>
                `;
            }

            function generateDocumentDetailsHtml(item) {
                const historyHtml = item.history && item.history.length > 0 ? `
                    <div class="neoclient-document-history">
                        <h5>${translate('appointment_history')}</h5>
                        ${item.history.map((h, index) => `
                            <div class="neoclient-history-item" data-doc-id="${item.id}" data-history-index="${index}">
                                <span>${h.date}: ${h.services} (${translate(h.status)})</span>
                                <div class="neoclient-item-actions">
                                    <span class="neoclient-action-icon edit history-edit" title="${translate('edit')}" data-doc-id="${item.id}" data-history-index="${index}"></span>
                                    <span class="neoclient-action-icon delete history-delete" title="${translate('delete')}" data-doc-id="${item.id}" data-history-index="${index}"></span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '';

                return `
                    <p><strong>${translate('client_name')}:</strong> ${item.client_name || ''}</p>
                    <p><strong>${translate('birthdate')}:</strong> ${item.birthdate || ''}</p>
                    <p><strong>${translate('occupation')}:</strong> ${item.occupation || ''}</p>
                    <p><strong>${translate('client_phone')}:</strong> ${item.client_phone || ''}</p>
                    <p><strong>${translate('client_email')}:</strong> ${item.client_email || ''}</p>
                    <p><strong>${translate('skin_type')}:</strong> ${translate(item.skin_type || '')}</p>
                    <p><strong>${translate('skin_concerns')}:</strong> ${item.skin_concerns || ''}</p>
                    <p><strong>${translate('sensitivities')}:</strong> ${item.sensitivities || ''}</p>
                    <p><strong>${translate('skin_tone')}:</strong> ${translate(item.skin_tone || '')}</p>
                    <p><strong>${translate('hydration_level')}:</strong> ${translate(item.hydration_level || '')}</p>
                    <p><strong>${translate('acne_level')}:</strong> ${item.acne_level || ''}</p>
                    <p><strong>${translate('sun_exposure')}:</strong> ${translate(item.sun_exposure || '')}</p>
                    <p><strong>${translate('skincare_routine')}:</strong> ${item.skincare_routine || ''}</p>
                    <p><strong>${translate('purchased_products')}:</strong> ${item.purchased_products || ''}</p>
                    <p><strong>${translate('skin_needs')}:</strong> ${item.skin_needs || ''}</p>
                    <p><strong>${translate('care_instructions')}:</strong> ${item.care_instructions || ''}</p>
                    <p><strong>${translate('acne_prone_areas')}:</strong> ${item.acne_prone_areas && Array.isArray(item.acne_prone_areas) ? item.acne_prone_areas.map(c => translate(c)).join(', ') : ''}</p>
                    <p><strong>${translate('address')}:</strong> ${item.address || ''}</p>
                    <p><strong>${translate('fear_of_closed_spaces')}:</strong> ${item.fear_of_closed_spaces ? translate(item.fear_of_closed_spaces) : ''}</p>
                    <p><strong>${translate('consumables')}:</strong> ${item.consumables && Array.isArray(item.consumables) ? item.consumables.map(c => translate(c)).join(', ') : ''}</p>
                    <p><strong>${translate('pregnancy_status')}:</strong> ${item.pregnancy_status ? translate(item.pregnancy_status) : ''}</p>
                    ${item.image ? `<img src="${item.image}" alt="Client Image" class="neoclient-document-image">` : ''}
                `;
            }

            const $popup = $(`#${popup}-popup`);
            debugLog(`Generated content for ${type} view popup:`, content);
            $popup.find(`.view-content`).html(content);
            if (type === 'document') {
                const notesHtml = item.notes ? `<p>${item.notes}</p>` : `<p>${translate('no_data')}</p>`;
                $popup.find('#document-notes-display').html(notesHtml);

                const historyHtml = item.history && item.history.length > 0 ? `
                    ${item.history.map((h, index) => `
                        <div class="neoclient-history-item" data-doc-id="${item.id}" data-history-index="${index}">
                            <span>${h.date}: ${h.services} (${translate(h.status)})</span>
                            <div class="neoclient-item-actions">
                                <span class="neoclient-action-icon edit history-edit" title="${translate('edit')}" data-doc-id="${item.id}" data-history-index="${index}"></span>
                                <span class="neoclient-action-icon delete history-delete" title="${translate('delete')}" data-doc-id="${item.id}" data-history-index="${index}"></span>
                            </div>
                        </div>
                    `).join('')}
                    <button id="add-past-appointment-btn" class="neoclient-button" data-doc-id="${item.id}">${translate('add_past_appointment')}</button>
                ` : `<p>${translate('no_history_found')}</p>`;
                $popup.find('#document-appointments-list').html(historyHtml);
            }
            $popup.find('.neoclient-action-buttons').html(`
                <span class="neoclient-action-button edit" data-popup="edit-${type}" data-id="${item.id}">${translate('edit')}</span>
                <span class="neoclient-action-button delete" data-type="${type}" data-id="${item.id}">${translate('delete')}</span>
            `);
            openPopup(popup);
        });
    }


    function openEditPopup(popup, id) {
        const type = popup.includes('appointment') ? 'appointment' : 'document';
        debugLog(`openEditPopup called for type: ${type}, id: ${id}`);
        sendAjaxRequest(`get_${type}s`, {}, data => {
            debugLog(`Data received for ${type}s:`, data);
            const items = data[type === 'appointment' ? 'appointments' : 'documents'];
            const item = items.find(i => i.id == id);

            if (!item) {
                showNotification(translate(`error_${type}_not_found`), 'error');
                return;
            }

            const $popup = $(`#${popup}-popup`);
            clearForm(popup);
            // Clear any existing form draft for this popup to prevent old data from reappearing
            if (formDrafts[popup]) {
                delete formDrafts[popup];
            }
            if (type === 'appointment') {
                $('#edit-appointment-id').val(item.id);
                $('#edit-appointment-client_name').val(item.client_name || '');
                $('#edit-appointment-date').val(item.date || '');
                // Initialize Gregorian date picker for edit-appointment-date
                initDatePicker('#edit-appointment-date');
                $('#edit-appointment-time').val(item.time || '');
                $('#edit-appointment-services').val(item.services || '');
                $('#edit-appointment-priority').val(item.priority || 'medium');
                $('#edit-appointment-status').val(item.status || 'pending');
                $('#edit-appointment-amount').val(item.amount || '');
                $('#edit-appointment-notes').val(item.notes || '');
                $('#edit-appointment-append_to_document').prop('checked', false);
                $('#edit-appointment-document-select-container').hide();
                sendAjaxRequest('get_documents', {}, docData => {
                    const select = $('#edit-appointment-document_id');
                    select.empty();
                    docData.documents.forEach(doc => {
                        select.append(`<option value="${doc.id}">${doc.client_name}</option>`);
                    });
                });
                debugLog('Appointment data for form:', item);
                debugLog('Value of edit-appointment-date after setting:', $('#edit-appointment-date').val());
            } else {
                $('#edit-document-id').val(item.id);
                $('#edit-document-client_name').val(item.client_name || '');
                $('#edit-document-birthdate').val(item.birthdate || '');
                // Initialize Gregorian date picker for edit-document-birthdate
                initDatePicker('#edit-document-birthdate');
                $('#edit-document-occupation').val(item.occupation || '');
                $('#edit-document-client_phone').val(item.client_phone || '');
                $('#edit-document-client_email').val(item.client_email || '');
                $('#edit-document-skin_type').val(item.skin_type || 'normal');
                $('#edit-document-skin_concerns').val(item.skin_concerns || '');
                $('#edit-document-sensitivities').val(item.sensitivities || '');
                $('#edit-document-skin_tone').val(item.skin_tone || 'light');
                $('#edit-document-hydration_level').val(item.hydration_level || 'medium');
                $('#edit-document-acne_level').val(item.acne_level || '');
                $('#edit-document-sun_exposure').val(item.sun_exposure || 'medium');
                $('#edit-document-skincare_routine').val(item.skincare_routine || '');
                $('#edit-document-purchased_products').val(item.purchased_products || '');
                $('#edit-document-skin_needs').val(item.skin_needs || '');
                $('#edit-document-care_instructions').val(item.care_instructions || '');

                // Populate the notes display section
                const notesDisplay = $('#document-notes-display');
                notesDisplay.empty(); // Clear previous notes
                if (item.notes) {
                    const notesArray = item.notes.split('\n').filter(note => note.trim() !== '');
                    notesArray.forEach(note => {
                        notesDisplay.append(`<p>${note}</p>`);
                    });
                }

                // Also set the value for the editable notes textarea if it exists
                $('#edit-document-notes').val(item.notes || '');

                // Set select for acne_prone_areas
                try {
                    const acneProneAreasArray = item.acne_prone_areas ? JSON.parse(item.acne_prone_areas) : [];
                    $('#edit-document-acne_prone_areas').val(JSON.stringify(acneProneAreasArray));
                    // Manually check the checkboxes based on the parsed array
                    $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find('input[type="checkbox"]').prop('checked', false);
                    acneProneAreasArray.forEach(val => {
                        $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find(`input[type="checkbox"][value="${val}"]`).prop('checked', true);
                    });
                    // Update the display field
                    const selectedTexts = acneProneAreasArray.map(val => $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find(`input[type="checkbox"][value="${val}"]`).next('label').text());
                    $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find('.neoclient-dropdown-field').text(selectedTexts.length > 0 ? selectedTexts.join(', ') : 'انتخاب کنید...');
                } catch (e) {
                    console.error('Error parsing acne_prone_areas:', e);
                    $('#edit-document-acne_prone_areas').val('[]');
                    $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find('input[type="checkbox"]').prop('checked', false);
                    $('#edit-document-acne_prone_areas').closest('.neoclient-dropdown-check-list').find('.neoclient-dropdown-field').text('انتخاب کنید...');
                }

                $('#edit-document-address').val(item.address || '');

                // Set select for fear_of_closed_spaces
                $('#edit-document-fear_of_closed_spaces').val(item.fear_of_closed_spaces || '');

                // Set checkboxes for consumables
                try {
                    const consumablesArray = item.consumables ? JSON.parse(item.consumables) : [];
                    $('#edit-document-consumables').val(JSON.stringify(consumablesArray)); // Update hidden input
                    $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find('input[type="checkbox"]').prop('checked', false); // Uncheck all first
                    consumablesArray.forEach(val => {
                        $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find(`input[type="checkbox"][value="${val}"]`).prop('checked', true);
                    });
                    const selectedTexts = consumablesArray.map(val => $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find(`input[type="checkbox"][value="${val}"]`).next('label').text());
                    $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find('.neoclient-dropdown-field').text(selectedTexts.length > 0 ? selectedTexts.join(', ') : 'انتخاب کنید...');
                } catch (e) {
                    console.error('Error parsing consumables:', e);
                    $('#edit-document-consumables').val('[]');
                    $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find('input[type="checkbox"]').prop('checked', false);
                    $('#edit-document-consumables').closest('.neoclient-dropdown-check-list').find('.neoclient-dropdown-field').text('انتخاب کنید...');
                }

                // Set select for pregnancy_status
                $('#edit-document-pregnancy_status').val(item.pregnancy_status || '');
                renderEditDocumentHistory(item.history || []);
            $(document).trigger('neoclient:document:loaded', { document: item });
            }

            openPopup(popup);

        });
    }

    function renderEditDocumentHistory(history) {
        const container = $('#edit-document-history');
        container.empty();
        history.forEach((item, index) => {
            container.append(`
                <div class="history-item" data-index="${index}">
                    <p>${item.date} - ${item.time} - ${item.services} - ${translate(item.status)} - ${item.amount} - ${item.notes}</p>
                    <button class="neoclient-button edit-history" data-index="${index}">${translate('edit')}</button>
                    <button class="neoclient-button delete-history" data-index="${index}">${translate('delete')}</button>
                </div>
            `);
        });
    }

    $(document).on('click', '#edit-document-add-past-appointment', function() {
        const docId = $('#edit-document-id').val();
        handleAddPastAppointment({ target: { dataset: { docId } } });
    });

    $(document).on('click', '.edit-history', function() {
        const docId = $('#edit-document-id').val();
        const index = $(this).data('index');
        // Logic to open edit history item popup, similar to handleHistoryEdit
        handleHistoryEdit.call(this); // Adjust as needed
    });

    $(document).on('click', '.delete-history', function() {
        const docId = $('#edit-document-id').val();
        const index = $(this).data('index');
        openDeleteConfirmPopup('history_item', { doc_id: docId, history_index: index });
    });

    $(document).on('change', '#edit-appointment-append_to_document', function() {
        $('#edit-appointment-document-select-container').toggle(this.checked);
    });


    function openDeleteConfirmPopup(type, id) {
        const $popup = $('#confirm-delete-popup');
        let message = '';
        if (type === 'appointment') {
            message = translate('confirm_delete_appointment');
        } else if (type === 'document') {
            message = translate('confirm_delete_document');
        } else if (type === 'history_item') {
            message = 'آیا از حذف این مورد از تاریخچه مطمئن هستید؟';
            $popup.data('doc_id', id.doc_id);
            $popup.data('history_index', id.history_index);
        }

        $popup.data('type', type);
        $popup.data('id', id);
        openPopup('confirm-delete');
        $popup.find('.neoclient-popup-content p').text(message);
    }







    // Render charts
    function renderCharts(appointments, documents) {
        // Validate input parameters
        if (!appointments || !Array.isArray(appointments)) {
            showNotification(translate('error_load_data'), 'error', 'Appointments data is missing or invalid.');
            debugLog('renderCharts: Appointments data is missing or invalid.');
            return;
        }
        if (!documents || !Array.isArray(documents)) {
            showNotification(translate('error_load_data'), 'error', 'Documents data is missing or invalid.');
            debugLog('renderCharts: Documents data is missing or invalid.');
            return;
        }

        // Clear existing chart canvases
        $('.neoclient-chart-container canvas').remove();
        
        // Create new canvas elements
        const container = $('.neoclient-chart-container');
        container.append('<canvas id="appointments-chart"></canvas>');
        container.append('<canvas id="revenue-chart"></canvas>');
        container.append('<canvas id="annual-revenue-chart"></canvas>');
        container.append('<canvas id="skin-types-chart"></canvas>');
        container.append('<canvas id="best-day-of-month-chart"></canvas>');
        container.append('<canvas id="customers-chart"></canvas>');
        container.append('<canvas id="clients-chart"></canvas>');
        container.append('<canvas id="priority-chart"></canvas>');
        container.append('<canvas id="services-chart"></canvas>');
        container.append('<canvas id="best-month-of-year-chart"></canvas>');

        // --- Appointments by Status (Pie Chart) ---
        const statusData = {
            pending: 0,
            completed: 0,
            cancelled: 0
        };
        
        appointments.forEach(a => statusData[a.status]++);
        
        const appointmentsCtx = document.getElementById('appointments-chart').getContext('2d');
        new Chart(appointmentsCtx, {
            type: 'pie',
            data: {
                labels: [
                    translate('pending'), 
                    translate('completed'), 
                    translate('cancelled')
                ],
                datasets: [{
                    data: [
                        statusData.pending, 
                        statusData.completed, 
                        statusData.cancelled
                    ],
                    backgroundColor: ['#FFCE56', '#36A2EB', '#FF6384'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true
                    },
                    title: {
                        display: true,
                        text: translate('appointments_by_status'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
        


        // --- Revenue Statistics ---
        let revenueData = {};
        appointments.forEach(a => {
            const date = new Date(a.date);
            const month = date.toLocaleString('fa-IR', { month: 'long', year: 'numeric' });
            revenueData[month] = (revenueData[month] || 0) + parseFloat(a.amount || 0);
        });

        const revenueCtx = document.getElementById('revenue-chart').getContext('2d');
        new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(revenueData),
                datasets: [{
                    label: translate('monthly_revenue'),
                    data: Object.values(revenueData),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('revenue_amount')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('month')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('monthly_revenue_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Annual Revenue Statistics ---
        let annualRevenueData = {};
        appointments.forEach(a => {
            const date = new Date(a.date);
            const year = date.getFullYear();
            annualRevenueData[year] = (annualRevenueData[year] || 0) + parseFloat(a.amount || 0);
        });

        const annualRevenueCtx = document.getElementById('annual-revenue-chart').getContext('2d');
        new Chart(annualRevenueCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(annualRevenueData),
                datasets: [{
                    label: translate('annual_revenue'),
                    data: Object.values(annualRevenueData),
                    backgroundColor: 'rgba(255, 205, 86, 0.6)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('revenue_amount')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('year')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('annual_revenue_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Skin Type Statistics (Pie Chart) ---
        let skinTypeCounts = {};
        documents.forEach(d => {
            const skinType = d.skin_type || 'normal';
            skinTypeCounts[skinType] = (skinTypeCounts[skinType] || 0) + 1;
        });
        
        // Define colors for each skin type
        const skinTypeColors = {
            'normal': '#4BC0C0',    // Teal
            'oily': '#36A2EB',      // Blue
            'dry': '#FFCE56',       // Yellow
            'combination': '#FF9F40', // Orange
            'sensitive': '#FF6384',  // Pink/Red
            'unknown': '#9966FF'     // Purple
        };
        
        // Prepare data for chart
        const skinTypeLabels = [];
        const skinTypeData = [];
        const skinTypeBackgroundColors = [];
        
        for (const type in skinTypeCounts) {
            skinTypeLabels.push(translate(type));
            skinTypeData.push(skinTypeCounts[type]);
            skinTypeBackgroundColors.push(skinTypeColors[type] || '#9966FF');
        }
        
        // Create pie chart
        const skinTypesCtx = document.getElementById('skin-types-chart').getContext('2d');
        new Chart(skinTypesCtx, {
            type: 'pie',
            data: {
                labels: skinTypeLabels,
                datasets: [{
                    data: skinTypeData,
                    backgroundColor: skinTypeBackgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true
                    },
                    title: {
                        display: true,
                        text: translate('skin_type_distribution'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
        


        // --- Best Day of Month --- 
        const dailyRevenue = {};
        appointments.forEach(a => {
            const date = new Date(a.date);
            const day = date.getDate();
            dailyRevenue[day] = (dailyRevenue[day] || 0) + parseFloat(a.amount || 0);
        });

        const bestDayCtx = document.getElementById('best-day-of-month-chart').getContext('2d');
        new Chart(bestDayCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(dailyRevenue),
                datasets: [{
                    label: translate('revenue'),
                    data: Object.values(dailyRevenue),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('revenue_amount')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('day_of_month')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('best_day_of_month_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Monthly Customers Statistics ---
        const customerData = {};
        documents.forEach(d => {
            const date = new Date(d.created_at);
            const month = date.toLocaleString('fa-IR', { month: 'long', year: 'numeric' });
            customerData[month] = (customerData[month] || 0) + 1;
        });

        const totalCustomers = Object.values(customerData).reduce((sum, val) => sum + val, 0);
        $('#customers-chart').empty(); // Clear previous content
        const customersCtx = $('<canvas>').attr('id', 'monthlyCustomersChart').appendTo('#customers-chart');

        new Chart(customersCtx[0], {
            type: 'bar',
            data: {
                labels: Object.keys(customerData),
                datasets: [{
                    label: translate('monthly_customers'),
                    data: Object.values(customerData),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('number_of_customers')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('month')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('monthly_customers_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Clients Per Month Statistics ---
        const clientsPerMonth = {};
        appointments.forEach(a => {
            const date = new Date(a.date);
            const month = date.toLocaleString('fa-IR', { month: 'long', year: 'numeric' });
            clientsPerMonth[month] = clientsPerMonth[month] || new Set();
            clientsPerMonth[month].add(a.client_name);
        });

        $('#clients-chart').empty(); // Clear previous content
        const clientsCtx = $('<canvas>').attr('id', 'clientsPerMonthChart').appendTo('#clients-chart');

        new Chart(clientsCtx[0], {
            type: 'bar',
            data: {
                labels: Object.keys(clientsPerMonth),
                datasets: [{
                    label: translate('clients_per_month'),
                    data: Object.values(clientsPerMonth).map(set => set.size),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('number_of_clients')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('month')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('clients_per_month_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Priority Statistics ---
        const priorityCounts = {};
        appointments.forEach(a => {
            const priority = a.priority || 'normal';
            priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
        });

        $('#priority-chart').empty(); // Clear previous content
        const priorityCtx = $('<canvas>').attr('id', 'priorityChart').appendTo('#priority-chart');

        new Chart(priorityCtx[0], {
            type: 'pie',
            data: {
                labels: Object.keys(priorityCounts).map(p => translate(p)),
                datasets: [{
                    data: Object.values(priorityCounts),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)', // High
                        'rgba(54, 162, 235, 0.6)', // Medium
                        'rgba(255, 206, 86, 0.6)'  // Low/Normal
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: translate('priority_distribution_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Service Statistics ---
        const serviceCounts = {};
        appointments.forEach(a => {
            const service = a.service || 'other';
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });

        $('#services-chart').empty(); // Clear previous content
        const servicesCtx = $('<canvas>').attr('id', 'servicesChart').appendTo('#services-chart');

        new Chart(servicesCtx[0], {
            type: 'pie',
            data: {
                labels: Object.keys(serviceCounts).map(s => translate(s)),
                datasets: [{
                    data: Object.values(serviceCounts),
                    backgroundColor: [
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                        'rgba(201, 203, 207, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 159, 64, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(201, 203, 207, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: translate('service_distribution_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        // --- Best Month of Year ---
        const monthlyRevenue = {};
        appointments.forEach(a => {
            const date = new Date(a.date);
            const month = date.toLocaleString('fa-IR', { month: 'long', year: 'numeric' });
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + parseFloat(a.amount || 0);
        });

        const bestMonthCtx = document.getElementById('best-month-of-year-chart').getContext('2d');
        new Chart(bestMonthCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyRevenue),
                datasets: [{
                    label: translate('revenue'),
                    data: Object.values(monthlyRevenue),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: translate('revenue_amount')
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: translate('month')
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: translate('best_month_of_year_chart'),
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    }


    function handleBackup() {
        if (NEOCLIENT.user_role === 'pro') {
            showNotification('شما امکان دسترسی به این سرویس را ندارید. برای استفاده از این سرویس باید به صفحه NEOCLIENT.IR/PREMIUM مراجعه کنید.', 'error');
            return;
        }
        sendAjaxRequest('backup_data', {}, data => {
            const blob = new Blob([data.csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neoclient_backup_${new Date().toISOString()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            showNotification('بک آپ با موفقیت ایجاد شد', 'success');
        });
    }


    function handleRestore(e) {
        if (NEOCLIENT.user_role === 'pro') {
            showNotification('شما امکان دسترسی به این سرویس را ندارید. برای استفاده از این سرویس باید به صفحه NEOCLIENT.IR/PREMIUM مراجعه کنید.', 'error');
            return;
        }
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const data = {
                csv_content: event.target.result
            };
            sendAjaxRequest('restore_data', data, () => {
                showNotification('داده ها با موفقیت بازنشانی شدند', 'success');
                loadDashboard();
                loadAppointments();
                loadDocuments();
            });
        };
        reader.readAsText(file);
    }


    function updateThemeStyle() {
        const style = $('#profile-theme-style').val();
        $('html').attr('data-theme', style);
        sendAjaxRequest('update_user_profile', { theme_style: style }, () => {
            debugLog(`Theme updated to ${style}`);
        });
    }


        function checkThemeStyle() {
            const style = (NEOCLIENT.theme_style) ? NEOCLIENT.theme_style : 'tabriz';
            $('html').attr('data-theme', style);
        }


    $(document).ready(function() {
        console.log('Document is ready. Initializing app.');
        initApp();

        // Initial call to update the time
        updateDateTime();
        // Update the time every second
        setInterval(updateDateTime, 1000);

        // Click event listener for the "نوبت های کلاینت" button
        $('#edit-document-client-appointments-button').on('click', function() {
            const clientName = $('#edit-document-client_name').val();
            if (clientName) {
                // Construct the URL for the appointments page with client name and "همه وضعیت ها" sort
                const appointmentsUrl = `${neoclient_data.ajax_url.replace('admin-ajax.php', 'admin.php?page=neoclient-appointments')}&client_name=${encodeURIComponent(clientName)}&sort_status=${encodeURIComponent('همه وضعیت ها')}`;
                window.location.href = appointmentsUrl;
            } else {
                showNotification(translate('enter_client_name_for_appointments'), 'error'); // Assuming a translation key for this message
            }
        });

        // Custom Dropdown with Checkboxes Logic
        $('.neoclient-dropdown-check-list').on('click', function(event) {
            event.stopPropagation();
            $(this).toggleClass('open');
        });

        $('.neoclient-dropdown-check-list .neoclient-dropdown-list input[type="checkbox"]').on('change', function() {
            const $parentDropdown = $(this).closest('.neoclient-dropdown-check-list');
            const $hiddenInput = $parentDropdown.find('input[type="hidden"]');
            const $displayField = $parentDropdown.find('.neoclient-dropdown-field');
            const selectedValues = [];
            const selectedTexts = [];

            $parentDropdown.find('.neoclient-dropdown-list input[type="checkbox"]:checked').each(function() {
                selectedValues.push($(this).val());
                selectedTexts.push($(this).next('label').text());
            });

            $hiddenInput.val(JSON.stringify(selectedValues));
            $displayField.text(selectedTexts.length > 0 ? selectedTexts.join(', ') : 'Select...');
        });

        // Close dropdown when clicking outside
        $(document).on('click', function(event) {
            if (!$(event.target).closest('.neoclient-dropdown-check-list').length) {
                $('.neoclient-dropdown-check-list').removeClass('open');
            }
        });

        // Initialize display text for existing values on load
        $('.neoclient-dropdown-check-list').each(function() {
            const $parentDropdown = $(this);
            const $hiddenInput = $parentDropdown.find('input[type="hidden"]');
            const $displayField = $parentDropdown.find('.neoclient-dropdown-field');
            let initialValues = [];
            try {
                initialValues = JSON.parse($hiddenInput.val() || '[]');
            } catch (e) {
                initialValues = [];
            }

            const selectedTexts = [];
            $parentDropdown.find('.neoclient-dropdown-list input[type="checkbox"]').each(function() {
                if (initialValues.includes($(this).val())) {
                    $(this).prop('checked', true);
                    selectedTexts.push($(this).next('label').text());
                }
            });
            $displayField.text(selectedTexts.length > 0 ? selectedTexts.join(', ') : 'Select...');
        });

        // مشاهده نوبت های کلاینت
        $(document).on('click', '#view-client-appointments', function(e) {
            e.preventDefault();
            const clientName = $('#edit-document-client_name').val();
            if (clientName) {
                // کپی نام کلاینت
                const tempInput = document.createElement('input');
                tempInput.value = clientName;
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                
                // انتقال به صفحه نوبت ها
                switchTab('appointments');
                
                // تنظیم فیلتر وضعیت روی "همه وضعیت ها"
                $('#appointment-filter-status').val('');
                
                // قرار دادن نام کلاینت در جستجو
                $('#appointment-filter').val(clientName);
                
                // بارگذاری نوبت ها با فیلترهای جدید
                loadAppointments();
                
                // بستن پاپ آپ ویرایش پرونده
                closePopup('edit-document-popup');
                
                showNotification('نوبت های کلاینت نمایش داده شد', 'success');
            } else {
                showNotification('نام کلاینت مشخص نشده است', 'error');
            }
        });

    });

}));