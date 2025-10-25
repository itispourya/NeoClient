<?php
/*
Plugin Name: NeoClient
Description: A professional CRM for skin therapists
Version: 1.1.1
Author: NeoNotion.net
*/


if (!defined('ABSPATH')) {
    exit;
}


define('NEOCLIENT_PATH', plugin_dir_path(__FILE__));
define('NEOCLIENT_URL', plugin_dir_url(__FILE__));


function neoclient_create_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    
    $tables = [
        "CREATE TABLE {$wpdb->prefix}neoclient_documents (
            id VARCHAR(50) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            client_name VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            INDEX user_id (user_id)
        ) $charset_collate;",
        "CREATE TABLE {$wpdb->prefix}neoclient_appointments (
            id VARCHAR(50) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            client_name VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            PRIMARY KEY (id),
            INDEX user_id (user_id)
        ) $charset_collate;",
        "CREATE TABLE {$wpdb->prefix}neoclient_invoices (
            id VARCHAR(50) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            INDEX user_id (user_id)
        ) $charset_collate;",
        "CREATE TABLE {$wpdb->prefix}neoclient_services (
            id VARCHAR(50) NOT NULL,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            service_name VARCHAR(255) NOT NULL,
            PRIMARY KEY (id),
            INDEX user_id (user_id)
        ) $charset_collate;",
        "CREATE TABLE {$wpdb->prefix}neoclient_history (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT(20) UNSIGNED NOT NULL,
            document_id VARCHAR(50) NOT NULL,
            appointment_id VARCHAR(50),
            event_type VARCHAR(50) NOT NULL,
            event_data TEXT,
            event_date DATETIME NOT NULL,
            PRIMARY KEY (id),
            INDEX user_id (user_id),
            INDEX document_id (document_id)
        ) $charset_collate;",
        "CREATE TABLE {$wpdb->prefix}neoclient_referrals (
            user_id BIGINT(20) UNSIGNED NOT NULL,
            referral_code VARCHAR(20) NOT NULL,
            referred_by_code VARCHAR(20) NULL DEFAULT NULL,
            referred_count BIGINT(20) DEFAULT 0,
            referrer_user_id BIGINT(20) UNSIGNED,
            PRIMARY KEY (user_id),
            UNIQUE INDEX referral_code (referral_code),
            INDEX referrer_user_id (referrer_user_id),
            FOREIGN KEY (user_id) REFERENCES {$wpdb->prefix}users(ID) ON DELETE CASCADE,
            FOREIGN KEY (referrer_user_id) REFERENCES {$wpdb->prefix}users(ID) ON DELETE SET NULL
        ) $charset_collate;"
    ];

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    foreach ($tables as $table) {
        dbDelta($table);
    }
}
register_activation_hook(__FILE__, 'neoclient_create_tables');
register_activation_hook(__FILE__, 'neoclient_populate_referral_data_for_existing_users');

function neoclient_populate_referral_data_for_existing_users() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';

    // Get all user IDs from wp_users
    $all_user_ids = $wpdb->get_col("SELECT ID FROM {$wpdb->users}");

    // Get user IDs that already have an entry in neoclient_referrals
    $existing_referral_user_ids = $wpdb->get_col("SELECT user_id FROM {$table_name}");

    // Find user IDs that are in wp_users but not in neoclient_referrals
    $users_to_add = array_diff($all_user_ids, $existing_referral_user_ids);

    if (!empty($users_to_add)) {
        foreach ($users_to_add as $user_id) {
            $new_referral_code = neoclient_generate_referral_code($user_id);
            $wpdb->insert(
                $table_name,
            array(
                'user_id' => $user_id,
                'referral_code' => $new_referral_code,
                'referred_by_code' => NULL,
                'referred_count' => 0
            ),
            array('%d', '%s', '%s', '%d')
            );
        }
    }
}

function neoclient_check_referrals_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") != $table_name) {
        neoclient_create_tables();
    }
}
add_action('plugins_loaded', 'neoclient_check_referrals_table');

function neoclient_generate_referral_code($user_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';
    $code = 'neo' . str_pad($user_id, 5, '0', STR_PAD_LEFT);
    
    // Ensure uniqueness, though with user_id it should be unique
    // In case of a very high user ID, this fallback ensures uniqueness
    while ($wpdb->get_var($wpdb->prepare("SELECT referral_code FROM $table_name WHERE referral_code = %s", $code))) {
        $code = 'neo' . str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);
    }


    return $code;
}

function neoclient_get_referral_code($user_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';
    $referral_code = $wpdb->get_var($wpdb->prepare("SELECT referral_code FROM $table_name WHERE user_id = %d", $user_id));
    error_log("NeoClient: neoclient_get_referral_code for user_id " . $user_id . ": " . ($referral_code ? $referral_code : 'NULL'));
    return $referral_code;
}

function neoclient_get_referrer_code($user_id) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';
    $referrer_id = $wpdb->get_var($wpdb->prepare("SELECT referrer_user_id FROM $table_name WHERE user_id = %d", $user_id));
    if ($referrer_id) {
        return neoclient_get_referral_code($referrer_id);
    }
    return null;
}

function neoclient_set_referrer_for_new_user($user_id, $referral_code) {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';
    $referrer_user_id = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM $table_name WHERE referral_code = %s", $referral_code));
    if ($referrer_user_id) {
        // Update the new user's entry with the referrer's user ID and the code they used
        $wpdb->update(
            $table_name,
            array(
                'referrer_user_id' => $referrer_user_id,
                'referred_by_code' => $referral_code
            ),
            array('user_id' => $user_id)
        );

        // Increment the referred_count for the referrer
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table_name} SET referred_count = referred_count + 1 WHERE user_id = %d",
                $referrer_user_id
            )
        );
        return true;
    }
    return false;
}

add_action('user_register', 'neoclient_user_register_action', 10, 1);
function neoclient_user_register_action($user_id) {
    error_log("NeoClient: neoclient_user_register_action called for user_id " . $user_id);
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';

    // Ensure every new user gets an entry in neoclient_referrals with their own generated referral_code
    $existing_referral_entry = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM {$table_name} WHERE user_id = %d", $user_id));

    if (!$existing_referral_entry) {
        $new_referral_code = neoclient_generate_referral_code($user_id);
        $wpdb->insert(
            $table_name,
            array(
                'user_id' => $user_id,
                'referral_code' => $new_referral_code,
                'referred_by_code' => NULL,
                'referred_count' => 0
                ),
                array('%d', '%s', '%s', '%d')
            );

    }

    // Now that the user's own referral entry is guaranteed to exist, update it if they used a referral code
    if (isset($_POST['neoclient_referral_code']) && !empty($_POST['neoclient_referral_code'])) {
        error_log("NeoClient: Referral code from POST: " . sanitize_text_field($_POST['neoclient_referral_code']));
        neoclient_set_referrer_for_new_user($user_id, sanitize_text_field($_POST['neoclient_referral_code']));
    }
}

function get_appointments() {
    $user_id = get_current_user_id();
    $cache_key = 'neoclient_appointments_' . $user_id;
    $appointments = wp_cache_get($cache_key);
    if (false === $appointments) {
        $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
        wp_cache_set($cache_key, $appointments, '', 300); // cache for 5 minutes
    }
    return $appointments;
}




function neoclient_display_referral_codes_on_profile($user) {
    $referral_code = neoclient_get_referral_code($user->ID);
    if (empty($referral_code)) {
        $referral_code = neoclient_generate_referral_code($user->ID);
    }
    // AJAX handler for confirming booking
function neoclient_ajax_confirm_booking() {
    check_ajax_referer('neoclient_nonce', 'nonce');
    $booking_id = sanitize_text_field($_POST['booking_id']);
    $appointments = get_user_meta(get_current_user_id(), 'neoclient_appointments', true) ?: [];
    foreach ($appointments as &$appt) {
        if ($appt['id'] === $booking_id && $appt['status'] === 'pending') {
            $appt['status'] = 'confirmed';
            break;
        }
    }
    update_user_meta(get_current_user_id(), 'neoclient_appointments', $appointments);
    wp_send_json_success(['message' => 'Appointment confirmed.']);
}
add_action('wp_ajax_neoclient_confirm_booking', 'neoclient_ajax_confirm_booking');

// AJAX handler for cancelling booking
function neoclient_ajax_cancel_booking() {
    check_ajax_referer('neoclient_nonce', 'nonce');
    $booking_id = sanitize_text_field($_POST['booking_id']);
    $appointments = get_user_meta(get_current_user_id(), 'neoclient_appointments', true) ?: [];
    $appointments = array_filter($appointments, function($appt) use ($booking_id) {
        return $appt['id'] !== $booking_id;
    });
    update_user_meta(get_current_user_id(), 'neoclient_appointments', $appointments);
    wp_send_json_success(['message' => 'Appointment cancelled.']);
}
add_action('wp_ajax_neoclient_cancel_booking', 'neoclient_ajax_cancel_booking');

add_action('neoclient_appointment_saved', function($appointment_data) {
    // Sync to neoappointment
    update_option('neoappointment_synced_data', $appointment_data);
});

// AJAX handler for client image upload
function neoclient_ajax_upload_client_image() {
    check_ajax_referer('neoclient_nonce', 'nonce');

    $user_id = get_current_user_id();
    if (!$user_id) {
        wp_send_json_error(['message' => 'User not logged in']);
        return;
    }

    $user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
    if ($user_role === 'free') {
        wp_send_json_error(['message' => 'Please upgrade to the premium plan to upload client images']);
        return;
    }

    if (!isset($_POST['document_id']) || !isset($_POST['image'])) {
        wp_send_json_error(['message' => 'Incomplete information']);
        return;
    }

    $document_id = sanitize_text_field($_POST['document_id']);
    $image_data = $_POST['image'];

    $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
    $document_index = -1;
    foreach ($documents as $index => $doc) {
        if ($doc['id'] === $document_id) {
            $document_index = $index;
            break;
        }
    }

    if ($document_index === -1) {
        wp_send_json_error(['message' => 'Document not found']);
        return;
    }

    if (!isset($documents[$document_index]['images'])) {
        $documents[$document_index]['images'] = [];
    }

    if (count($documents[$document_index]['images']) >= 5) {
        wp_send_json_error(['message' => 'You have reached the maximum number of allowed images (5) for this document']);
        return;
    }

    list($type, $image_data) = explode(';', $image_data);
    list(, $image_data)      = explode(',', $image_data);
    $image_data = base64_decode($image_data);

    if (empty($image_data)) {
        wp_send_json_error(['message' => 'Invalid image data']);
        return;
    }

    $upload_dir = wp_upload_dir();
    $customer_images_dir = $upload_dir['basedir'] . '/customer_images/' . $user_id . '/' . $document_id;
    if (!file_exists($customer_images_dir)) {
        wp_mkdir_p($customer_images_dir);
    }

    $image_id = wp_generate_uuid4();
    $file_extension = 'jpg';
    if (strpos($type, 'png') !== false) {
        $file_extension = 'png';
    }

    $filename = $image_id . '.' . $file_extension;
    $file_path = $customer_images_dir . '/' . $filename;

    file_put_contents($file_path, $image_data);

    $image_url = $upload_dir['baseurl'] . '/customer_images/' . $user_id . '/' . $document_id . '/' . $filename;

    $documents[$document_index]['images'][] = [
        'id' => $image_id,
        'filename' => $filename,
        'url' => $image_url,
        'created_at' => current_time('mysql')
    ];

    update_user_meta($user_id, 'neoclient_documents', $documents);

    wp_send_json_success([
        'message' => 'Image uploaded successfully',
        'image_id' => $image_id,
        'image_url' => $image_url
    ]);
}
add_action('wp_ajax_neoclient_upload_client_image', 'neoclient_ajax_upload_client_image');

// AJAX handler for deleting client image
function neoclient_ajax_delete_client_image() {
    check_ajax_referer('neoclient_nonce', 'nonce');
    
    $user_id = get_current_user_id();
    $document_id = sanitize_text_field($_POST['document_id']);
    $image_id = sanitize_text_field($_POST['image_id']);
    
    $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
    $document_index = -1;
    
    foreach ($documents as $index => $doc) {
        if ($doc['id'] === $document_id) {
            $document_index = $index;
            break;
        }
    }
    
    if ($document_index === -1) {
        wp_send_json_error(['message' => 'Document not found']);
        return;
    }
    
    if (!isset($documents[$document_index]['images'])) {
        wp_send_json_error(['message' => 'No images found for this document']);
        return;
    }
    
    $image_index = -1;
    foreach ($documents[$document_index]['images'] as $idx => $img) {
        if ($img['id'] === $image_id) {
            $image_index = $idx;
            break;
        }
    }
    
    if ($image_index === -1) {
        wp_send_json_error(['message' => 'Image not found']);
        return;
    }
    
    // Get file path to delete
    $upload_dir = wp_upload_dir();
    $filename = $documents[$document_index]['images'][$image_index]['filename'];
    $file_path = $upload_dir['basedir'] . '/customer_images/' . $user_id . '/' . $document_id . '/' . $filename;
    
    // Delete file if it exists
    if (file_exists($file_path)) {
        unlink($file_path);
    }
    
    // Remove image from document
    array_splice($documents[$document_index]['images'], $image_index, 1);
    
    // Update user meta
    update_user_meta($user_id, 'neoclient_documents', $documents);
    
    wp_send_json_success(['message' => 'Image deleted successfully']);
}
add_action('wp_ajax_neoclient_delete_client_image', 'neoclient_ajax_delete_client_image');

?>
    <h3>NeoClient Referral Code</h3>
    <table class="form-table">
        <tr>
            <th><label for="neoclient_referral_code">Your referral code:</label></th>
            <td>
                <p><strong id="neoclient-referral-code-display" style="cursor: pointer;" title="Click to copy"><?php echo esc_html($referral_code); ?></strong></p>

            </td>
        </tr>
    </table>
    <?php
}
add_action('show_user_profile', 'neoclient_display_referral_codes_on_profile');
add_action('edit_user_profile', 'neoclient_display_referral_codes_on_profile');

function neoclient_translate($text) {
    $translations = [
        'low' => 'Low',
        'medium' => 'Medium',
        'high' => 'High',
        'pending' => 'Pending',
        'completed' => 'Completed',
        'cancelled' => 'Cancelled',
        'dry' => 'Dry',
        'oily' => 'Oily',
        'normal' => 'Normal',
        'combination' => 'Combination',
        'sensitive' => 'Sensitive',
        'light' => 'Light',
        'dark' => 'Dark',
        'date_placeholder' => 'Select Date',
        'new_clients' => 'New Clients',
        'customer_growth' => 'Customer Growth',
        'upcoming_appointments_by_priority' => 'Upcoming Appointments by Priority',
        'most_popular_services' => 'Most Popular Services',
        'appointments_by_status' => 'Appointments by Status',
        'associated_appointments' => 'Associated Appointments',
        'monthly_revenue_chart' => 'Monthly Revenue Chart',
        'monthly_revenue' => 'Monthly Revenue',
        'revenue_amount' => 'Revenue Amount',
        'month' => 'Month',
        'annual_revenue' => 'Annual Revenue',
        'year' => 'Year',
        'annual_revenue_chart' => 'Annual Revenue Chart',
        'best_day_of_month_chart' => 'Best Day of the Month',
        'day_of_month' => 'Day of the Month',
        'revenue' => 'Revenue',
        'best_month_of_year_chart' => 'Best Month of the Year'
    ];
    return isset($translations[$text]) ? $translations[$text] : $text;
}


