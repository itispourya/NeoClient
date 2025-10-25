/**
 * NeoClient Image Cropper
 * This file is used for managing client image upload and cropping
 */

(function($) {
    'use strict';

    // Global variables
    let cropperInstance = null;
    let currentDocumentId = null;

    // Cropper settings
    const cropperOptions = {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
    };

    // Add modal HTML to page
    function appendModalHTML() {
        const uploaderHTML = `
            <div id="neoclient-image-uploader" style="display: none;">
                <div class="neoclient-modal-overlay"></div>
                <div class="neoclient-modal-content">
                    <div class="neoclient-modal-header">
                        <h3>Upload Client Image</h3>
                        <button type="button" class="neoclient-modal-close">&times;</button>
                    </div>
                    <div class="neoclient-modal-body">
                        <div class="neoclient-upload-container">
                            <div class="neoclient-upload-area">
                                <div class="neoclient-upload-options">
                                    <input type="file" id="neoclient-image-input" accept="image/*" style="display: none;">
                                    <button type="button" id="neoclient-camera-btn" class="neoclient-btn neoclient-upload-option">
                                        <i class="neoclient-icon neoclient-icon-camera"></i> Camera
                                    </button>
                                    <button type="button" id="neoclient-gallery-btn" class="neoclient-btn neoclient-upload-option">
                                        <i class="neoclient-icon neoclient-icon-gallery"></i> Gallery
                                    </button>
                                    <button type="button" id="neoclient-file-btn" class="neoclient-btn neoclient-upload-option">
                                        <i class="neoclient-icon neoclient-icon-file"></i> Files
                                    </button>
                                </div>
                                <p>Allowed formats: JPG, PNG, GIF</p>
                            </div>
                            <div class="neoclient-cropper-container" style="display: none;">
                                <div class="neoclient-img-container">
                                    <img id="neoclient-image-to-crop" src="">
                                </div>
                                <div class="neoclient-cropper-controls">
                                    <button type="button" id="neoclient-rotate-left" class="neoclient-btn">Rotate Left</button>
                                    <button type="button" id="neoclient-rotate-right" class="neoclient-btn">Rotate Right</button>
                                    <button type="button" id="neoclient-zoom-in" class="neoclient-btn">Zoom In</button>
                                    <button type="button" id="neoclient-zoom-out" class="neoclient-btn">Zoom Out</button>
                                    <button type="button" id="neoclient-reset-crop" class="neoclient-btn">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="neoclient-modal-footer">
                        <button type="button" id="neoclient-crop-cancel" class="neoclient-btn neoclient-btn-secondary">Cancel</button>
                        <button type="button" id="neoclient-crop-save" class="neoclient-btn neoclient-btn-primary" disabled>Save Image</button>
                    </div>
                </div>
            </div>

            <div id="neoclient-image-viewer" style="display: none;">
                <div class="neoclient-modal-overlay"></div>
                <div class="neoclient-modal-content">
                    <div class="neoclient-modal-header">
                        <h3>View Image</h3>
                        <button type="button" class="neoclient-modal-close">&times;</button>
                    </div>
                    <div class="neoclient-modal-body">
                        <div class="neoclient-image-view-container">
                            <img id="neoclient-image-view" src="">
                        </div>
                    </div>
                    <div class="neoclient-modal-footer">
                        <button type="button" id="neoclient-image-delete" class="neoclient-btn neoclient-btn-danger">Delete Image</button>
                        <button type="button" id="neoclient-image-close" class="neoclient-btn neoclient-btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;
        if ($('#neoclient-image-uploader').length === 0) {
            $('body').append(uploaderHTML);
        }
    }

    // Reset uploader
    function resetUploader() {
        $('#neoclient-image-input').val('');
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        $('#neoclient-image-to-crop').attr('src', '');
        $('.neoclient-upload-area').show();
        $('.neoclient-cropper-container').hide();
        $('#neoclient-crop-save').prop('disabled', true).text('Save Image');
        $('#neoclient-image-uploader').hide();
        $('.neoclient-progress-container').remove();
    }

    // Bind events
    function bindEvents() {
        // New image upload button
        $(document).on('click', '.neoclient-upload-image-btn', function() {
            currentDocumentId = $(this).data('document-id');
            $('#neoclient-image-uploader').show();
        });

        // File selection buttons
        $(document).on('click', '#neoclient-camera-btn, #neoclient-gallery-btn, #neoclient-file-btn', function() {
            $('#neoclient-image-input').click();
        });

        // Process selected image
        $(document).on('change', '#neoclient-image-input', function(e) {
            if (e.target.files && e.target.files.length) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    $('#neoclient-image-to-crop').attr('src', event.target.result);
                    $('.neoclient-upload-area').hide();
                    $('.neoclient-cropper-container').show();
                    if (cropperInstance) {
                        cropperInstance.destroy();
                    }
                    cropperInstance = new Cropper(document.getElementById('neoclient-image-to-crop'), cropperOptions);
                    $('#neoclient-crop-save').prop('disabled', false);
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // Cropper control buttons
        $(document).on('click', '#neoclient-rotate-left', () => cropperInstance && cropperInstance.rotate(-90));
        $(document).on('click', '#neoclient-rotate-right', () => cropperInstance && cropperInstance.rotate(90));
        $(document).on('click', '#neoclient-zoom-in', () => cropperInstance && cropperInstance.zoom(0.1));
        $(document).on('click', '#neoclient-zoom-out', () => cropperInstance && cropperInstance.zoom(-0.1));
        $(document).on('click', '#neoclient-reset-crop', () => cropperInstance && cropperInstance.reset());

        // Save image button
        $(document).on('click', '#neoclient-crop-save', function() {
            if (!cropperInstance) return;
            const canvas = cropperInstance.getCroppedCanvas({ width: 500, height: 500, fillColor: '#fff', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
            if (!canvas) return;
            const imageData = canvas.toDataURL('image/jpeg', 0.9);

            const progressBarHTML = `<div class="neoclient-progress-container"><div class="neoclient-progress-bar" style="width: 0%"></div><div class="neoclient-progress-text">Uploading image...</div></div>`;
            $('.neoclient-modal-body').append(progressBarHTML);

            $.ajax({
                url: neoclient_data.ajax_url,
                type: 'POST',
                data: {
                    action: 'neoclient_upload_client_image',
                    nonce: neoclient_data.nonce,
                    document_id: currentDocumentId,
                    image_data: imageData
                },
                beforeSend: function() {
                    $('#neoclient-crop-save').prop('disabled', true).text('Uploading...');
                },
                success: function(response) {
                    if (response.success) {
                        $('.neoclient-progress-bar').css('width', '100%');
                        $('.neoclient-progress-text').text('Upload completed successfully');
                        
                        const newImage = response.data;
                        const thumbnailContainer = $(`#neoclient-thumbnails-${currentDocumentId}`);
                        if (thumbnailContainer.find('p').length) {
                            thumbnailContainer.empty();
                        }
                        const thumbnail = `<div class="neoclient-thumbnail" data-image-id="${newImage.image_id}" data-image-url="${newImage.image_url}"><img src="${newImage.image_url}" alt="Client Image"></div>`;
                        thumbnailContainer.append(thumbnail);

                        setTimeout(() => {
                            resetUploader();
                            alert('Image successfully saved to file.');
                        }, 1000);
                    } else {
                        $('.neoclient-progress-text').text('Error uploading image');
                        $('.neoclient-progress-bar').css('background-color', '#ff3333');
                        setTimeout(() => {
                            $('.neoclient-progress-container').remove();
                            alert(response.data.message || 'Error uploading image');
                            $('#neoclient-crop-save').prop('disabled', false).text('Save Image');
                        }, 1000);
                    }
                },
                error: function() {
                    $('.neoclient-progress-text').text('Error connecting to server');
                    $('.neoclient-progress-bar').css('background-color', '#ff3333');
                    setTimeout(() => {
                        $('.neoclient-progress-container').remove();
                        alert('Error connecting to server');
                        $('#neoclient-crop-save').prop('disabled', false).text('Save Image');
                    }, 1000);
                }
            });
        });

        // Close modals
        $(document).on('click', '#neoclient-crop-cancel, .neoclient-modal-close', function() {
            const modal = $(this).closest('#neoclient-image-uploader, #neoclient-image-viewer');
            if (modal.attr('id') === 'neoclient-image-uploader') {
                resetUploader();
            } else {
                modal.hide();
            }
        });

        // View image in viewer
        $(document).on('click', '.neoclient-thumbnail', function() {
            const imageUrl = $(this).data('image-url');
            const imageId = $(this).data('image-id');
            const documentId = $(this).closest('.neoclient-image-upload-section').find('.neoclient-upload-image-btn').data('document-id');
            
            $('#neoclient-image-view').attr('src', imageUrl);
            $('#neoclient-image-delete').data('image-id', imageId).data('document-id', documentId);
            $('#neoclient-image-viewer').show();
        });

        // Close image viewer
        $(document).on('click', '#neoclient-image-close', () => $('#neoclient-image-viewer').hide());

        // Delete image
        $(document).on('click', '#neoclient-image-delete', function() {
            if (!confirm('Are you sure you want to delete this image?')) return;

            const imageId = $(this).data('image-id');
            const documentId = $(this).data('document-id');

            $.ajax({
                url: neoclient_data.ajax_url,
                type: 'POST',
                data: {
                    action: 'neoclient_delete_client_image',
                    nonce: neoclient_data.nonce,
                    document_id: documentId,
                    image_id: imageId
                },
                success: function(response) {
                    if (response.success) {
                        const thumbnail = $(`.neoclient-thumbnail[data-image-id="${imageId}"]`);
                        const container = thumbnail.parent();
                        thumbnail.remove();
                        if (container.children().length === 0) {
                            container.append('<p>No images have been registered for this client</p>');
                        }
                        $('#neoclient-image-viewer').hide();
                    } else {
                        alert(response.data.message || 'Error deleting image');
                    }
                },
                error: function() {
                    alert('Error connecting to server');
                }
            });
        });
    }

    // Load client images
    function loadClientImages(documentId) {
        $.ajax({
            url: neoclient_data.ajax_url,
            type: 'POST',
            data: {
                action: 'neoclient_get_client_images',
                nonce: neoclient_data.nonce,
                document_id: documentId
            },
            success: function(response) {
                if (response.success) {
                    renderClientImages(response.data);
                }
            }
        });
    }

    // Render client images
    function renderClientImages(images) {
        // Implementation for rendering images
    }

    // Initialize upload section for a specific document
    function initImageUploaderForElement(element) {
        const documentId = element.data('document-id');
        const userRole = neoclient_data.user_role;
        
        let uploadSection = '';
        if (userRole === 'pro' || userRole === 'superpro') {
            uploadSection = `
                <div class="neoclient-image-upload-section">
                    <h4>Client Images</h4>
                    <div class="neoclient-image-thumbnails" id="neoclient-thumbnails-${documentId}"></div>
                    <button type="button" class="neoclient-btn neoclient-btn-primary neoclient-upload-image-btn" data-document-id="${documentId}">
                        Upload New Image
                    </button>
                </div>
            `;
        } else {
            uploadSection = `
                <div class="neoclient-image-upload-section">
                    <h4>Client Images</h4>
                    <div class="neoclient-image-thumbnails" id="neoclient-thumbnails-${documentId}"></div>
                    <p class="neoclient-upgrade-message">Get a premium subscription to upload client images</p>
                </div>
            `;
        }
        
        element.append(uploadSection);
        displayExistingImagesForElement(element);
    }

    // Display existing images for a specific document
    function displayExistingImagesForElement(element) {
        const documentId = element.data('document-id');
        const thumbnailContainer = element.find(`#neoclient-thumbnails-${documentId}`);
        
        thumbnailContainer.empty();
        
        const documents = neoclient_data.documents || [];
        const documentData = documents.find(doc => String(doc.id) === String(documentId));
        
        if (documentData && documentData.images && documentData.images.length > 0) {
            documentData.images.forEach(image => {
                const thumbnail = `
                    <div class="neoclient-thumbnail" data-image-id="${image.id}" data-image-url="${image.url}">
                        <img src="${image.url}" alt="Client Image">
                    </div>
                `;
                thumbnailContainer.append(thumbnail);
            });
        } else {
            thumbnailContainer.append('<p>No images have been registered for this client</p>');
        }
    }

    // Initial setup
    function initialize() {
        appendModalHTML();
        bindEvents();

        // Initial check for existing content
        $('.neoclient-document-content').each(function() {
            const $content = $(this);
            if (!$content.data('image-uploader-initialized')) {
                initImageUploaderForElement($content);
                $content.data('image-uploader-initialized', true);
            }
        });

        // Observer for dynamic content
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const $node = $(node);
                        const $contentElements = $node.find('.neoclient-document-content').addBack('.neoclient-document-content');
                        $contentElements.each(function() {
                            const $content = $(this);
                            if (!$content.data('image-uploader-initialized')) {
                                initImageUploaderForElement($content);
                                $content.data('image-uploader-initialized', true);
                            }
                        });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    $(document).ready(initialize);

})(jQuery);