function neoclient_enqueue_scripts() {
    if (is_page('home') && !is_admin()) {
        wp_enqueue_script('jquery');
        wp_enqueue_script('jalaali-js', NEOCLIENT_URL . 'jalaali.min.js', [], '1.2.6', true);
        
        
        wp_enqueue_script('chart-js', 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', array(), '4.4.1', true);
        
        // Add Cropper.js library for image cropping
        wp_enqueue_style('cropperjs-css', 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css', [], '1.5.13');
        wp_enqueue_script('cropperjs', 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js', [], '1.5.13', true);
        
        // Add image cropping script
        wp_enqueue_script('neoclient-image-crop-js', NEOCLIENT_URL . 'neoclient-image-crop.js', ['jquery', 'cropperjs'], '1.0', true);
        wp_enqueue_style('neoclient-image-crop-css', NEOCLIENT_URL . 'neoclient-image-crop.css', [], '1.0');
        
        wp_enqueue_script('neoclient-js', NEOCLIENT_URL . 'neoclient.js', ['jquery', 'jalaali-js', 'chart-js', 'cropperjs'], '5.0', true);
        
        // Add AI file for all users, but enable it only for pro and superpro users
        $user_id = get_current_user_id();
        $user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
        $has_ai_access = ($user_role === 'pro' || $user_role === 'superpro');
        
        // Always load AI files, but control access
        wp_enqueue_script('neoclient-ai-js', NEOCLIENT_URL . 'neoclient-ai.js', ['jquery', 'neoclient-js'], '1.0', true);

        
        wp_enqueue_style('neoclient-css', NEOCLIENT_URL . 'neoclient.css', [], '5.0');

        
        $user_id = get_current_user_id();
        $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
        $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
        foreach ($documents as &$doc) {
            if (isset($doc['consumables']) && !is_string($doc['consumables'])) {
                $doc['consumables'] = json_encode((array)$doc['consumables']);
            }
        }

        // Get counts for free user limits
        $appointments_count = count($appointments);
        $documents_count = count($documents);
        $free_limit_appointments = 1000; // Example limit
        $free_limit_documents = 1000; // Example limit

        
        $status_counts = ['pending' => 0, 'completed' => 0, 'cancelled' => 0];
        foreach ($appointments as $appt) {
            $status_counts[$appt['status']]++;
        }

        
        $priority_counts = ['low' => 0, 'medium' => 0, 'high' => 0];
        foreach ($appointments as $appt) {
            $priority_counts[$appt['priority']]++;
        }

        
        $skin_type_counts = ['dry' => 0, 'oily' => 0, 'normal' => 0, 'combination' => 0, 'sensitive' => 0, 'unknown' => 0];
        foreach ($documents as $doc) {
            $skin_type = isset($doc['skin_type']) && !empty($doc['skin_type']) && in_array($doc['skin_type'], array_keys($skin_type_counts)) ? $doc['skin_type'] : 'unknown';
            $skin_type_counts[$skin_type]++;
        }

        // Calculate monthly revenue
        $monthly_revenue = [];
        foreach ($appointments as $appt) {
            $date = new DateTime($appt['date']);
            $month_year = $date->format('Y-m');
            if (!isset($monthly_revenue[$month_year])) {
                $monthly_revenue[$month_year] = 0;
            }
            $monthly_revenue[$month_year] += (float) $appt['amount'];
        }

        // Calculate monthly customers (new documents)
        $monthly_customers = [];
        foreach ($documents as $doc) {
            if (empty($doc['created_at'])) {
                continue; // Skip if created_at is empty or null
            }
            $date = new DateTime($doc['created_at']);
            $month_year = $date->format('Y-m');
            if (!isset($monthly_customers[$month_year])) {
                $monthly_customers[$month_year] = 0;
            }
            $monthly_customers[$month_year]++;
        }


        wp_localize_script('neoclient-image-crop-js', 'neoclient_data', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('neoclient_nonce'),
            'user_role' => get_user_meta(get_current_user_id(), 'neoclient_role', true) ?: 'free',
            'documents' => get_user_meta(get_current_user_id(), 'neoclient_documents', true) ?: []
        ]);

        wp_localize_script('neoclient-js', 'neoclient_data', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('neoclient_nonce'),
            'icons_url' => NEOCLIENT_URL . './icons/',
            'is_user_logged_in' => is_user_logged_in(),
            'user_id' => get_current_user_id(),
            'debug_mode' => defined('WP_DEBUG') && WP_DEBUG,
            'user_role' => get_user_meta($user_id, 'neoclient_role', true) ?: 'free',
            'has_ai_access' => $has_ai_access,
            'appointments_count' => $appointments_count,
            'documents_count' => $documents_count,
            'free_limit_appointments' => $free_limit_appointments,
            'free_limit_documents' => $free_limit_documents,
            'monthly_revenue' => $monthly_revenue,
            'monthly_customers' => $monthly_customers,

            'theme_style' => get_user_meta($user_id, 'theme_style', true) ?: 'default',
            'chart_data' => [
                'status_counts' => $status_counts,
                'priority_counts' => $priority_counts,
                'skin_type_counts' => $skin_type_counts,
                'monthly_revenue' => $monthly_revenue,
                'monthly_customers' => $monthly_customers,
                'labels' => [
                    'status' => [
                        'pending' => neoclient_translate('pending'),
                        'completed' => neoclient_translate('completed'),
                        'cancelled' => neoclient_translate('cancelled'),
        wp_localize_script('neoclient-image-crop-js', 'neoclient_data', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('neoclient_nonce'),
            'user_role' => get_user_meta($user_id, 'neoclient_role', true) ?: 'free',
            'documents' => $documents
        ])
                    ],
                    'priority' => [
                        'low' => neoclient_translate('low'),
                        'medium' => neoclient_translate('medium'),
                        'high' => neoclient_translate('high'),
                    ],
                    'skin_type' => [
                        'dry' => neoclient_translate('dry'),
                        'oily' => neoclient_translate('oily'),
                        'normal' => neoclient_translate('normal'),
                        'combination' => neoclient_translate('combination'),
                        'sensitive' => neoclient_translate('sensitive'),
                        'unknown' => 'Unknown',
                    ],
                    'general' => [
                        'new_clients' => neoclient_translate('new_clients'),
                        'customer_growth' => neoclient_translate('customer_growth'),
                        'upcoming_appointments_by_priority' => neoclient_translate('upcoming_appointments_by_priority'),
                        'most_popular_services' => neoclient_translate('most_popular_services'),
                        'appointments_by_status' => neoclient_translate('appointments_by_status'),
                    ]
                ],
            ],
        ]);


        wp_enqueue_style('neoclient-font', NEOCLIENT_URL . 'Vazirmatn-Regular.woff2');

        // Enqueue Select2 CSS
        wp_enqueue_style('select2', 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css', array(), '4.0.13');

        // Enqueue Select2 JavaScript
        wp_enqueue_script('select2', 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js', array('jquery'), '4.0.13', true);
    }
}
add_action('wp_enqueue_scripts', 'neoclient_enqueue_scripts');

// Add admin menu page for referral codes
function neoclient_referral_codes_menu_page() {
    add_menu_page(
        'Referral Codes',
        'Referral Codes',
        'manage_options',
        'neoclient-referral-codes',
        'neoclient_referral_codes_page_content',
        'dashicons-groups',
        6
    );
}
add_action('admin_menu', 'neoclient_referral_codes_menu_page');

// Content for the referral codes admin page
function neoclient_referral_codes_page_content() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';

    $referrals = $wpdb->get_results("SELECT * FROM $table_name", ARRAY_A);

    echo '<div class="wrap">';
    echo '<h1>Referral Codes</h1>';
    echo '<table class="wp-list-table widefat fixed striped">';
    echo '<thead><tr><th>User ID</th><th>Username</th><th>Referral Code</th><th>Referred By Code</th><th>Referrer User ID</th><th>Referrer Username</th></tr></thead>';
    echo '<tbody>';

    if ($referrals) {
        foreach ($referrals as $referral) {
            $user = get_userdata($referral['user_id']);
            $username = $user ? $user->user_login : 'N/A';

            $referrer_user = get_userdata($referral['referrer_user_id']);
            $referrer_username = $referrer_user ? $referrer_user->user_login : 'N/A';

            echo '<tr>';
            echo '<td>' . esc_html($referral['user_id']) . '</td>';
            echo '<td>' . esc_html($username) . '</td>';
            echo '<td>' . esc_html($referral['referral_code']) . '</td>';
            echo '<td>' . esc_html($referral['referred_by_code']) . '</td>';
            echo '<td>' . esc_html($referral['referrer_user_id']) . '</td>';
            echo '<td>' . esc_html($referrer_username) . '</td>';
            echo '</tr>';
        }
    } else {
        echo '<tr><td colspan="5">No referral data found.</td></tr>';
    }

    echo '</tbody>';
    echo '</table>';
    echo '</div>';
}

// Hide admin bar for non-admins
add_action('after_setup_theme', function() {
    if (!current_user_can('administrator') && !is_admin()) {
        show_admin_bar(false);
    }
});

// Shortcode for frontend UI
function neoclient_shortcode() {
    $user_id = get_current_user_id();
    $user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
    $user_info = get_userdata($user_id);
    $first_name = get_user_meta($user_id, 'first_name', true);
    $last_name = get_user_meta($user_id, 'last_name', true);
    $phone = get_user_meta($user_id, 'phone', true);
    $clinic = get_user_meta($user_id, 'clinic', true);
    $city = get_user_meta($user_id, 'city', true);
    ob_start();
    ?>
    <div data-lang="en">
        <div id="neoclient-notification" class="neoclient-notification hidden"></div>
        <?php if (!is_user_logged_in()) { ?>
            <div id="login" class="neoclient-tab-content active">
                <div class="neoclient-content">
                    <div class="neoclient-card">
                        
                        <h2 <label><center>Client and Appointment Management System</center></label></h2>
                        <h8 <label><center>For Skin Therapists and Dermatologists</center></label></h8>
                        

                        
                        <form class="neoclient-form">
                            <label for="neoclient-login-username">Username or Email</label>
                            <input type="text" id="neoclient-login-username" required>
                            <label for="neoclient-login-password">Password</label>
                            <input type="password" id="neoclient-login-password" required>
                            <label><input type="checkbox" id="neoclient-show-password"> <span data-lang-key="show_password">Show Password</span></label>
                            <label><input type="checkbox" id="neoclient-remember-me"> <span data-lang-key="remember_me">Remember Me</span></label>
                            <div class="neoclient-form-actions">
                                <button id="neoclient-login-submit"><span data-lang-key="login">Login</span></button>
                            </div>
                            <div>
                                <a href="#" data-popup="forgot-password" data-lang-key="forgot_password">Forgot Password?</a> | 
                                <a href="#" data-popup="register" data-lang-key="register">Register</a> | 
                                <a href="https://neoclient.ir/information" target="_blank" class="neoclient-button">
                                    <span data-lang-key="information">About the App</span>
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <!-- Registration Popup -->
            <div id="register-popup" class="neoclient-popup hidden">
                <div class="neoclient-popup-content neoclient-card">
                    <h2 data-lang-key="register_title">Register</h2>
                    <div class="neoclient-form">
                        <label for="neoclient-register-first_name">First Name</label>
                        <input type="text" id="neoclient-register-first_name" placeholder="First Name" autocomplete="off">
                        <label for="neoclient-register-last_name">Last Name</label>
                        <input type="text" id="neoclient-register-last_name" placeholder="Last Name" autocomplete="off">
                        <label for="neoclient-register-email">Email</label>
                        <input type="email" id="neoclient-register-email" placeholder="Email" autocomplete="off">
                        <label for="neoclient-register-phone">Phone Number</label>
                        <input type="text" id="neoclient-register-phone" placeholder="Phone Number" autocomplete="off">
                        <label for="neoclient-register-password">Password</label>
                        <input type="password" id="neoclient-register-password" placeholder="Password" autocomplete="new-password">
<label for="neoclient-register-referral_code">Referral Code (Optional)</label>
<input type="text" id="neoclient-register-referral_code" placeholder="Referral Code" autocomplete="off">
<label for="neoclient-register-occupation">Occupation</label>
                        <select id="neoclient-register-occupation">
                            <option value="">Select</option>
                            <option value="skin_therapist">Skin Therapist</option>
                            <option value="hairdresser">Dermatologist</option>
                            <option value="nail_technician">Cosmetic Doctor</option>
                        </select>
                        <button id="neoclient-register-submit"><span data-lang-key="register">Register</span></button>
                    </div>
                </div>
            </div>
            <!-- Forgot Password Popup -->
            <div id="forgot-password-popup" class="neoclient-popup hidden">
                <div class="neoclient-popup-content neoclient-card">
                    <h2 data-lang-key="forgot_password_title">Reset Password</h2>
                    <div class="neoclient-form">
                        <label for="neoclient-forgot-email">Email</label>
                        <input type="email" id="neoclient-forgot-email" placeholder="Email" autocomplete="off">
                        <label for="neoclient-forgot-new-password">New Password</label>
                        <input type="password" id="neoclient-forgot-new-password" placeholder="New Password" autocomplete="new-password">
                        <label for="neoclient-forgot-confirm-password">Confirm Password</label>
                        <input type="password" id="neoclient-forgot-confirm-password" placeholder="Confirm Password" autocomplete="new-password">
                        <button id="neoclient-forgot-submit"><span data-lang-key="reset_password">Reset Password</span></button>
                    </div>
                </div>
            </div>
        <?php } else { ?>
            <div class="neoclient-wrapper">
                <div class="neoclient-content">
                    <div id="dashboard" class="neoclient-tab-content active">
                        <div class="neoclient-header">
                            <h2 data-lang-key="dashboard_title">Client Management System</h2>
                            <div id="neoclient-datetime" class="widget"></div>
                        </div>

                        <div class="neoclient-card">
                            <h3 data-lang-key="pending_appointments">Pending Appointments</h3>
                            <div id="pending-appointments" class="neoclient-list"></div>
                            <a href="#" class="neoclient-tab" data-tab="appointments"><span data-lang-key="manage_appointments">View More</span></a>
                        </div>

                        <div class="neoclient-quick-actions">
                            <button class="neoclient-button" data-popup="new-appointment">New Appointment</button>
                            <button class="neoclient-button" data-popup="new-document">New Document</button>
                        </div>

                        </div>

                    </div>
                    <!-- Appointments Tab -->
                    <div id="appointments" class="neoclient-tab-content">
                        <div class="neoclient-header">
                            <h2 data-lang-key="manage_appointments">Appointments</h2>
                            <button data-popup="new-appointment"><span class="neoclient-action-icon add"></span><span data-lang-key="new_appointment">New Appointment</span></button>
                        </div>
                        <div class="neoclient-filters">
                            <input type="text" id="appointment-filter" placeholder="Search..." autocomplete="off">
                            <select id="appointment-filter-status">
                                <option value="pending">Pending</option>
                                <option value="">All Statuses</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div id="appointment-list" class="neoclient-list"></div>
                    </div>
                    <!-- Documents Tab -->
                    <div id="documents" class="neoclient-tab-content">
                        <div class="neoclient-header">
                            <h2 data-lang-key="manage_documents">Manage Documents</h2>
                            <button data-popup="new-document"><span class="neoclient-action-icon add"></span><span data-lang-key="new_document">New Document</span></button>
                        </div>
                        <div class="neoclient-filters">
                            <input type="text" id="document-filter" placeholder="Search..." autocomplete="off">
                        </div>
                        <div id="document-list" class="neoclient-list"></div>
                    </div>
                    <!-- Reports Tab -->
                    <div id="reports" class="neoclient-tab-content">
                        <div class="neoclient-header">
                            <h2 data-lang-key="reports_title">Statistics</h2>
                        </div>
                        <div class="neoclient-filters">
                            <select id="report-filter-period">
                                <option value="month">Current Month</option>
                                <option value="quarter">Quarterly</option>
                                <option value="year">Current Year</option>
                                <option value="all" selected>All Data</option>
                            </select>
                        </div>

                        <div class="neoclient-stats">
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="total_clients">Number of Clients:</h3>
                                <p id="report-total-clients">0</p>
                            </div>
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="total_appointments">Number of Appointments:</h3>
                                <p id="report-total-appointments">0</p>
                            </div>
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="cancelled_appointments">Cancelled Appointments:</h3>
                                <p id="report-cancelled-appointments">0</p>
                            </div>
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="total_revenue">Total Revenue:</h3>
                                <p id="report-total-revenue">0</p>
                            </div>
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="best_month_by_revenue">Best Month by Revenue:</h3>
                                <p id="best-revenue-month"></p>
                            </div>
                            <div class="neoclient-stat neoclient-card">
                                <h3 data-lang-key="best_month_by_customers">Best Month by Customer Count:</h3>
                                <p id="best-customers-month"></p>
                            </div>
                        </div>
                        <h2>Statistics and Charts</h2>
                        <div class="neoclient-chart-container neoclient-card">
                            <canvas id="skin-types-chart"></canvas>
                            <canvas id="appointments-chart"></canvas>
                            <canvas id="revenue-chart"></canvas>
                            <canvas id="customers-chart"></canvas>
                            <canvas id="clients-chart"></canvas>
                            <canvas id="priority-chart"></canvas>
                            <canvas id="services-chart"></canvas>

                        </div>
                    </div>
                    <!-- Profile Tab -->
                    <div id="profile" class="neoclient-tab-content">
                        <h2 data-lang-key="profile_title">Profile</h2>
                        <form class="neoclient-form">
                            <label for="profile-first_name" data-lang-key="client_name">First Name</label>
                            <input type="text" id="profile-first_name" placeholder="First Name" autocomplete="off">
                            <label for="profile-last_name" data-lang-key="client_name">Last Name</label>
                            <input type="text" id="profile-last_name" placeholder="Last Name" autocomplete="off">
                            <label for="profile-email" data-lang-key="client_email">Email</label>
                            <input type="email" id="profile-email" placeholder="Email" autocomplete="off">
                            <label for="profile-phone" data-lang-key="client_phone">Phone</label>
                            <input type="text" id="profile-phone" placeholder="Phone" autocomplete="off">
                            <label for="profile-clinic_name">Clinic Name</label>
                            <input type="text" id="profile-clinic_name" placeholder="Clinic Name" autocomplete="off">
                            <label for="profile-city">City</label>
                            <input type="text" id="profile-city" placeholder="City" autocomplete="off">
                            <label for="profile-theme-style">Select Theme Style</label>
                            <select id="profile-theme-style">
                                <option value="default">Default</option>
                                <option value="esfahan">Esfahan</option>
                                <option value="night">Tehran</option>
                                <option value="qeshm">Qeshm</option>
                                <option value="abadan">Abadan</option>
                                <option value="sari">Sari</option>
                                <option value="rasht">Rasht</option>
                                <option value="yazd">Yazd</option>
                                <option value="day">Tabriz</option>
                            </select>
                            <label>Your Invitation Code:</label>
                            <input type="text" id="profile-referral-code" value="" readonly>

                            <label>With each successful invitation and the first subscription purchase by a new user, one month of free subscription will be added to your subscription.</label>
                            
                            <div class="neoclient-theme-toggle">
                                <input type="checkbox" id="theme-toggle" style="display: none;">
                                <label for="theme-toggle" class="theme-switch"></label>
                            </div>

                                
                                
                            <div class="neoclient-form-actions">
                                <label type="submit" id="profile-save" class="neoclient-button">
                                    <span id="profile-save-btn" class="neoclient-button-icon save"></span>
                                    <span data-lang-key="save"> </span>
                                </label>
                                
                                
                                
                                
                            </div>
                        </form>
                        <div class="neoclient-profile-actions">
                            <div class="neoclient-profile-action-group">
                                
                                <div class="neoclient-profile-action-group-item">
                                    <label class="neoclient-button" data-popup="change-password">
                                        <span class="neoclient-button-icon change-password"></span>
                                        <span data-lang-key="change_password">Change Password</span>
                                    </label>
                                </div>
                            </div>
                            <div class="neoclient-profile-action-group">
    <?php
    $user_id = get_current_user_id();
    $user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
    if ($user_role === 'superpro'): ?>
        <div class="neoclient-profile-action-group-item">
            <label class="neoclient-button neoclient-backup">
                <span class="neoclient-button-icon backup"></span>
                <span data-lang-key="backup">Backup (CSV)</span>
            </label>
        </div>
        <div class="neoclient-profile-action-group-item">
            <label class="neoclient-button" for="neoclient-restore">
                <input type="file" id="neoclient-restore" accept=".csv" style="display: none;">
                <span class="neoclient-button-icon restore"></span>
                <span data-lang-key="restore">Restore Backup</span>
            </label>
        </div>
    <?php else: ?>
        <div class="neoclient-profile-action-group-item">
            <label class="neoclient-button neoclient-disabled-feature">
                <span>To access the backup and restore service, you need to purchase a subscription.</span>

            </label>
        </div>
        <div class="neoclient-profile-action-group-item">
            <label class="neoclient-button neoclient-disabled-feature">
                <span class="neoclient-button-icon restore"></span>
            </label>
        </div>
    <?php endif; ?>
</div>
                            <div class="neoclient-profile-action-group">
                                <div class="neoclient-profile-action-group-item">
                                    <a href="https://neoclient.ir/support" target="_blank" class="neoclient-button">
                                        <span class="neoclient-button-icon support"></span>
                                        <span data-lang-key="support">Contact Support</span>
                                    </a>
                                </div>
                                <div class="neoclient-profile-action-group-item">
                                    <a href="https://neoclient.ir/premium" target="_blank" class="neoclient-button">
                                        <span class="neoclient-button-icon premium"></span>
                                        <span data-lang-key="upgrade_to_pro">Get Subscription</span>
                                    </a>
                                </div>
                                <div class="neoclient-profile-action-group-item">
                                    <a href="https://neoclient.ir/information" target="_blank" class="neoclient-button">
                                        <span class="neoclient-button-icon information"></span>
                                        <span data-lang-key="information">About the Program</span>
                                    </a>
                                </div>
                            </div>
                            <div class="neoclient-profile-action-group">
                                <div class="neoclient-profile-action-group-item">
                                    <label id="neoclient-logout" class="neoclient-button">
                                        <span class="neoclient-button-icon logout"></span>
                                        <span data-lang-key="logout">Logout</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Navigation Menu -->
                    <div class="neoclient-nav">
                        <div class="neoclient-nav-item" data-tab="appointments">
                            <span class="neoclient-tab-icon appointment"></span>
                            
                        </div>
                        <div class="neoclient-nav-item" data-tab="documents">
                            <span class="neoclient-tab-icon document"></span>
                            
                        </div>
                        <div class="neoclient-nav-item logo" data-tab="dashboard">
                            <span class="neoclient-tab-icon logo"></span>
                        </div>
                        <div class="neoclient-nav-item" data-tab="reports">
                            <span class="neoclient-tab-icon reports"></span>
                            
                        </div>
                        <div class="neoclient-nav-item" data-tab="profile">
                            <span class="neoclient-tab-icon users"></span>
                            
                        </div>
                    </div>
                    <div class="neoclient-footer-space"></div>
                </div>
            </div>
        <?php } ?>

        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const dateInputs = document.querySelectorAll('input[type="date"]');

                dateInputs.forEach(input => {
                    input.addEventListener('keydown', function(event) {
                        if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' ||
                            event.key === 'Escape' || event.key === 'Enter' ||
                            (event.key === 'ArrowLeft') || (event.key === 'ArrowRight') ||
                            (event.key === 'ArrowUp') || (event.key === 'ArrowDown')) {
                            return;
                        }
                        if (isNaN(event.key) && event.key !== '-') {
                            event.preventDefault();
                        }
                    });

                    input.addEventListener('paste', function(event) {
                        const paste = (event.clipboardData || window.clipboardData).getData('text');
                        const regex = /^[0-9\-]*$/;
                        if (!regex.test(paste)) {
                            event.preventDefault();
                        }
                    });
                });
            });

        </script>

        <!-- Popups -->
        <!-- New Appointment Popup -->
        <div id="new-appointment-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="new_appointment_title">New Appointment</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <label for="new-appointment-client_name">Client Name</label>
                    <input type="text" id="new-appointment-client_name" autocomplete="off">
                    <label for="new-appointment-date">Date</label>
                    <input type="text" id="new-appointment-date" placeholder="<?php echo neoclient_translate('date_placeholder'); ?>" required autocomplete="off">
                    <label for="new-appointment-time">Time</label>
                    <input type="time" id="new-appointment-time" autocomplete="off">
                    <label for="new-appointment-services">Services</label>
                    <input type="text" id="new-appointment-services" autocomplete="off">
                    <label for="new-appointment-priority">Priority</label>
                    <select id="new-appointment-priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <div class="neoclient-form-actions">
                        <button id="new-appointment-submit"><span class="neoclient-button-icon save"></span><span data-lang-key="save">Save</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="close">Cancel</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Edit Appointment Popup -->
        <div id="edit-appointment-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="edit_appointment_title">Edit Appointment</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <input type="hidden" id="edit-appointment-id">
                    <label for="edit-appointment-client_name">Client Name</label>
                    <input type="text" id="edit-appointment-client_name" autocomplete="off">
                    <label for="edit-appointment-date">Date</label>
                    <input type="text" id="edit-appointment-date" placeholder="<?php echo neoclient_translate('date_placeholder'); ?>" required autocomplete="off">
                    <label for="edit-appointment-time">Time</label>
                    <input type="time" id="edit-appointment-time" autocomplete="off">
                    <label for="edit-appointment-services">Services</label>
                    <input type="text" id="edit-appointment-services" autocomplete="off">
                    <label for="edit-appointment-priority">Priority</label>
                    <select id="edit-appointment-priority">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <label for="edit-appointment-status">Status</label>
                    <select id="edit-appointment-status">
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <label for="edit-appointment-amount">Amount</label>
                    <input type="number" id="edit-appointment-amount" autocomplete="off">
                    <label for="edit-appointment-notes">Notes</label>
                    <textarea id="edit-appointment-notes" autocomplete="off"></textarea>
                    <div class="neoclient-form-actions">
                        <button id="edit-appointment-submit"><span class="neoclient-button-icon save"></span><span data-lang-key="save_changes">Save Changes</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="close">Cancel</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- New Document Popup -->
        <div id="new-document-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="new_document_title">New Document</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <label for="new-document-client_name" title="Enter the client's full name">Client Name</label>
                    <input type="text" id="new-document-client_name" autocomplete="off">
                    <label for="new-document-birthdate" title="Enter the client's birthdate">Birthdate</label>
                    <input type="text" id="new-document-birthdate" autocomplete="off">
                    <label for="new-document-occupation" title="Enter the client's occupation">Occupation</label>
                    <input type="text" id="new-document-occupation" autocomplete="off">
                    <label for="new-document-client_phone" title="Enter the client's phone number">Phone Number</label>
                    <input type="text" id="new-document-client_phone" autocomplete="off">
                    <label for="new-document-client_email" title="Enter the client's email">Email</label>
                    <input type="email" id="new-document-client_email" autocomplete="off">
                    <label for="new-document-address" title="Enter the client's address">Address</label>
                    <input type="text" id="new-document-address" autocomplete="off">
                    <label for="new-document-skin_type" title="Select the client's skin type">Skin Type <span title="Select the client's skin type (e.g., dry, oily)" class="tooltip">?</span></label>
                    <select id="new-document-skin_type">
                        <option value="dry">Dry</option>
                        <option value="oily">Oily</option>
                        <option value="normal">Normal</option>
                        <option value="combination">Combination</option>
                        <option value="sensitive">Sensitive</option>
                    </select>
                    <label for="new-document-skin_concerns" title="Describe the client's skin concerns">Skin Concerns</label>
                    <textarea id="new-document-skin_concerns" autocomplete="off"></textarea>
                    <label for="new-document-sensitivities" title="Enter the client's diseases and sensitivities">Diseases and Sensitivities</label>
                    <textarea id="new-document-sensitivities" autocomplete="off"></textarea>
                    <label for="new-document-skin_tone" title="Select the client's skin tone">Skin Tone</label>
                    <select id="new-document-skin_tone">
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="dark">Dark</option>
                    </select>
                    <label for="new-document-hydration_level" title="Select the skin's hydration level">Hydration Level</label>
                    <select id="new-document-hydration_level">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <label for="new-document-acne_level" title="Enter the skin's acne level">Acne Level</label>
                    <input type="text" id="new-document-acne_level" autocomplete="off">
                    <label for="new-document-acne_prone_areas" title="Select acne-prone areas">Acne-Prone Areas:</label>
                    <div class="neoclient-dropdown-check-list" tabindex="0">
                        <span class="neoclient-dropdown-field" id="new-document-acne_prone_areas-display"></span>
                        <input type="hidden" id="new-document-acne_prone_areas" name="new-document-acne_prone_areas" value="">
                        <ul class="neoclient-dropdown-list">
                            <li><input type="checkbox" value="forehead" id="new-document-acne_prone_areas-forehead"><label for="new-document-acne_prone_areas-forehead">Forehead</label></li>
                            <li><input type="checkbox" value="between_eyebrows" id="new-document-acne_prone_areas-between_eyebrows"><label for="new-document-acne_prone_areas-between_eyebrows">Between Eyebrows</label></li>
                            <li><input type="checkbox" value="cheek" id="new-document-acne_prone_areas-cheek"><label for="new-document-acne_prone_areas-cheek">Cheek</label></li>
                            <li><input type="checkbox" value="under_cheek" id="new-document-acne_prone_areas-under_cheek"><label for="new-document-acne_prone_areas-under_cheek">Under Cheek</label></li>
                            <li><input type="checkbox" value="nose" id="new-document-acne_prone_areas-nose"><label for="new-document-acne_prone_areas-nose">Nose</label></li>
                            <li><input type="checkbox" value="arm" id="new-document-acne_prone_areas-arm"><label for="new-document-acne_prone_areas-arm">Arm</label></li>
                            <li><input type="checkbox" value="back" id="new-document-acne_prone_areas-back"><label for="new-document-acne_prone_areas-back">Back</label></li>
                            <li><input type="checkbox" value="buttocks" id="new-document-acne_prone_areas-buttocks"><label for="new-document-acne_prone_areas-buttocks">Buttocks</label></li>
                        </ul>
                    </div>

                    <label for="new-document-sun_exposure" title="Select sun exposure level">Sun Exposure</label>
                    <select id="new-document-sun_exposure">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <label for="new-document-skincare_routine" title="Enter the suggested skincare routine">Suggested Routine</label>
                    <textarea id="new-document-skincare_routine" autocomplete="off"></textarea>
                    <label for="new-document-purchased_products" title="Enter the products purchased by the client">Purchased Products</label>
                    <textarea id="new-document-purchased_products" autocomplete="off"></textarea>
                    <label for="new-document-skin_needs" title="Describe the client's skin needs">Skin Needs</label>
                    <textarea id="new-document-skin_needs" autocomplete="off"></textarea>
                    <label for="new-document-care_instructions" title="Enter care instructions">Care Instructions</label>
                    <textarea id="new-document-care_instructions" autocomplete="off"></textarea>
                    <label for="new-document-notes" title="Enter additional notes">Notes</label>
                    <textarea id="new-document-notes" autocomplete="off"></textarea>



                    <label for="new-document-fear_of_closed_spaces" title="Does the client have a fear of closed spaces?">Fear of Closed Spaces</label>
                    <select id="new-document-fear_of_closed_spaces">
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                    </select>

                    <label for="new-document-consumables" title="Select the client's consumables">Client's Consumables?</label>
                    <div class="neoclient-dropdown-check-list" tabindex="0">
                        <span class="neoclient-dropdown-field" id="new-document-consumables-display"></span>
                        <input type="hidden" id="new-document-consumables" name="new-document-consumables" value="">
                        <ul class="neoclient-dropdown-list">
                            <li><input type="checkbox" value="sober" id="new-document-consumables-sober"><label for="new-document-consumables-sober">Sober</label></li>
                            <li><input type="checkbox" value="cigarette" id="new-document-consumables-cigarette"><label for="new-document-consumables-cigarette">Cigarette</label></li>
                            <li><input type="checkbox" value="hookah" id="new-document-consumables-hookah"><label for="new-document-consumables-hookah">Hookah</label></li>
                            <li><input type="checkbox" value="alcohol" id="new-document-consumables-alcohol"><label for="new-document-consumables-alcohol">Alcohol</label></li>
                        </ul>
                    </div>

                    <label for="new-document-pregnancy_status" title="Select the client's pregnancy status">Pregnancy Status</label>
                    <select id="new-document-pregnancy_status">
                        <option value="NOTHING">None</option>
                        <option value="pregnant">Pregnant</option>
                        <option value="lactating">Lactating</option>
                    </select>
                    
                    
                    
                    
                    <?php
$user_id = get_current_user_id();
$user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
if ($user_role === 'pro' || $user_role === 'superpro'): ?>
    <label for="new-document-image">Upload New Image</label>
    <input type="file" id="new-document-image" accept="image/*">
<?php else: ?>
    <label>Upload New Image</label>
    <div class="neoclient-disabled-feature">Upgrade to access client image uploads.</div>
<?php endif; ?>
                    
                    

                    
                    <div class="neoclient-form-actions">
                        <button id="new-document-submit"><span class="neoclient-button-icon save"></span><span data-lang-key="save">Save</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="close">Cancel</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Edit Document Popup -->
        <div id="edit-document-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="edit_document_title">Edit Document</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <input type="hidden" id="edit-document-id">
                    <label for="edit-document-client_name">Client Name</label>
                    <input type="text" id="edit-document-client_name" autocomplete="off">
                    <label for="edit-document-birthdate">Birthdate</label>
                    <input type="text" id="edit-document-birthdate" placeholder="<?php echo neoclient_translate('date_placeholder'); ?>" autocomplete="off">
                    <label for="edit-document-occupation">Occupation</label>
                    <input type="text" id="edit-document-occupation" autocomplete="off">
                    <label for="edit-document-client_phone">Phone Number</label>
                    <input type="text" id="edit-document-client_phone" autocomplete="off">
                    <label for="edit-document-client_email">Email</label>
                    <input type="email" id="edit-document-client_email" autocomplete="off">
                    <label for="edit-document-skin_type">Skin Type <span title="Select the client's skin type (e.g., dry, oily)" class="tooltip">?</span></label>
                    <select id="edit-document-skin_type">
                        <option value="dry">Dry</option>
                        <option value="oily">Oily</option>
                        <option value="normal">Normal</option>
                        <option value="combination">Combination</option>
                        <option value="sensitive">Sensitive</option>
                    </select>
                    <label for="edit-document-skin_concerns">Skin Concerns</label>
                    <textarea id="edit-document-skin_concerns" autocomplete="off"></textarea>
                    <label for="edit-document-sensitivities">Diseases and Sensitivities</label>
                    <textarea id="edit-document-sensitivities" autocomplete="off"></textarea>
                    <label for="edit-document-skin_tone">Skin Tone</label>
                    <select id="edit-document-skin_tone">
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="dark">Dark</option>
                    </select>
                    <label for="edit-document-hydration_level">Hydration Level</label>
                    <select id="edit-document-hydration_level">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <label for="edit-document-acne_level">Acne Level</label>
                    <input type="text" id="edit-document-acne_level" autocomplete="off">
                    <label for="edit-document-acne_prone_areas">Acne-Prone Areas:</label>
                    <div class="neoclient-dropdown-check-list" tabindex="0">
                        <span class="neoclient-dropdown-field" id="edit-document-acne_prone_areas-display"></span>
                        <input type="hidden" id="edit-document-acne_prone_areas" name="edit-document-acne_prone_areas" value="">
                        <ul class="neoclient-dropdown-list">
                            <li><input type="checkbox" value="forehead" id="edit-document-acne_prone_areas-forehead"><label for="edit-document-acne_prone_areas-forehead">Forehead</label></li>
                            <li><input type="checkbox" value="between_eyebrows" id="edit-document-acne_prone_areas-between_eyebrows"><label for="edit-document-acne_prone_areas-between_eyebrows">Between Eyebrows</label></li>
                            <li><input type="checkbox" value="cheek" id="edit-document-acne_prone_areas-cheek"><label for="edit-document-acne_prone_areas-cheek">Cheek</label></li>
                            <li><input type="checkbox" value="under_cheek" id="edit-document-acne_prone_areas-under_cheek"><label for="edit-document-acne_prone_areas-under_cheek">Under Cheek</label></li>
                            <li><input type="checkbox" value="nose" id="edit-document-acne_prone_areas-nose"><label for="edit-document-acne_prone_areas-nose">Nose</label></li>
                            <li><input type="checkbox" value="arm" id="edit-document-acne_prone_areas-arm"><label for="edit-document-acne_prone_areas-arm">Arm</label></li>
                            <li><input type="checkbox" value="back" id="edit-document-acne_prone_areas-back"><label for="edit-document-acne_prone_areas-back">Back</label></li>
                            <li><input type="checkbox" value="buttocks" id="edit-document-acne_prone_areas-buttocks"><label for="edit-document-acne_prone_areas-buttocks">Buttocks</label></li>
                        </ul>
                    </div>

                    <label for="edit-document-sun_exposure">Sun Exposure</label>
                    <select id="edit-document-sun_exposure">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                    <label for="edit-document-skincare_routine">Suggested Routine</label>
                    <textarea id="edit-document-skincare_routine" autocomplete="off"></textarea>
                    <div id="ai-skincare-routine-output" class="neoclient-ai-output"></div>
                    
                    <label for="edit-document-purchased_products">Purchased Products</label>
                    <textarea id="edit-document-purchased_products" autocomplete="off"></textarea>
                    <div id="ai-product-recommendations-output" class="neoclient-ai-output"></div>
                    
                    <label for="edit-document-skin_needs">Skin Needs</label>
                    <textarea id="edit-document-skin_needs" autocomplete="off"></textarea>
                    <div id="ai-skin-analysis-output" class="neoclient-ai-output"></div>
                    <label for="edit-document-care_instructions">Care Instructions</label>
                    <textarea id="edit-document-care_instructions" autocomplete="off"></textarea>
                    

                    <label for="edit-document-address">Address</label>
                    <input type="text" id="edit-document-address" autocomplete="off">

                    <label for="edit-document-fear_of_closed_spaces">Fear of Closed Spaces</label>
                    <select id="edit-document-fear_of_closed_spaces">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>

                    <label for="edit-document-consumables">Client's Consumables?</label>
                    <div class="neoclient-dropdown-check-list" tabindex="0">
                        <span class="neoclient-dropdown-field" id="edit-document-consumables-display"></span>
                        <input type="hidden" id="edit-document-consumables" name="edit-document-consumables" value="">
                        <ul class="neoclient-dropdown-list">
                            <li><input type="checkbox" value="sober" id="edit-document-consumables-sober"><label for="edit-document-consumables-sober">Sober</label></li>
                            <li><input type="checkbox" value="cigarette" id="edit-document-consumables-cigarette"><label for="edit-document-consumables-cigarette">Cigarette</label></li>
                            <li><input type="checkbox" value="hookah" id="edit-document-consumables-hookah"><label for="edit-document-consumables-hookah">Hookah</label></li>
                            <li><input type="checkbox" value="alcohol" id="edit-document-consumables-alcohol"><label for="edit-document-consumables-alcohol">Alcohol</label></li>
                        </ul>
                    </div>

                    <label for="edit-document-pregnancy_status">Pregnancy Status</label>
                    <select id="edit-document-pregnancy_status">
                        <option value="pregnant">Pregnant</option>
                        <option value="lactating">Lactating</option>
                    </select>

<?php
$user_id = get_current_user_id();
$user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
if ($user_role === 'pro' || $user_role === 'superpro'): ?>
    <label for="edit-document-image">Upload New Image</label>
    <input type="file" id="edit-document-image" accept="image/*">
<?php else: ?>
    <label>Upload New Image</label>
    <div class="neoclient-disabled-feature">Upgrade to access client image uploads.</div>
<?php endif; ?>
                    
                    
                    
                    <div class="neoclient-form-actions">
                        <button id="edit-document-submit"><span class="neoclient-button-icon save"></span><span data-lang-key="save_changes">Save</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="close">Cancel</span></button>
                        <button id="view-client-appointments" class="neoclient-button"><span data-lang-key="view_client_appointments">View Client Appointments</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- View Appointment Popup -->
        <div id="view-appointment-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-popup-actions">
                    <button class="neoclient-button neoclient-edit-appointment" data-popup="edit-appointment"><span data-lang-key="edit">Edit</span></button>
                    <button class="neoclient-button neoclient-delete-appointment" data-popup="confirm-delete-appointment"><span data-lang-key="delete">Delete</span></button>
                </div>
                <h2 data-lang-key="view_appointment_title">View Appointment</h2>
                <div id="view-appointment-content"></div>
            </div>
        </div>
        <!-- View Document Popup -->
        <div id="view-document-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-popup-actions">
                    <button class="neoclient-button neoclient-edit-document" data-popup="edit-document"><span data-lang-key="edit">Edit</span></button>
                    <button class="neoclient-button neoclient-delete-document" data-popup="confirm-delete-document"><span data-lang-key="delete">Delete</span></button>
                </div>
                <h2 data-lang-key="view_document_title">View Document</h2>
                <div id="view-document-content"></div>
            </div>
        </div>
        <!-- Confirm Delete Appointment Popup -->
        <div id="confirm-delete-appointment-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="confirm_delete_appointment_title">Confirm Delete Appointment</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <p>Are you sure you want to delete this appointment?</p>
                    <input type="hidden" id="confirm-delete-appointment-id">
                    <div class="neoclient-form-actions">
                        <button id="confirm-delete-appointment-yes"><span data-lang-key="yes">Yes</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="no">No</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Confirm Delete Document Popup -->
        <div id="confirm-delete-document-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="confirm_delete_document_title">Confirm Delete Document</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <p>Are you sure you want to delete this document?</p>
                    <input type="hidden" id="confirm-delete-document-id">
                    <div class="neoclient-form-actions">
                        <button id="confirm-delete-document-yes"><span data-lang-key="yes">Yes</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="no">No</span></button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Confirm Client Popup -->
        <div id="confirm-client-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="confirm_client_title">Confirm Client</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <p>A document with the name <strong id="confirm-client-name-new"></strong> was not found. Do you want to create a new document for this client?</p>
                    <div class="neoclient-popup-actions">
                        <button id="confirm-client-yes" class="neoclient-button">Yes, create new document</button>
                        <button id="confirm-client-no" class="neoclient-button neoclient-button-secondary">No</button>
                    </div>
                </div>
            </div>
        </div>
        <!-- Confirm Returning Client Popup -->
        <div id="confirm-returning-client-popup" class="neoclient-popup" style="display:none;">
            <div class="neoclient-popup-content">
                <span class="neoclient-popup-close">×</span>
                <h3>Existing Client</h3>
                <p>A document with the name <strong id="confirm-returning-client-name"></strong> already exists. Is this appointment for the same client?</p>
                <div class="neoclient-popup-actions">
                    <button id="confirm-returning-client-yes" class="neoclient-button">Yes, same client</button>
                    <button id="confirm-returning-client-no" class="neoclient-button neoclient-button-secondary">No, new client</button>
                </div>
            </div>
        </div>
        <!-- Change Password Popup -->
        <div id="change-password-popup" class="neoclient-popup hidden">
            <div class="neoclient-popup-content neoclient-card">
                <h2 data-lang-key="change_password_title">Change Password</h2>
                <button class="neoclient-close-popup"><span class="neoclient-button-icon close"></span></button>
                <div class="neoclient-form">
                    <label for="change-password-new">New Password</label>
                    <input type="password" id="change-password-new" placeholder="New Password" autocomplete="new-password">
                    <label for="change-password-confirm">Confirm Password</label>
                    <input type="password" id="change-password-confirm" placeholder="Confirm Password" autocomplete="new-password">
                    <div class="neoclient-form-actions">
                        <button id="change-password-submit"><span class="neoclient-button-icon save"></span><span data-lang-key="save">Save</span></button>
                        <button class="neoclient-close-popup"><span data-lang-key="close">Cancel</span></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var dateTimeDiv = document.getElementById('neoclient-datetime');
            if (dateTimeDiv && dateTimeDiv.classList.contains('dashboard-date-time')) {
                function updateDateTime() {
                    var now = new Date();
                    var options = {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    };
                    dateTimeDiv.textContent = new Intl.DateTimeFormat('en-US', options).format(now);
                }
                updateDateTime();
                setInterval(updateDateTime, 1000);
            }
        });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('neoclient', 'neoclient_shortcode');

// Admin Menu
function neoclient_admin_menu() {
    add_menu_page('NeoClient', 'NeoClient', 'manage_options', 'neoclient', 'neoclient_admin_page', 'dashicons-admin-users');
}
add_action('admin_menu', 'neoclient_admin_menu');

function neoclient_admin_profiles_page() {
    // Fetch all user profiles (documents and appointments from DB)
    global $wpdb;
    $profiles = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}neoclient_documents");
    echo '<div class="wrap"><h1>User Profiles</h1>';
    if ($profiles) {
        echo '<table class="wp-list-table widefat fixed striped"><thead><tr><th>Client Name</th><th>Birthdate</th><th>Actions</th></tr></thead><tbody>';
        foreach ($profiles as $profile) {
            echo '<tr><td>' . esc_html($profile->client_name) . '</td><td>' . esc_html($profile->birthdate) . '</td><td><a href="#">Edit</a> | <a href="#">View</a></td></tr>';
        }
        echo '</tbody></table>';
    } else {
        echo '<p>No profiles found.</p>';
    }
    echo '</div>';
}

function neoclient_add_admin_menu() {
    add_menu_page('NeoClient Profiles', 'Profiles', 'manage_options', 'neoclient-profiles', 'neoclient_admin_profiles_page', 'dashicons-id');
}
add_action('admin_menu', 'neoclient_add_admin_menu');

function neoclient_admin_page() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized access');
    }

    if (isset($_POST['neoclient_notification_submit'])) {
        $message = sanitize_text_field($_POST['notification_message']);
        $users = isset($_POST['notification_users']) ? array_map('intval', $_POST['notification_users']) : 'all';
        
        $args = ['fields' => 'ID'];
        if ($users !== 'all') {
            $args['include'] = $users;
        }
        $all_users = get_users($args);

        foreach ($all_users as $user_id) {
            $notifications = get_user_meta($user_id, 'neoclient_notifications', true) ?: [];
            $notifications[] = [
                'message' => $message,
                'seen' => false,
                'timestamp' => current_time('mysql'),
            ];
            update_user_meta($user_id, 'neoclient_notifications', $notifications);
        }
        echo '<div class="updated"><p>Notification sent successfully.</p></div>';
    }

    if (isset($_POST['neoclient_role_submit'])) {
        $user_id = intval($_POST['user_id']);
        $role = sanitize_text_field($_POST['neoclient_role']);
        update_user_meta($user_id, 'neoclient_role', $role);
        echo '<div class="updated"><p>User role updated.</p></div>';
    }

    $users = get_users();
    ?>
    <div class="wrap">
        <h1>NeoClient Management</h1>
        <h2>Send Notification</h2>
        <form method="post">
            <label for="notification_message">Notification Message</label>
            <textarea id="notification_message" name="notification_message" rows="4" style="width:100%" autocomplete="off"></textarea>
            <label for="notification_users">Users</label>
            <select name="notification_users[]" multiple style="width:100%;height:150px;">
                <option value="all">All Users</option>
                <?php foreach ($users as $user) : ?>
                    <option value="<?php echo $user->ID; ?>"><?php echo esc_html($user->display_name); ?></option>
                <?php endforeach; ?>
            </select>
            <input type="submit" name="neoclient_notification_submit" class="button button-primary" value="Send Notification">
        </form>
        <h2>Users</h2>
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Referral Code</th>
                    <th>Referred By Code</th>
                    <th>Referred Count</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $user) : 
                    $role = get_user_meta($user->ID, 'neoclient_role', true) ?: 'free';
                    global $wpdb;
                    $referral_data = $wpdb->get_row($wpdb->prepare("SELECT referral_code, referred_by_code, referred_count FROM {$wpdb->prefix}neoclient_referrals WHERE user_id = %d", $user->ID));
                    $referral_code = $referral_data ? $referral_data->referral_code : 'N/A';
                    $referred_by_code = $referral_data ? ($referral_data->referred_by_code ?: 'N/A') : 'N/A';
                    $referred_count = $referral_data ? $referral_data->referred_count : 0;
                ?>
                    <tr>
                        <td><?php echo esc_html($user->display_name); ?></td>
                        <td><?php echo esc_html($user->user_email); ?></td>
                        <td><?php echo esc_html($role); ?></td>
                        <td><?php echo esc_html($referral_code); ?></td>
                        <td><?php echo esc_html($referred_by_code); ?></td>
                        <td><?php echo esc_html($referred_count); ?></td>
                        <td>
                            <button class="neoclient-view-details" data-user-id="<?php echo $user->ID; ?>">Details</button>
                            <form method="post" style="display:inline;">
                                <input type="hidden" name="user_id" value="<?php echo $user->ID; ?>">
                                <select name="neoclient_role">
                                    <option value="free" <?php selected($role, 'free'); ?>>Free</option>
                                    <option value="pro" <?php selected($role, 'pro'); ?>>Pro</option>
                                    <option value="superpro" <?php selected($role, 'superpro'); ?>>SuperPro</option>
                                </select>
                                <input type="submit" name="neoclient_role_submit" class="button" value="Update">
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>

            </tbody>
        </table>
        <div id="neoclient-user-details" class="neoclient-user-details hidden">
            <h2 data-lang-key="user_details_title">User Details</h2>
            <div id="neoclient-user-info"></div>
            <h3>Appointments</h3>
            <div id="neoclient-user-appointments" class="neoclient-list"></div>
            <h3>Documents</h3>
            <div id="neoclient-user-documents" class="neoclient-list"></div>
        </div>
    </div>
    <?php
}

// AJAX Action Handler
function neoclient_action_callback() {
    // Check for neoclient_action parameter
    if (!isset($_POST['neoclient_action'])) {
        wp_send_json_error(['message' => 'neoclient_action parameter is missing'], 400);
        wp_die();
    }

    // Validate nonce
    if (!check_ajax_referer('neoclient_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => 'Invalid nonce'], 403);
        wp_die();
    }

    $action = sanitize_text_field($_POST['neoclient_action']);
    $user_id = get_current_user_id();



    $user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';

    switch ($action) {
        case 'login':
            // Check for required parameters
            if (!isset($_POST['username']) || !isset($_POST['password'])) {
                wp_send_json_error(['message' => 'Username or password not provided.'], 400);
                wp_die();
            }

            $username = sanitize_text_field($_POST['username']);
            $password = sanitize_text_field($_POST['password']);
            $remember = isset($_POST['remember']) && $_POST['remember'] === 'true';

            $creds = [
                'user_login' => $username,
                'user_password' => $password,
                'remember' => $remember,
            ];

            $user = wp_signon($creds, is_ssl());
if (is_wp_error($user)) {
    $error_message = $user->get_error_code() === 'invalid_username' || $user->get_error_code() === 'invalid_email' 
        ? 'Your username (email) is not entered correctly' 
        : $user->get_error_message();
    wp_send_json_error(['message' => $error_message], 401);

            } else {
                wp_set_current_user($user->ID);
                wp_send_json_success(['message' => 'Login successful.']);
            }
            break;

        case 'register':
            $first_name = sanitize_text_field($_POST['first_name'] ?? '');
            $last_name = sanitize_text_field($_POST['last_name'] ?? '');
            $email = sanitize_email($_POST['email']);
            $phone = sanitize_text_field($_POST['phone'] ?? '');
            $password = sanitize_text_field($_POST['password']);
            $referral_code = sanitize_text_field($_POST['referral_code'] ?? '');

            if (!empty($referral_code)) {
                global $wpdb;
                $table_name = $wpdb->prefix . 'neoclient_referrals';
                $valid_code = $wpdb->get_var($wpdb->prepare("SELECT referral_code FROM $table_name WHERE referral_code = %s", $referral_code));
                if (!$valid_code) {
                    wp_send_json_error(['message' => 'The entered referral code is invalid.'], 400);
                    wp_die();
                }
            }

            if (email_exists($email)) {
                wp_send_json_error(['message' => 'You just need to log in to your account'], 400);
                wp_die();
            }

            $user_id = wp_create_user($email, $password, $email);
            if (is_wp_error($user_id)) {
                wp_send_json_error($user_id->get_error_message(), 400);
                wp_die();
            } else {
                update_user_meta($user_id, 'first_name', $first_name);
                update_user_meta($user_id, 'last_name', $last_name);
                update_user_meta($user_id, 'phone', $phone);
                update_user_meta($user_id, 'clinic_name', sanitize_text_field($_POST['clinic_name'] ?? ''));
                update_user_meta($user_id, 'city', sanitize_text_field($_POST['city'] ?? ''));
                update_user_meta($user_id, 'theme_style', sanitize_text_field($_POST['theme_style'] ?? 'default'));
                update_user_meta($user_id, 'occupation', sanitize_text_field($_POST['occupation'] ?? ''));
                update_user_meta($user_id, 'neoclient_role', 'free');

                // Store referral code if provided and valid
                if (!empty($referral_code) && $valid_code) {
                    neoclient_set_referrer_for_new_user($user_id, $referral_code);
                }

                wp_set_auth_cookie($user_id, true, is_ssl());
                wp_set_current_user($user_id);
                wp_send_json_success(['message' => 'Registration successful.']);
            }
            break;

        case 'forgot_password':
            $email = sanitize_email($_POST['email']);
            $new_password = sanitize_text_field($_POST['new_password']);
            $confirm_password = sanitize_text_field($_POST['confirm_password']);

            if ($new_password !== $confirm_password) {
                wp_send_json_error('Passwords do not match.', 400);
                wp_die();
            }

            $user = get_user_by('email', $email);
            if (!$user) {
                wp_send_json_error('User with this email not found.', 404);
                wp_die();
            }

            wp_set_password($new_password, $user->ID);
            wp_send_json_success(['message' => 'Password reset successfully.']);
            break;

        case 'change_password':
            $new_password = sanitize_text_field($_POST['new_password']);
            $confirm_password = sanitize_text_field($_POST['confirm_password']);

            if ($new_password !== $confirm_password) {
                wp_send_json_error('Passwords do not match.', 400);
                wp_die();
            }

            wp_set_password($new_password, $user_id);
            wp_send_json_success(['message' => 'Password changed successfully.']);
            break;

        case 'get_user_profile':
            $user_data = get_userdata($user_id);
            if (!$user_data) {
                wp_send_json_error('User not found.', 404);
                wp_die();
            }

            $profile_data = [
                'first_name' => get_user_meta($user_id, 'first_name', true),
                'last_name' => get_user_meta($user_id, 'last_name', true),
                'email' => $user_data->user_email,
                'phone' => get_user_meta($user_id, 'phone', true),
                'clinic_name' => get_user_meta($user_id, 'clinic_name', true),
                'city' => get_user_meta($user_id, 'city', true),
                'theme_style' => get_user_meta($user_id, 'theme_style', true),
                'referral_code' => neoclient_get_referral_code($user_id),
            ];
            wp_send_json_success($profile_data);
            break;

        case 'update_user_profile':
            $first_name = sanitize_text_field($_POST['first_name'] ?? '');
            $last_name = sanitize_text_field($_POST['last_name'] ?? '');
            $email = sanitize_email($_POST['email']);
            $phone = sanitize_text_field($_POST['phone'] ?? '');
            $clinic_name = sanitize_text_field($_POST['clinic_name'] ?? '');
            $city = sanitize_text_field($_POST['city'] ?? '');
            $theme_style = sanitize_text_field($_POST['theme_style'] ?? 'default');

            $current_user_data = get_userdata($user_id);
            if ($current_user_data->user_email !== $email && email_exists($email)) {
                wp_send_json_error('This email is already registered by another user.', 400);
                wp_die();
            }

            wp_update_user([
                'ID' => $user_id,
                'user_email' => $email,
            ]);

            update_user_meta($user_id, 'first_name', $first_name);
            update_user_meta($user_id, 'last_name', $last_name);
            update_user_meta($user_id, 'phone', $phone);
            update_user_meta($user_id, 'clinic_name', $clinic_name);
            update_user_meta($user_id, 'city', $city);
            update_user_meta($user_id, 'theme_style', $theme_style);

            wp_send_json_success(['message' => 'Profile updated successfully.']);
            break;

        case 'logout':
            wp_logout();
            wp_send_json_success(['message' => 'Logged out successfully.']);
            break;

        case 'new_appointment':
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            if ($user_role === 'free' && count($appointments) >= 1000) {
                wp_send_json_error('Your account access is limited. <a href="https://neoclient.ir/premium">Please upgrade to the Pro plan.</a>', 403);
                wp_die();
            }

            $client_name = sanitize_text_field($_POST['client_name']);
            $date = sanitize_text_field($_POST['date']);
            $time = sanitize_text_field($_POST['time']);
            $services = sanitize_text_field($_POST['services']);
            $priority = sanitize_text_field($_POST['priority']);
            $appointment_id = wp_generate_uuid4();

            $new_appointment = [
                'id' => $appointment_id,
                'client_name' => $client_name,
                'date' => $date,
                'time' => $time,
                'services' => $services,
                'priority' => $priority,
                'status' => 'pending',
                'amount' => 0,
                'notes' => '',
            ];

// چک کردن وجود قبل از به روزرسانی
if (!empty($new_appointment)) {
    $appointments[] = $new_appointment;
    update_user_meta($user_id, 'neoclient_appointments', $appointments);
}

            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            foreach ($documents as &$doc) {
                if (isset($doc['consumables']) && !is_string($doc['consumables'])) {
                    $doc['consumables'] = json_encode((array)$doc['consumables']);
                }
            }




























            $document_exists = false;
            foreach ($documents as $doc) {
                if (isset($doc['client_name']) && strtolower($doc['client_name']) === strtolower($client_name)) {
                    $document_exists = true;
                    break;
                }
            }

            if ($document_exists) {
                wp_send_json_success(['confirm_client' => true, 'client_name' => $client_name]);
            } else {
                wp_send_json_success(['message' => 'Appointment successfully registered.']);
            }
            break;

        case 'add_appointment_to_existing_client':
            $appointment_id = sanitize_text_field($_POST['appointment_id']);
            $client_name = sanitize_text_field($_POST['client_name']);
            $date = sanitize_text_field($_POST['date']);
            $time = sanitize_text_field($_POST['time']);
            $services = sanitize_text_field($_POST['services']);
            $priority = sanitize_text_field($_POST['priority']);
            $status = sanitize_text_field($_POST['status']);
            $amount = intval($_POST['amount']);
            $notes = sanitize_textarea_field($_POST['notes']);

            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $doc_index = -1;
            foreach ($documents as $index => $doc) {
                if (isset($doc['client_name']) && strtolower($doc['client_name']) === strtolower($client_name)) {
                    $doc_index = $index;
                    break;
                }
            }

            if ($doc_index !== -1) {
                $history_item = [
                    'id' => $appointment_id,
                    'client_name' => $client_name,
                    'date' => $date,
                    'time' => $time,
                    'services' => $services,
                    'priority' => $priority,
                    'status' => $status,
                    'amount' => $amount,
                    'notes' => $notes,
                ];

                if (!isset($documents[$doc_index]['history'])) {
                    $documents[$doc_index]['history'] = [];
                }

                $history_exists = false;
                foreach ($documents[$doc_index]['history'] as &$existing_history_item) {
                    if (isset($existing_history_item['id']) && $existing_history_item['id'] === $appointment_id) {
                        $existing_history_item = $history_item; // Update existing entry
                        $history_exists = true;
                        break;
                    }
                }

                if (!$history_exists) {
                    array_unshift($documents[$doc_index]['history'], $history_item); // Add new entry
                }

                // Sort history by date safely for Jalali dates
usort($documents[$doc_index]['history'], function($a, $b) {
    $dateA = isset($a['date']) ? str_replace('/', '-', $a['date']) : '0000-00-00';
    $dateB = isset($b['date']) ? str_replace('/', '-', $b['date']) : '0000-00-00';
    return strtotime($dateA) - strtotime($dateB);
});

                error_log('Before update_user_meta in add_appointment_to_existing_client: ' . print_r($documents[$doc_index]['history'], true));
                $result = update_user_meta($user_id, 'neoclient_documents', $documents);
                if ($result === false) {
                    wp_send_json_error('Error updating document information.');
                }

// Update the appointment in neoclient_appointments
                $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
                foreach ($appointments as &$appt) {
                    if ($appt['id'] === $appointment_id) {
                        $appt = $history_item;
                        break;
                    }
                }
                update_user_meta($user_id, 'neoclient_appointments', $appointments);

                wp_send_json_success(['message' => 'Appointment successfully added to client file.']);
            } else {
                wp_send_json_error('Client file not found.', 404);
            }
            break;

        case 'edit_appointment':
            global $wpdb;
            $appointment_id = sanitize_text_field($_POST['appointment_id']);
            $client_name = sanitize_text_field($_POST['client_name']);
            $date = sanitize_text_field($_POST['date']);
            $time = sanitize_text_field($_POST['time']);
            $services = sanitize_text_field($_POST['services']);
            $priority = sanitize_text_field($_POST['priority']);
            $status = sanitize_text_field($_POST['status']);
            $amount = intval($_POST['amount']);
            $notes = sanitize_textarea_field($_POST['notes']);

            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $updated_appointment = null;
            foreach ($appointments as &$appt) {
                if ($appt['id'] === $appointment_id) {
                    $appt['client_name'] = $client_name;
                    $appt['date'] = $date;
                    $appt['time'] = $time;
                    $appt['services'] = $services;
                    $appt['priority'] = $priority;
                    $appt['status'] = $status;
                    $appt['amount'] = $amount;
                    $appt['notes'] = $notes;
                    $updated_appointment = $appt;
                    break;
                }
            }
            update_user_meta($user_id, 'neoclient_appointments', $appointments);
            error_log('NeoClient Debug: edit_appointment - Appointment updated in user meta. Status: ' . $status);

            // Check if status is completed or cancelled to create/update document
            if ($status === 'completed' || $status === 'cancelled') {
                error_log('NeoClient Debug: edit_appointment - Status is completed or cancelled. Proceeding with document check.');
                $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
                foreach ($documents as &$doc) {
                    if (isset($doc['consumables']) && !is_string($doc['consumables'])) {
                        $doc['consumables'] = json_encode((array)$doc['consumables']);
                    }
                }
                $document_found = false;
                $doc_id = '';

                // Try to find an existing document for the client
                error_log('NeoClient Debug: edit_appointment - Searching for existing document for client: ' . $client_name);
                foreach ($documents as &$doc) {
                    if (isset($doc['client_name']) && strtolower($doc['client_name']) === strtolower($client_name)) {
                        $document_found = true;
                        $doc_id = $doc['id'];
                        error_log('NeoClient Debug: edit_appointment - Found existing document with ID: ' . $doc_id);
                        if (!isset($doc['history'])) {
                            $doc['history'] = [];
                            error_log('NeoClient Debug: edit_appointment - Document history was empty, initialized.');
                        }
                        // Add or update the appointment in the document's history
                        $history_item_exists = false;
                        foreach ($doc['history'] as &$history_item) {
                            if (isset($history_item['id']) && $history_item['id'] === $appointment_id) {
                                $history_item = $updated_appointment;
                                $history_item_exists = true;
                                error_log('NeoClient Debug: edit_appointment - Updated existing history item for appointment ID: ' . $appointment_id);
                                break;
                            }
                        }
                        if (!$history_item_exists) {
                            $doc['history'][] = $updated_appointment;
                            error_log('NeoClient Debug: edit_appointment - Added new history item for appointment ID: ' . $appointment_id);
                        }
                        // Sort history by date safely for Jalali dates
                        usort($doc['history'], function($a, $b) {
                            $dateA = isset($a['date']) ? str_replace('/', '-', $a['date']) : '0000-00-00';
                            $dateB = isset($b['date']) ? str_replace('/', '-', $b['date']) : '0000-00-00';
                            return strtotime($dateA) - strtotime($dateB);
                        });
                        error_log('NeoClient Debug: edit_appointment - Document history sorted.');

                        // Construct the appointment summary string
                        $appointment_summary_text = sprintf(
                            "Date: %s, Services: %s, Amount: %s, Status: %s%s",
                            $updated_appointment['date'],
                            $updated_appointment['services'],
                            ($updated_appointment['amount'] > 0 ? $updated_appointment['amount'] . ' Tomans' : 'Free'),
                            $updated_appointment['status'],
                            !empty($updated_appointment['notes']) ? ', Notes: ' . $updated_appointment['notes'] : ''
                        );

                        // Add a unique marker to prevent duplicate entries for the same appointment
                        $summary_marker = '[APPT_SUMMARY_ID:' . $updated_appointment['id'] . ']';

                        // Ensure notes field exists and is a string
                        if (!isset($doc['notes']) || !is_string($doc['notes'])) {
                            $doc['notes'] = '';
                        }

                        // Check if this specific appointment summary already exists in the notes
                        if (strpos($doc['notes'], $summary_marker) === false) {
                            if (!empty($doc['notes'])) {
                                $doc['notes'] .= "\n"; // Add a new line if notes already exist
                            }
                            $doc['notes'] .= $appointment_summary_text . ' ' . $summary_marker; // Append with marker
                        }


                        $update_result = update_user_meta($user_id, 'neoclient_documents', $documents);
                        if ($update_result === false) {
                            error_log('NeoClient Error: edit_appointment - update_user_meta for neoclient_documents returned false. Data might be too large or malformed.');
                        } else {
                            error_log('NeoClient Debug: edit_appointment - update_user_meta for neoclient_documents successful. Result: ' . ($update_result ? 'true' : 'false'));
                        }
                        break;
                    }
                }

                if (!$document_found) {
                    error_log('NeoClient Debug: edit_appointment - No existing document found for client. Creating new document.');
                    // Create a new document if one doesn't exist
                    $doc_id = wp_generate_uuid4();
                    $new_document = [
                        'id' => $doc_id,
                        'client_name' => $client_name,
                        'birthdate' => '', 'occupation' => '', 'client_phone' => '', 'client_email' => '',
                        'skin_type' => '', 'skin_concerns' => '', 'sensitivities' => '', 'skin_tone' => '',
                        'hydration_level' => '', 'acne_level' => '', 'sun_exposure' => '', 'skincare_routine' => '',
                        'purchased_products' => '', 'skin_needs' => '', 'care_instructions' => '', 'notes' => '',
                        'address' => '', 'fear_of_closed_spaces' => '', 'consumables' => '[]', 'pregnancy_status' => '',
                        'image' => '',
                        'history' => [$updated_appointment],
                    ];

            // Check for new image upload
            if (!empty($_FILES['image']['name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $upload = wp_handle_upload($_FILES['image'], ['test_form' => false]);
                if ($upload && !isset($upload['error'])) {
                    $new_document['image'] = $upload['url'];
                } else {
                    wp_send_json_error(['message' => 'Error uploading image.'], 400);
                    wp_die();
                }
            }

            $documents[] = $new_document;

                    $update_result = update_user_meta($user_id, 'neoclient_documents', $documents);
                    if ($update_result === false) {
                        error_log('NeoClient Error: edit_appointment - update_user_meta for new neoclient_documents returned false. Data might be too large or malformed.');
                    } else {
                        error_log('NeoClient Debug: edit_appointment - update_user_meta for new neoclient_documents successful. Result: ' . ($update_result ? 'true' : 'false'));
                    }
                    error_log('NeoClient Debug: edit_appointment - New document created with ID: ' . $doc_id);

                    // Insert into neoclient_documents table
                    $insert_doc_result = $wpdb->insert(
                        $wpdb->prefix . 'neoclient_documents',
                        [
                            'id' => $doc_id,
                            'user_id' => $user_id,
                            'client_name' => $client_name,
                            'created_at' => current_time('mysql'),
                        ]
                    );
                    if ($insert_doc_result) {
                        error_log('NeoClient Debug: edit_appointment - Document inserted into neoclient_documents table.');
                    } else {
                        error_log('NeoClient Error: edit_appointment - Failed to insert document into neoclient_documents table. Error: ' . $wpdb->last_error);
                    }

                    // Add event to neoclient_history table
                    $insert_history_doc_result = $wpdb->insert(
                        $wpdb->prefix . 'neoclient_history',
                        [
                            'user_id' => $user_id,
                            'document_id' => $doc_id,
                            'event_type' => 'document_created_from_appointment',
                            'event_data' => json_encode(['client_name' => $client_name, 'appointment_id' => $appointment_id, 'status' => $status]),
                            'event_date' => current_time('mysql'),
                        ]
                    );
                    if ($insert_history_doc_result) {
                        error_log('NeoClient Debug: edit_appointment - Document creation event added to neoclient_history table.');
                    } else {
                        error_log('NeoClient Error: edit_appointment - Failed to insert document creation event into neoclient_history table. Error: ' . $wpdb->last_error);
                    }
                }



                // Add event to neoclient_history table for appointment status change
                $insert_history_status_result = $wpdb->insert(
                    $wpdb->prefix . 'neoclient_history',
                    [
                        'user_id' => $user_id,
                        'document_id' => $doc_id,
                        'appointment_id' => $appointment_id,
                        'event_type' => 'appointment_status_changed_to_' . $status,
                        'event_data' => json_encode($updated_appointment),
                        'event_date' => current_time('mysql'),
                    ]
                );
                if ($insert_history_status_result) {
                    error_log('NeoClient Debug: edit_appointment - Appointment status change event added to neoclient_history table.');
                } else {
                    error_log('NeoClient Error: edit_appointment - Failed to insert appointment status change event into neoclient_history table. Error: ' . $wpdb->last_error);
                }
            }

            wp_send_json_success(['message' => 'Appointment successfully edited.']);
            break;

        case 'add_appointment_to_history':
            global $wpdb;
            $doc_id = sanitize_text_field($_POST['doc_id']);
            $appointment_data = $_POST['appointment'];

            $wpdb->insert(
                $wpdb->prefix . 'neoclient_history',
                [
                    'user_id' => $user_id,
                    'document_id' => $doc_id,
                    'event_type' => 'manual_appointment',
                    'event_data' => json_encode($appointment_data),
                    'event_date' => current_time('mysql'),
                ]
            );
            // Update the document's history in neoclient_documents user meta
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            foreach ($documents as &$doc) {
                if ($doc['id'] === $doc_id) {
                    if (!isset($doc['history'])) {
                        $doc['history'] = [];
                    }
                    // Add new entry
                    $doc['history'][] = $appointment_data;

                    // Sort history by date (assuming date is in a sortable format like YYYY-MM-DD)
                    usort($doc['history'], function($a, $b) {
                        return strtotime($a['date']) - strtotime($b['date']);
                    });
                    break;
                }
            }
            update_user_meta($user_id, 'neoclient_documents', $documents);

            wp_send_json_success(['message' => 'Appointment successfully added to history.']);
            break;

        case 'delete_appointment':
            $appointment_id = sanitize_text_field($_POST['appointment_id']);
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $appointments = array_filter($appointments, function($appt) use ($appointment_id) {
                return $appt['id'] !== $appointment_id;
            });
            update_user_meta($user_id, 'neoclient_appointments', array_values($appointments));
            wp_send_json_success(['message' => 'Appointment successfully deleted.']);
            break;

        case 'delete_document':
            $document_id = sanitize_text_field($_POST['doc_id']);
            error_log('delete_document: Received document_id: ' . $document_id);
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            error_log('delete_document: Documents before filter: ' . print_r($documents, true));
            $documents = array_filter($documents, function($doc) use ($document_id) {
                return $doc['id'] !== $document_id;
            });
            $documents = array_values($documents); // Re-index array
            error_log('delete_document: Documents after filter: ' . print_r($documents, true));
            update_user_meta($user_id, 'neoclient_documents', $documents);
            wp_send_json_success(['message' => 'Document successfully deleted.']);
            break;

        case 'delete_history_item':
            $document_id = sanitize_text_field($_POST['document_id']);
            $history_item_id = sanitize_text_field($_POST['history_item_id']);
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            foreach ($documents as &$doc) {
                if ($doc['id'] === $document_id && isset($doc['history'])) {
                    $doc['history'] = array_filter($doc['history'], function($item) use ($history_item_id) {
                        return $item['id'] !== $history_item_id;
                    });
                    $doc['history'] = array_values($doc['history']); // Re-index array
                    break;
                }
            }
            update_user_meta($user_id, 'neoclient_documents', $documents);
            wp_send_json_success(['message' => 'History item successfully deleted.']);
            break;

        case 'new_document':
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            foreach ($documents as &$doc) {
                if (isset($doc['consumables']) && !is_string($doc['consumables'])) {
                    $doc['consumables'] = json_encode($doc['consumables']);
                }
            }
            if ($user_role === 'free' && count($documents) >= 1000) {
                wp_send_json_error('Your account access is limited. <a href="https://neoclient.ir/premium">Please upgrade to the Pro plan.</a>', 403);
                wp_die();
            }

            global $wpdb;
            $client_name = sanitize_text_field($_POST['client_name']);
            $document_id = wp_generate_uuid4();

            $new_document = [
                'id' => $document_id,
                'client_name' => $client_name,
                'birthdate' => sanitize_text_field($_POST['birthdate']),
                'occupation' => sanitize_text_field($_POST['occupation']),
                'client_phone' => sanitize_text_field($_POST['client_phone']),
                'client_email' => sanitize_email($_POST['client_email']),
                'notes' => '',
                'skin_type' => sanitize_text_field($_POST['skin_type']),
                'skin_concerns' => sanitize_textarea_field($_POST['skin_concerns']),
                'sensitivities' => sanitize_textarea_field($_POST['sensitivities']),
                'skin_tone' => sanitize_text_field($_POST['skin_tone']),
                'hydration_level' => sanitize_text_field($_POST['hydration_level']),
                'acne_level' => sanitize_text_field($_POST['acne_level']),
                'sun_exposure' => sanitize_text_field($_POST['sun_exposure']),
                'skincare_routine' => sanitize_textarea_field($_POST['skincare_routine']),
                'purchased_products' => sanitize_textarea_field($_POST['purchased_products']),
                'skin_needs' => sanitize_textarea_field($_POST['skin_needs']),
                'care_instructions' => sanitize_textarea_field($_POST['care_instructions']),
                'notes' => isset($_POST['notes']) ? sanitize_textarea_field($_POST['notes']) : '',
                'acne_prone_areas' => isset($_POST['acne_prone_areas']) ? sanitize_text_field(stripslashes($_POST['acne_prone_areas'])) : '[]',
                'address' => sanitize_text_field($_POST['address']),
                'fear_of_closed_spaces' => sanitize_text_field($_POST['fear_of_closed_spaces']),
                'consumables' => isset($_POST['consumables']) ? sanitize_text_field(stripslashes($_POST['consumables'])) : '[]',
                'pregnancy_status' => sanitize_text_field($_POST['pregnancy_status']),
                'image' => '',
                'history' => isset($_POST['history']) ? json_decode(stripslashes($_POST['history']), true) : [],
            ];

            if ($user_role === 'pro' || $user_role === 'superpro') {
                if (!empty($_FILES['image']['name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    if (!function_exists('wp_handle_upload')) {
                        require_once(ABSPATH . 'wp-admin/includes/file.php');
                    }
                    $upload = wp_handle_upload($_FILES['image'], ['test_form' => false]);
                    if ($upload && !isset($upload['error'])) {
                        $new_document['image'] = $upload['url'];
                    } else {
                        wp_send_json_error(['message' => 'Error uploading image: ' . $upload['error']], 400);
                        wp_die();
                    }
                }
            }



            $documents[] = $new_document;
            $update_result = update_user_meta($user_id, 'neoclient_documents', $documents);
            if ($update_result === false) {
                error_log('NeoClient Error: new_document - update_user_meta for neoclient_documents returned false. Data might be too large or malformed.');
                wp_send_json_error(['message' => 'Error updating file information.']);
                wp_die();
            } else {
                error_log('NeoClient Debug: new_document - update_user_meta for neoclient_documents successful. Result: ' . ($update_result ? 'true' : 'false'));
            }

            // Log in the database table
            $insert_doc_result = $wpdb->insert(
                $wpdb->prefix . 'neoclient_documents',
                [
                    'id' => $document_id,
                    'user_id' => $user_id,
                    'client_name' => $client_name,
                    'created_at' => current_time('mysql'),
                ]
            );
            if ($insert_doc_result) {
                error_log('NeoClient Debug: new_document - Document inserted into neoclient_documents table.');
            } else {
                error_log('NeoClient Error: new_document - Failed to insert document into neoclient_documents table. Error: ' . $wpdb->last_error);
                wp_send_json_error(['message' => 'Error saving file to database.']);
                wp_die();
            }

            // Log creation event in history
            $insert_history_result = $wpdb->insert(
                $wpdb->prefix . 'neoclient_history',
                [
                    'user_id' => $user_id,
                    'document_id' => $document_id,
                    'event_type' => 'document_created',
                    'event_data' => json_encode(['client_name' => $client_name]),
                    'event_date' => current_time('mysql'),
                ]
            );
            if ($insert_history_result) {
                error_log('NeoClient Debug: new_document - Document creation event added to neoclient_history table.');
            } else {
                error_log('NeoClient Error: new_document - Failed to insert document creation event into neoclient_history table. Error: ' . $wpdb->last_error);
                wp_send_json_error(['message' => 'Error logging file history.']);
                wp_die();
            }

            wp_send_json_success(['message' => 'File created successfully.']);
            break;

        case 'edit_document':
            global $wpdb;
            if (!isset($_POST['document_id'])) {
                wp_send_json_error(['message' => 'Document ID is missing.'], 400);
                wp_die();
            }
            $document_id = sanitize_text_field($_POST['document_id']);
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];

            $updated_document = [
                'id' => $document_id,
                'client_name' => sanitize_text_field($_POST['client_name']),
                'birthdate' => sanitize_text_field($_POST['birthdate']),
                'occupation' => sanitize_text_field($_POST['occupation']),
                'client_phone' => sanitize_text_field($_POST['client_phone']),
                'client_email' => sanitize_email($_POST['client_email']),
                'skin_type' => sanitize_text_field($_POST['skin_type']),
                'skin_concerns' => sanitize_textarea_field($_POST['skin_concerns']),
                'sensitivities' => sanitize_textarea_field($_POST['sensitivities']),
                'skin_tone' => sanitize_text_field($_POST['skin_tone']),
                'hydration_level' => sanitize_text_field($_POST['hydration_level']),
                'acne_level' => sanitize_text_field($_POST['acne_level']),
                'sun_exposure' => sanitize_text_field($_POST['sun_exposure']),
                'skincare_routine' => sanitize_textarea_field($_POST['skincare_routine']),
                'purchased_products' => sanitize_textarea_field($_POST['purchased_products']),
                'skin_needs' => sanitize_textarea_field($_POST['skin_needs']),
                'care_instructions' => sanitize_textarea_field($_POST['care_instructions']),
                'notes' => isset($_POST['notes']) ? sanitize_textarea_field($_POST['notes']) : '',
                'acne_prone_areas' => isset($_POST['acne_prone_areas']) ? sanitize_text_field(stripslashes($_POST['acne_prone_areas'])) : '[]',
                'address' => sanitize_text_field($_POST['address']),
                'fear_of_closed_spaces' => sanitize_text_field($_POST['fear_of_closed_spaces']),
                'consumables' => isset($_POST['consumables']) ? sanitize_text_field(stripslashes($_POST['consumables'])) : '[]',
                'pregnancy_status' => sanitize_text_field($_POST['pregnancy_status']),
                'image' => '',
                'history' => isset($_POST['history']) ? json_decode(stripslashes($_POST['history']), true) : [],
            ];

            // Check for new image upload
            if ($user_role === 'pro' || $user_role === 'superpro') {
                if (!empty($_FILES['image']['name']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                    $upload = wp_handle_upload($_FILES['image'], ['test_form' => false]);
                    if ($upload && !isset($upload['error'])) {
                        $updated_document['image'] = $upload['url'];
                    } else {
                        wp_send_json_error(['message' => 'Error uploading image.'], 400);
                        wp_die();
                    }
                } else {
                    // Keep the previous image if a new one is not uploaded
                    foreach ($documents as $doc) {
                        if ($doc['id'] === $document_id) {
                            $updated_document['image'] = $doc['image'];
                            break;
                        }
                    }
                }
            }

            // Update the document in the user's meta
            foreach ($documents as &$doc) {
                if ($doc['id'] === $document_id) {
                    $doc = $updated_document;
                    break;
                }
            }
            update_user_meta($user_id, 'neoclient_documents', $documents);

            // Update in the database table
            $wpdb->update(
                $wpdb->prefix . 'neoclient_documents',
                [
                    'client_name' => $updated_document['client_name'],
                    'created_at' => current_time('mysql'),
                ],
                ['id' => $document_id, 'user_id' => $user_id]
            );

            // Log the edit event in the history
            $wpdb->insert(
                $wpdb->prefix . 'neoclient_history',
                [
                    'user_id' => $user_id,
                    'document_id' => $document_id,
                    'event_type' => 'document_updated',
                    'event_data' => json_encode(['client_name' => $updated_document['client_name']]),
                    'event_date' => current_time('mysql'),
                ]
            );

            wp_send_json_success(['message' => 'File updated successfully.']);
            break;

        case 'create_numbered_document_with_appointment':
            global $wpdb;
            $appointment_data = $_POST['appointment'];
            $original_client_name = sanitize_text_field($_POST['original_client_name']);

            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
$user_role = get_user_meta($user_id, 'neoclient_role', true) ?: 'free';
if ($user_role === 'free' && count($documents) >= 1000) {
    wp_send_json_error(['message' => 'You have reached your storage limit. To get more access, please upgrade to the premium version.']);
}
$new_client_name = $original_client_name;
            $counter = 1;
            $name_exists = true;

            while ($name_exists) {
                $name_exists = false;
                foreach ($documents as $doc) {
                    if (strtolower($doc['client_name']) === strtolower($new_client_name)) {
                        $name_exists = true;
                        $new_client_name = $original_client_name . ' (' . $counter . ')';
                        $counter++;
                        break;
                    }
                }
            }

            $document_id = wp_generate_uuid4();
            $new_document = [
                'id' => $document_id,
                'client_name' => $new_client_name,
                'birthdate' => '',
                'occupation' => '',
                'client_phone' => '',
                'client_email' => '',
                'skin_type' => '',
                'skin_concerns' => '',
                'sensitivities' => '',
                'skin_tone' => '',
                'hydration_level' => '',
                'acne_level' => '',
                'sun_exposure' => '',
                'skincare_routine' => '',
                'purchased_products' => '',
                'skin_needs' => '',
                'care_instructions' => '',
                'notes' => '',
                'address' => '',
                'fear_of_closed_spaces' => '',
                'consumables' => '[]',
                'pregnancy_status' => '',
                'image' => '',
                'history' => [],
            ];

            // Add the appointment to the new document's history
if (!empty($appointment_data)) {
    $new_document['history'][] = $appointment_data;
    // Sort history by date safely for Jalali dates
    usort($new_document['history'], function($a, $b) {
        $dateA = isset($a['date']) ? str_replace('/', '-', $a['date']) : '0000-00-00';
        $dateB = isset($b['date']) ? str_replace('/', '-', $b['date']) : '0000-00-00';
        return strtotime($dateA) - strtotime($dateB);
    });
}

            $documents[] = $new_document;
            $result = update_user_meta($user_id, 'neoclient_documents', $documents);
if ($result === false) {
    wp_send_json_error('Error updating file information.');
}

// Update the appointment in neoclient_appointments
$appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
$appointment_id = $appointment_data['id'];
foreach ($appointments as &$appt) {
    if ($appt['id'] === $appointment_id) {
        $appt['client_name'] = $new_client_name;
        $appt['date'] = $appointment_data['date'];
        $appt['time'] = $appointment_data['time'];
        $appt['services'] = $appointment_data['services'];
        $appt['priority'] = $appointment_data['priority'];
        $appt['status'] = $appointment_data['status'];
        $appt['amount'] = $appointment_data['amount'];
        $appt['notes'] = $appointment_data['notes'];
        break;
    }
}
update_user_meta($user_id, 'neoclient_appointments', $appointments);

// Insert into neoclient_documents table
            $wpdb->insert(
                $wpdb->prefix . 'neoclient_documents',
                [
                    'id' => $document_id,
                    'user_id' => $user_id,
                    'client_name' => $new_client_name,
                    'created_at' => current_time('mysql'),
                ]
            );

            // Insert into neoclient_history table for document creation
            $wpdb->insert(
                $wpdb->prefix . 'neoclient_history',
                [
                    'user_id' => $user_id,
                    'document_id' => $document_id,
                    'event_type' => 'document_created_with_appointment',
                    'event_data' => json_encode(['client_name' => $new_client_name, 'appointment' => $appointment_data]),
                    'event_date' => current_time('mysql'),
                ]
            );

            wp_send_json_success(['message' => 'New file created and appointment added successfully.']);
            break;

        case 'delete_document':
            global $wpdb;
            if (!isset($_POST['document_id'])) {
                wp_send_json_error(['message' => 'Document ID not specified.']);
                break;
            }
            $document_id = sanitize_text_field($_POST['document_id']);
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $documents = array_filter($documents, function($doc) use ($document_id) {
                return $doc['id'] !== $document_id;
            });
            update_user_meta($user_id, 'neoclient_documents', array_values($documents));

            $document_id = sanitize_text_field($_POST['doc_id']);

            if (empty($document_id)) {
                wp_send_json_error(['message' => 'Document ID not specified.'], 400);
            }

            // Delete from database table
            $wpdb->delete(
                $wpdb->prefix . 'neoclient_documents',
                ['id' => $document_id, 'user_id' => $user_id]
            );

            // Delete related history
            $wpdb->delete(
                $wpdb->prefix . 'neoclient_history',
                ['document_id' => $document_id, 'user_id' => $user_id]
            );

            wp_send_json_success(['message' => 'File deleted successfully.']);
            break;

        case 'get_appointments':
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $filtered_appointments = $appointments;

            // اعمال فیلترهای جستجو و وضعیت
            if (isset($_POST['status']) && !empty($_POST['status'])) {
                $filter_status = sanitize_text_field($_POST['status']);
                $filtered_appointments = array_filter($filtered_appointments, function($appt) use ($filter_status) {
                    return $appt['status'] === $filter_status;
                });
            }

            if (isset($_POST['priority']) && !empty($_POST['priority'])) {
                $filter_priority = sanitize_text_field($_POST['priority']);
                $filtered_appointments = array_filter($filtered_appointments, function($appt) use ($filter_priority) {
                    return $appt['priority'] === $filter_priority;
                });
            }

            if (isset($_POST['search']) && !empty($_POST['search'])) {
                $search = sanitize_text_field($_POST['search']);
                $filtered_appointments = array_filter($filtered_appointments, function($appt) use ($search) {
                    return stripos($appt['client_name'], $search) !== false ||
                           stripos($appt['services'], $search) !== false;
                });
            }
            
            // اعمال فیلتر دوره زمانی
            if (isset($_POST['period']) && !empty($_POST['period']) && $_POST['period'] !== 'all') {
                $period = sanitize_text_field($_POST['period']);
                $now = current_time('timestamp');
                $filtered_appointments = array_filter($filtered_appointments, function($appt) use ($period, $now) {
                    $appt_date = strtotime($appt['date']);
                    if (!$appt_date) return false;
                    
                    switch ($period) {
                        case 'month':
                            // ماه جاری
                            return date('Y-m', $appt_date) === date('Y-m', $now);
                        case 'quarter':
                            // سه ماهه جاری
                            $current_month = (int)date('n', $now);
                            $current_quarter = ceil($current_month / 3);
                            $quarter_start_month = (($current_quarter - 1) * 3) + 1;
                            $quarter_start = mktime(0, 0, 0, $quarter_start_month, 1, date('Y', $now));
                            $quarter_end = mktime(23, 59, 59, $quarter_start_month + 3, 0, date('Y', $now));
                            return $appt_date >= $quarter_start && $appt_date <= $quarter_end;
                        case 'year':
                            // سال جاری
                            return date('Y', $appt_date) === date('Y', $now);
                        default:
                            return true;
                    }
                });
            }

            wp_send_json_success(['appointments' => array_values($filtered_appointments)]);
            break;

        case 'get_documents':
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $filtered_documents = $documents;

            if (isset($_POST['search']) && !empty($_POST['search'])) {
                $search = sanitize_text_field($_POST['search']);
                $filtered_documents = array_filter($filtered_documents, function($doc) use ($search) {
                    $client_name = isset($doc['client_name']) ? $doc['client_name'] : '';
                    $client_phone = isset($doc['client_phone']) ? $doc['client_phone'] : '';
                    $client_email = isset($doc['client_email']) ? $doc['client_email'] : '';
                    return stripos($client_name, $search) !== false ||
                           stripos($client_phone, $search) !== false ||
                           stripos($client_email, $search) !== false;
                });
            }
            
            // Apply time period filter
            if (isset($_POST['period']) && !empty($_POST['period']) && $_POST['period'] !== 'all') {
                $period = sanitize_text_field($_POST['period']);
                $now = current_time('timestamp');
                $filtered_documents = array_filter($filtered_documents, function($doc) use ($period, $now) {
                    if (!isset($doc['created_at'])) {
                        return false;
                    }
                    $doc_date = strtotime($doc['created_at']);
                    if (!$doc_date) return false;
                    
                    switch ($period) {
                        case 'month':
                            // current month
                            return date('Y-m', $doc_date) === date('Y-m', $now);
                        case 'quarter':
                            // current quarter
                            $current_month = (int)date('n', $now);
                            $current_quarter = ceil($current_month / 3);
                            $quarter_start_month = (($current_quarter - 1) * 3) + 1;
                            $quarter_start = mktime(0, 0, 0, $quarter_start_month, 1, date('Y', $now));
                            $quarter_end = mktime(23, 59, 59, $quarter_start_month + 3, 0, date('Y', $now));
                            return $doc_date >= $quarter_start && $doc_date <= $quarter_end;
                        case 'year':
                            // current year
                            return date('Y', $doc_date) === date('Y', $now);
                        default:
                            return true;
                    }
                });
            }

            wp_send_json_success(['documents' => array_values($filtered_documents)]);
            break;

        case 'get_dashboard_stats':
            global $wpdb;
            try {
                $appointments = get_user_meta($user_id, 'neoclient_appointments', true);
                if (!is_array($appointments)) {
                    $appointments = [];
                }
                $documents = get_user_meta($user_id, 'neoclient_documents', true);
                if (!is_array($documents)) {
                    $documents = [];
                }
                $invoices = get_user_meta($user_id, 'neoclient_invoices', true);
                if (!is_array($invoices)) {
                    $invoices = [];
                }

                // Calculate statistics
                $client_names = [];
                if (is_array($documents)) {
                    foreach ($documents as $doc) {
                        if (is_array($doc) && isset($doc['client_name'])) {
                            $client_names[] = $doc['client_name'];
                        }
                    }
                }
                $total_clients = count(array_unique($client_names));

                $total_appointments = is_array($appointments) ? count($appointments) : 0;

                $total_revenue = 0;
                if (is_array($invoices)) {
                    foreach ($invoices as $invoice) {
                        if (is_array($invoice) && isset($invoice['total_price']) && is_numeric($invoice['total_price'])) {
                            $total_revenue += $invoice['total_price'];
                        }
                    }
                }

                $status_counts = ['pending' => 0, 'completed' => 0, 'cancelled' => 0];
                foreach ($appointments as $appt) {
                    if (isset($appt['status']) && isset($status_counts[$appt['status']])) {
                        $status_counts[$appt['status']]++;
                    }
                }

                $priority_counts = ['low' => 0, 'medium' => 0, 'high' => 0];
                foreach ($appointments as $appt) {
                    if (isset($appt['priority']) && isset($priority_counts[$appt['priority']])) {
                        $priority_counts[$appt['priority']]++;
                    }
                }

                $skin_type_counts = ['dry' => 0, 'oily' => 0, 'normal' => 0, 'combination' => 0, 'sensitive' => 0, 'unknown' => 0];
                foreach ($documents as $doc) {
                    $skin_type = isset($doc['skin_type']) && !empty($doc['skin_type']) && in_array($doc['skin_type'], array_keys($skin_type_counts)) ? $doc['skin_type'] : 'unknown';
                    $skin_type_counts[$skin_type]++;
                }

                $recent_activity = $wpdb->get_results(
                    $wpdb->prepare(
                        "SELECT * FROM {$wpdb->prefix}neoclient_history WHERE user_id = %d ORDER BY event_date DESC LIMIT 5",
                        $user_id
                    ),
                    ARRAY_A
                );

                $upcoming_appointments = array_filter($appointments, function($appt) {
                    return isset($appt['status'], $appt['date']) && $appt['status'] === 'pending' && strtotime($appt['date']) >= strtotime(current_time('Y-m-d'));
                });
                usort($upcoming_appointments, function($a, $b) {
                    return strtotime($a['date']) - strtotime($b['date']);
                });
                $upcoming_appointments = array_slice($upcoming_appointments, 0, 3);

                $pending_bookings = array_filter($appointments, function($appt) {
                    return isset($appt['status']) && $appt['status'] === 'pending';
                });

                wp_send_json_success([
                    'total_clients' => $total_clients,
                    'total_appointments' => $total_appointments,
                    'total_revenue' => $total_revenue,
                    'status_counts' => $status_counts,
                    'priority_counts' => $priority_counts,
                    'skin_type_counts' => $skin_type_counts,
                    'recent_activity' => $recent_activity,
                    'upcoming_appointments' => $upcoming_appointments,
                    'pending_bookings' => $pending_bookings,
                ]);
            } catch (Throwable $e) {
                wp_send_json_error(['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            }
            break;

        case 'get_reports':
            $period = sanitize_text_field($_POST['period'] ?? 'month');
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $invoices = get_user_meta($user_id, 'neoclient_invoices', true) ?: [];

            // Filter by time period
            $start_date = '';
            if ($period === 'month') {
                $start_date = date('Y-m-01', strtotime(current_time('mysql')));
            } elseif ($period === 'quarter') {
                $start_date = date('Y-m-01', strtotime('-3 months', strtotime(current_time('mysql'))));
            } elseif ($period === 'year') {
                $start_date = date('Y-01-01', strtotime(current_time('mysql')));
            }

            $filtered_appointments = $appointments;
            $filtered_invoices = $invoices;

            if ($start_date) {
                $filtered_appointments = array_filter($appointments, function($appt) use ($start_date) {
                    return strtotime($appt['date']) >= strtotime($start_date);
                });
                $filtered_invoices = array_filter($invoices, function($inv) use ($start_date) {
                    return strtotime($inv['created_at']) >= strtotime($start_date);
                });
            }

            $total_clients = count(array_unique(array_column($documents, 'client_name')));
            $total_appointments = count($filtered_appointments);
            $cancelled_appointments = count(array_filter($filtered_appointments, function($appt) {
                return $appt['status'] === 'cancelled';
            }));
            $total_revenue = array_sum(array_column($filtered_invoices, 'total_price'));

            $status_counts = ['pending' => 0, 'completed' => 0, 'cancelled' => 0];
            foreach ($filtered_appointments as $appt) {
                $status_counts[$appt['status']]++;
            }

            $priority_counts = ['low' => 0, 'medium' => 0, 'high' => 0];
            foreach ($filtered_appointments as $appt) {
                $priority_counts[$appt['priority']]++;
            }

            $skin_type_counts = ['dry' => 0, 'oily' => 0, 'normal' => 0, 'combination' => 0, 'sensitive' => 0, 'unknown' => 0];
            foreach ($documents as $doc) {
                $skin_type = isset($doc['skin_type']) && !empty($doc['skin_type']) && in_array($doc['skin_type'], array_keys($skin_type_counts)) ? $doc['skin_type'] : 'unknown';
                $skin_type_counts[$skin_type]++;
            }

            wp_send_json_success([
                'total_clients' => $total_clients,
                'total_appointments' => $total_appointments,
                'cancelled_appointments' => $cancelled_appointments,
                'total_revenue' => $total_revenue,
                'status_counts' => $status_counts,
                'priority_counts' => $priority_counts,
                'skin_type_counts' => $skin_type_counts,
            ]);
            break;

        case 'get_holidays':
            // Holiday List
            $holidays = [
                '2024/03/20', '2024/03/21', '2024/03/31', '2024/06/03',
                '2024/06/14', '2024/06/22', '2024/08/25', '2024/08/26'
            ];
            wp_send_json_success(['holidays' => $holidays]);
            break;

        case 'get_notifications':
            $notifications = get_user_meta($user_id, 'neoclient_notifications', true) ?: [];
            wp_send_json_success(['notifications' => $notifications]);
            break;

        case 'check_client_document_existence':
            $client_name = sanitize_text_field($_POST['client_name']);
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $found_doc = null;
            foreach ($documents as $doc) {
                if (strcasecmp($doc['client_name'], $client_name) === 0) {
                    $found_doc = $doc;
                    break;
                }
            }
            if ($found_doc) {
                wp_send_json_success(['exists' => true, 'doc_id' => $found_doc['id'], 'message' => 'Client with a similar name found.']);
            } else {
                wp_send_json_success(['exists' => false, 'message' => 'Client with a similar name not found.']);
            }
            break;

        case 'mark_notification_seen':
            $notification_id = intval($_POST['notification_id']);
            break;



            // Insert into neoclient_history table for document creation
            $wpdb->insert(
                $wpdb->prefix . 'neoclient_history',
                [
                    'user_id' => $user_id,
                    'document_id' => $new_document['id'],
                    'event_type' => 'document_created',
                    'event_data' => json_encode(['client_name' => $new_client_name]),
                    'event_date' => current_time('mysql'),
                ]
            );

            // Insert into neoclient_history table for appointment added to document
            if (!empty($appointment_data)) {
                $wpdb->insert(
                    $wpdb->prefix . 'neoclient_history',
                    [
                        'user_id' => $user_id,
                        'document_id' => $new_document['id'],
                        'appointment_id' => $appointment_data['appointment_id'] ?? '',
                        'event_type' => 'appointment_added_to_new_document',
                        'event_data' => json_encode($appointment_data),
                        'event_date' => current_time('mysql'),
                    ]
                );
            }

            wp_send_json_success(['message' => 'New document for ' . $new_client_name . ' successfully created and appointment added.']);
            break;
            $notifications = get_user_meta($user_id, 'neoclient_notifications', true) ?: [];
            if (isset($notifications[$notification_id])) {
                $notifications[$notification_id]['seen'] = true;
                update_user_meta($user_id, 'neoclient_notifications', $notifications);
                wp_send_json_success(['message' => 'Notification successfully marked as seen.']);
            } else {
                wp_send_json_error(['message' => 'Notification not found.'], 404);
            }
            break;

        case 'backup_data':
            if ($user_role !== 'superpro') {
                wp_send_json_error('Limited access. Only superpro users can use this feature.', 403);
                wp_die();
            }
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $documents = get_user_meta($user_id, 'neoclient_documents', true) ?: [];
            $invoices = get_user_meta($user_id, 'neoclient_invoices', true) ?: [];

            $data = [
                'appointments' => $appointments,
                'documents' => $documents,
                'invoices' => $invoices,
            ];

            $output = fopen('php://output', 'w');
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="neoclient_backup_' . date('Ymd_His') . '.csv"');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');

            // Add BOM to support Unicode in CSV
            echo "\xEF\xBB\xBF";

            // Write CSV header
            fputcsv($output, ['Type', 'Data'], ',', '"');

            foreach ($appointments as $appt) {
                fputcsv($output, ['appointment', json_encode($appt, JSON_UNESCAPED_UNICODE)], ',', '"');
            }
            foreach ($documents as $doc) {
                fputcsv($output, ['document', json_encode($doc, JSON_UNESCAPED_UNICODE)], ',', '"');
            }
            foreach ($invoices as $inv) {
                fputcsv($output, ['invoice', json_encode($inv, JSON_UNESCAPED_UNICODE)], ',', '"');
            }

            fclose($output);
            wp_die();
            break;

        case 'restore_data':
            if ($user_role !== 'superpro') {
                wp_send_json_error('Limited access. Only superpro users can use this feature.', 403);
                wp_die();
            }
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                wp_send_json_error(['message' => 'Error uploading file.'], 400);
                wp_die();
            }

            $file = $_FILES['file']['tmp_name'];
            $handle = fopen($file, 'r');
            if (!$handle) {
                wp_send_json_error(['message' => 'Error reading file.'], 400);
                wp_die();
            }

            $appointments = [];
            $documents = [];
            $invoices = [];

            // Skip BOM if it exists
            $bom = fread($handle, 3);
            if ($bom !== "\xEF\xBB\xBF") {
                rewind($handle);
            }

            // Read header
            fgetcsv($handle, 1000, ',');

            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                $type = $data[0];
                $record = json_decode($data[1], true);
                if ($type === 'appointment') {
                    $appointments[] = $record;
                } elseif ($type === 'document') {
                    $documents[] = $record;
                } elseif ($type === 'invoice') {
                    $invoices[] = $record;
                }
            }
            fclose($handle);

            update_user_meta($user_id, 'neoclient_appointments', $appointments);
            update_user_meta($user_id, 'neoclient_documents', $documents);
            update_user_meta($user_id, 'neoclient_invoices', $invoices);

            wp_send_json_success(['message' => 'Data successfully restored.']);
            break;

        case 'get_user_details':
            if (!current_user_can('manage_options')) {
                wp_send_json_error(['message' => 'Unauthorized access'], 403);
                wp_die();
            }

            $target_user_id = intval($_POST['user_id']);
            $user_data = get_userdata($target_user_id);
            if (!$user_data) {
                wp_send_json_error(['message' => 'User not found.'], 404);
                wp_die();
            }

            $appointments = get_user_meta($target_user_id, 'neoclient_appointments', true) ?: [];
            $documents = get_user_meta($target_user_id, 'neoclient_documents', true) ?: [];

            wp_send_json_success([
                'user' => [
                    'display_name' => $user_data->display_name,
                    'email' => $user_data->user_email,
                    'role' => get_user_meta($target_user_id, 'neoclient_role', true) ?: 'free',
                    'first_name' => get_user_meta($target_user_id, 'first_name', true),
                    'last_name' => get_user_meta($target_user_id, 'last_name', true),
                    'phone' => get_user_meta($target_user_id, 'phone', true),
                    'clinic_name' => get_user_meta($target_user_id, 'clinic_name', true),
                    'city' => get_user_meta($target_user_id, 'city', true),
                    'referral_code' => neoclient_get_referral_code($target_user_id),
                ],
                'appointments' => $appointments,
                'documents' => $documents,
            ]);
            break;

        case 'get_unlinked_appointments':
            $client_name = sanitize_text_field($_POST['client_name']);
            $appointments = get_user_meta($user_id, 'neoclient_appointments', true) ?: [];
            $unlinked_appointments = array_filter($appointments, function($appt) use ($client_name) {
                return strtolower($appt['client_name']) === strtolower($client_name) && $appt['status'] === 'pending';
            });
            wp_send_json_success(['unlinked_appointments' => array_values($unlinked_appointments)]);
            break;

    }

    wp_die();
}
add_action('wp_ajax_neoclient_action', 'neoclient_action_callback');
add_action('wp_ajax_nopriv_neoclient_action', 'neoclient_action_callback');

// Display admin notices in the dashboard
function neoclient_admin_notices() {
    $user_id = get_current_user_id();
    $notifications = get_user_meta($user_id, 'neoclient_notifications', true) ?: [];
    $unseen_notifications = array_filter($notifications, function($n) {
        return !$n['seen'];
    });

    if (!empty($unseen_notifications)) {
        foreach ($unseen_notifications as $index => $notification) {
            ?>
            <div class="notice notice-info is-dismissible neoclient-notice" data-notification-id="<?php echo $index; ?>">
                <p><?php echo esc_html($notification['message']); ?></p>
            </div>
            <?php
        }
    }
}
add_action('admin_notices', 'neoclient_admin_notices');

// Script for managing admin notices
function neoclient_admin_scripts() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <script>
        jQuery(document).ready(function($) {
            $('.neoclient-notice').on('click', '.notice-dismiss', function() {
                var $notice = $(this).closest('.neoclient-notice');
                var notification_id = $notice.data('notification-id');
                
                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    method: 'POST',
                    data: {
                        action: 'neoclient_action',
                        neoclient_action: 'mark_notification_seen',
                        notification_id: notification_id,
                        nonce: '<?php echo wp_create_nonce('neoclient_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $notice.remove();
                        }
                    }
                });
            });

            $('.neoclient-view-details').on('click', function() {
                var user_id = $(this).data('user-id');
                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    method: 'POST',
                    data: {
                        action: 'neoclient_action',
                        neoclient_action: 'get_user_details',
                        user_id: user_id,
                        nonce: '<?php echo wp_create_nonce('neoclient_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            var user = response.data.user;
                            var appointments = response.data.appointments;
                            var documents = response.data.documents;

                            var userInfoHtml = `
                                <p><strong>Name:</strong> ${user.display_name}</p>
                                <p><strong>Email:</strong> ${user.email}</p>
                                <p><strong>Role:</strong> ${user.role}</p>
                                <p><strong>First Name:</strong> ${user.first_name}</p>
                                <p><strong>Last Name:</strong> ${user.last_name}</p>
                                <p><strong>Phone:</strong> ${user.phone}</p>
                                <p><strong>Clinic Name:</strong> ${user.clinic_name}</p>
                                <p><strong>City:</strong> ${user.city}</p>
                            `;
                            $('#neoclient-user-info').html(userInfoHtml);

                            var appointmentsHtml = appointments.length ? appointments.map(appt => `
                                <div class="neoclient-list-item">
                                    <p><strong>Client:</strong> ${appt.client_name}</p>
                                    <p><strong>Date:</strong> ${appt.date}</p>
                                    <p><strong>Status:</strong> ${appt.status}</p>
                                </div>
                            `).join('') : '<p>No appointments found.</p>';
                            $('#neoclient-user-appointments').html(appointmentsHtml);

                            var documentsHtml = documents.length ? documents.map(doc => `
                                <div class="neoclient-list-item">
                                    <p><strong>Client:</strong> ${doc.client_name}</p>
                                    <p><strong>Skin Type:</strong> ${doc.skin_type || 'Unknown'}</p>
                                </div>
                            `).join('') : '<p>No documents found.</p>';
                            $('#neoclient-user-documents').html(documentsHtml);

                            $('#neoclient-user-details').removeClass('hidden');
                        } else {
                            alert(response.data.message);
                        }
                    }
                });
            });
        });
    </script>
    <?php
}
add_action('admin_footer', 'neoclient_admin_scripts');

?>{
        // Update the new user's entry with the referrer's user ID and the code they used
        $wpdb->update(
            $table_name,
            array(
                'referrer_user_id' => $referrer_user_id,
                'referred_by_code' => $referral_code
            ),
            array('user_id' => $user_id)
        );

        // Increment the referred_count for the referrer
        $wpdb->query(
            $wpdb->prepare(
                "UPDATE {$table_name} SET referred_count = referred_count + 1 WHERE user_id = %d",
                $referrer_user_id
            )
        );
        return true;
    }
    return false;
}

add_action('user_register', 'neoclient_user_register_action', 10, 1);
function neoclient_user_register_action($user_id) {
    error_log("NeoClient: neoclient_user_register_action called for user_id " . $user_id);
    global $wpdb;
    $table_name = $wpdb->prefix . 'neoclient_referrals';

    // Ensure every new user gets an entry in neoclient_referrals with their own generated referral_code
    $existing_referral_entry = $wpdb->get_var($wpdb->prepare("SELECT user_id FROM {$table_name} WHERE user_id = %d", $user_id));

    if (!$existing_referral_entry) {
        $new_referral_code = neoclient_generate_referral_code($user_id);
        $wpdb->insert(
            $table_name,
            array(
                'user_id' => $user_id,
                'referral_code' => $new_referral_code,
                'referred_count' => 0,
                'referred_by_code' => NULL
                ),
                array('%d', '%s', '%d', '%s')
            );

    }

    // Now that the user's own referral entry is guaranteed to exist, update it if they used a referral code
    if (isset($_POST['neoclient_referral_code']) && !empty($_POST['neoclient_referral_code'])) {
        error_log("NeoClient: Referral code from POST: " . sanitize_text_field($_POST['neoclient_referral_code']));
        neoclient_set_referrer_for_new_user($user_id, sanitize_text_field($_POST['neoclient_referral_code']));
    }
}