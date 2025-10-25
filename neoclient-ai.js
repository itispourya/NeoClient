/**
 * NeoClient AI v1.0 - AI features for NeoClient
 * Powered by NeoNotion.net
 */

// Define translations for AI texts
const translations = {
    // Skin types
    'normal': 'Normal',
    'oily': 'Oily',
    'dry': 'Dry',
    'combination': 'Combination',
    'sensitive': 'Sensitive',
    
    // Hydration levels
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    
    // Acne levels
    'none': 'No Acne',
    'mild': 'Mild',
    'moderate': 'Moderate',
    'severe': 'Severe',
    
    // Sun exposure levels
    'minimal': 'Minimal',
    'occasional': 'Occasional',
    'frequent': 'Frequent',
    'constant': 'Constant',
    
    // Skin tone
    'light': 'Light',
    'medium_tone': 'Medium',
    'dark': 'Dark',
    
    // Skin problems
    'acne': 'Acne',
    'wrinkles': 'Wrinkles',
    'hyperpigmentation': 'Hyperpigmentation',
    'redness': 'Redness',
    'dryness': 'Dryness',
    'oiliness': 'Oiliness',
    'large_pores': 'Large Pores',
    'dark_circles': 'Dark Circles',
    
    // Environmental factors
    'pollution': 'Pollution',
    'extreme_weather': 'Extreme Weather',
    'air_conditioning': 'Air Conditioning',
    'heating': 'Heating',
    
    // Stress levels
    'low_stress': 'Low Stress',
    'moderate_stress': 'Moderate Stress',
    'high_stress': 'High Stress',
    
    // AI output titles
    'skincare_routine_title': 'Recommended Skincare Routine:',
    'product_recommendations_title': 'Product Recommendations:',
    'skin_analysis_title': 'Skin Analysis:',
    'premium_required': 'Get a premium subscription to use AI features',
    'generate_skincare_routine': 'Generate Skincare Routine',
    'generate_product_recommendations': 'Generate Product Recommendations',
    'generate_skin_analysis': 'Generate Skin Analysis',
    // Field labels for completeness in messages
    'skin_type': 'Skin Type',
    'hydration_level': 'Hydration Level',
    'acne_level': 'Acne Level',
    'skin_concerns': 'Skin Concerns',
    'sensitivities': 'Sensitivities'
};

// Function to translate English texts
function translate(key) {
    return translations[key] || key;
}

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

    // Skincare routine constants based on skin types - updated with more specialized details and active ingredients
    window.ROUTINE_RULES = {
        normal: {
            morning: [
                "1. Gentle cleanser containing mild surfactants like coco glucoside to maintain skin pH balance",
                "2. Hydrating toner with hyaluronic acid and soothing botanical extracts like aloe vera",
                "3. Vitamin C serum (in stable form like ascorbic acid tetra isopalmitate) for antioxidant protection",
                "4. Lightweight moisturizer with ceramides and essential fatty acids to strengthen skin barrier",
                "5. Mineral or chemical sunscreen with SPF 50+ and PA++++ containing zinc oxide or titanium dioxide"
            ],
            evening: [
                "1. Oil cleanser (if wearing makeup) based on non-comedogenic oils like jojoba or argan",
                "2. Gentle water-soluble cleanser with pH 5.5 to prevent disruption of skin microbiome",
                "3. Hydrating toner with polyglutamic acid for deep hydration",
                "4. Niacinamide serum 5-10% for sebum regulation and inflammation reduction",
                "5. Rich moisturizer with peptides to support collagen synthesis",
                "6. Eye cream containing caffeine and peptides to reduce puffiness and dark circles"
            ],
            weekly: [
                "1. Gentle chemical exfoliation with AHA (like glycolic acid 5-10%) 1-2 times per week for cellular renewal",
                "2. Hydrating mask with hyaluronic acid and ceramides 1-2 times per week to boost hydration"
            ]
        },
        oily: {
            morning: [
                "1. Gel or foam cleanser containing salicylic acid (BHA) 0.5-2% for oil control and pore cleansing",
                "2. Alcohol-free toner with green tea extract and niacinamide for sebum balancing",
                "3. Light antioxidant serum like vitamin C derivative for protection without weighing down skin",
                "4. Oil-free moisturizer with gel formula containing hyaluronic acid and natural mattifiers like silica",
                "5. Oil-free mineral sunscreen with SPF 50+ containing zinc oxide for mattifying effect"
            ],
            evening: [
                "1. Oil cleanser (if wearing makeup) with light oils like grapeseed to dissolve excess oil",
                "2. Gel or foam cleanser with BHA for deep pore cleansing",
                "3. BHA toner (2% salicylic acid) for gentle exfoliation and preventing pore blockage",
                "4. Niacinamide 10% + Zinc 1% serum for inflammation reduction and acne control",
                "5. Light gel moisturizer with anti-inflammatory extracts like centella asiatica"
            ],
            weekly: [
                "1. Kaolin or bentonite clay mask 1-2 times per week to absorb excess oil without drying skin",
                "2. Chemical exfoliation with BHA (salicylic acid) 1-2 times per week for deep pore cleansing"
            ]
        },
        dry: {
            morning: [
                "1. Creamy or lotion cleanser containing gentle emulsifiers and skin-like lipids such as ceramides",
                "2. Rich hydrating toner with glycerin and multi-molecular hyaluronic acid",
                "3. Low molecular weight hyaluronic acid serum for deep penetration and hydration of deeper layers",
                "4. Rich moisturizer with occlusives like petrolatum or shea butter to lock in moisture",
                "5. Facial oil containing squalane or argan for skin barrier strengthening (optional)",
                "6. Hydrating sunscreen with SPF 50+ containing hyaluronic acid and antioxidants"
            ],
            evening: [
                "1. Oil cleanser based on nourishing oils like sweet almond or avocado",
                "2. Creamy cleanser with balanced pH and sulfate-free to preserve natural moisture",
                "3. Hydrating toner with polysaccharides to form protective film",
                "4. Hyaluronic acid serum combined with ceramides for skin barrier repair",
                "5. Rich night cream with gentle retinol alternative like bakuchiol for anti-aging without irritation",
                "6. Facial oil with vitamin E and omega fatty acids for nighttime nourishment"
            ],
            weekly: [
                "1. Gentle enzymatic exfoliation with fruit enzymes like papain once per week to prevent dead cell buildup",
                "2. Overnight hydrating mask with 5-10% urea and lipids 1-2 times per week for deep restoration"
            ]
        },
        combination: {
            morning: [
                "1. Gentle foam cleanser containing mild surfactant blend to control T-zone oil without drying cheeks",
                "2. Balancing toner with niacinamide and botanical extracts for overall skin balance",
                "3. Stable vitamin C serum for brightening and protection in all areas",
                "4. Light moisturizer (more on dry areas) with hyaluronic acid and ceramides",
                "5. Hybrid sunscreen with SPF 50+ for balanced coverage without excessive shine"
            ],
            evening: [
                "1. Oil cleanser (if wearing makeup) to dissolve T-zone oil",
                "2. Gentle foam cleanser with pH 5.5 for cleansing without disruption",
                "3. Balancing toner with BHA for T-zone and AHA for dry areas",
                "4. Niacinamide serum for sebum control and simultaneous hydration",
                "5. Light moisturizer (more on dry areas) with gel-cream formula"
            ],
            weekly: [
                "1. Clay mask on T-zone with kaolin once per week for oil absorption",
                "2. Hydrating mask on dry areas with hyaluronic acid once per week",
                "3. Gentle hybrid exfoliation (AHA/BHA) 1-2 times per week for overall balance"
            ]
        }
    };

    // Product recommendations based on skin type and skin problems - updated with key ingredients and specialized details
    window.PRODUCT_RECOMMENDATIONS = {
        normal: {
            cleansers: ["Gentle hydrating cleanser (containing glycerin, coco glucoside and aloe vera extract to maintain pH balance)", "pH-balanced cleanser (containing ceramides and essential fatty acids to strengthen skin barrier)"],
            toners: ["Hydrating toner (containing hyaluronic acid and polyglutamic acid for layered hydration)", "Balancing toner (containing 5% niacinamide and green tea extract for antioxidants)"],
            serums: ["Vitamin C serum (containing 15% ascorbic acid tetra isopalmitate and vitamin E for stability)", "Niacinamide serum (containing 10% niacinamide and zinc for sebum regulation)"],
            moisturizers: ["Light daily moisturizer (with ceramides, hyaluronic acid and peptides for collagen support)", "Hydrating gel-cream (with glycerin and squalane to lock in moisture)"],
            sunscreens: ["Invisible SPF 50+ (with zinc oxide and titanium dioxide for mineral protection)", "Hydrating SPF 50+ (with hyaluronic acid and botanical antioxidants)"]
        },
        oily: {
            cleansers: ["Oil-control foaming cleanser (with 1% salicylic acid, green tea and activated charcoal)", "Salicylic acid cleanser (with 2% BHA and niacinamide to reduce inflammation)"],
            toners: ["BHA clarifying toner (with 2% salicylic acid and willow bark extract for exfoliation)", "Oil-control toner (with zinc PCA and mineral mattifiers)"],
            serums: ["Niacinamide + zinc serum (10% niacinamide and 1% zinc for sebum control and acne)", "Salicylic acid treatment (2% BHA with centella asiatica for soothing)"],
            moisturizers: ["Oil-free gel moisturizer (with hyaluronic acid and silica for mattifying)", "Mattifying moisturizer (with niacinamide and oil-absorbing powders)"],
            sunscreens: ["Oil-free mattifying SPF 50+ (with zinc oxide and lightweight chemical filters)", "Pore-minimizing SPF (with niacinamide and salicylic acid for oil control)"]
        },
        dry: {
            cleansers: ["Creamy hydrating cleanser (with ceramides, shea butter and glycerin to retain moisture)", "Moisture-boosting cleanser (with omega fatty acids and hyaluronic acid)"],
            toners: ["Hydrating essence toner (with polysaccharides and 5% urea for deep hydration)", "Moisture-repair toner (with ceramides and skin-identical lipids)"],
            serums: ["Hyaluronic acid serum (multi-weight hyaluronic acid and vitamin B5 for repair)", "Ceramide complex serum (ceramides 1,3,6-II and cholesterol for barrier support)"],
            moisturizers: ["Rich moisturizer (with petrolatum, shea butter and peptides for restoration)", "Barrier repair cream (with niacinamide and plant-derived squalane)"],
            sunscreens: ["Hydrating SPF 50+ (with hyaluronic acid and lipid antioxidants)", "Moisturizing UV protector (with ceramides and vitamin E for protection and nourishment)"]
        },
        combination: {
            cleansers: ["Balancing foaming cleanser (with BHA/AHA blend and botanical extracts for zonal balance)", "Gentle gel cleanser (with niacinamide and hyaluronic acid for control and hydration)"],
            toners: ["Balancing toner (with 5% niacinamide and zinc for the T-zone)", "Dual-action toner (BHA for oiliness and AHA for dryness)"],
            serums: ["Niacinamide serum (10% niacinamide for overall sebum balance)", "Balancing complex (with hyaluronic acid and salicylic acid for different areas)"],
            moisturizers: ["Zone-specific moisturizer (gel for T-zone, cream for cheeks with ceramides)", "Balancing gel-cream (with glycerin and mattifiers)"],
            sunscreens: ["Lightweight SPF 50+ (with hybrid filters and niacinamide for balance)", "Balancing UV protector (with zinc oxide and hyaluronic acid)"]
        }
    };

    // Translation function is defined above
    
    // Check if user has premium access
    function hasAIAccess() {
        // This value should be set from PHP via wp_localize_script
        return (typeof neoclient_data.has_ai_access !== 'undefined') ? neoclient_data.has_ai_access : false;
    }
    
    // Activate AI features on page load
    jQuery(document).ready(function($) {
        // Add AI output containers if missing
        if ($('#ai-skincare-routine-output').length === 0) {
            $('#edit-document-skincare_routine').after('<div id="ai-skincare-routine-output" class="neoclient-ai-output"></div>');
        }
        if ($('#ai-product-recommendations-output').length === 0) {
            $('#edit-document-purchased_products').after('<div id="ai-product-recommendations-output" class="neoclient-ai-output"></div>');
        }
        if ($('#ai-skin-analysis-output').length === 0) {
            $('#edit-document-skin_needs').after('<div id="ai-skin-analysis-output" class="neoclient-ai-output"></div>');
        }

        // Generate AI content on load or edit
        $(document).on('neoclient:document:loaded', function() {
            console.log('neoclient:document:loaded event triggered - updating AI info');
            if (hasAIAccess()) {
                // Clear previous content
                $('#ai-skincare-routine-output, #ai-product-recommendations-output, #ai-skin-analysis-output').html('');
                // Generate new content
                generateSkincareRoutine($);
                generateProductRecommendations($);
                generateSkinAnalysis($);
            } else {
                showPremiumRequiredMessage($);
            }
        });

        // Update content on specific field changes
        $('#edit-document-skin_type, #edit-document-hydration_level, #edit-document-acne_level, #edit-document-skin_concerns, #edit-document-sensitivities').on('change', function() {
            console.log('Field changed ' + $(this).attr('id') + ' - updating AI info');
            if (hasAIAccess()) {
                const fieldId = $(this).attr('id');
                if (fieldId === 'edit-document-skin_type' || fieldId === 'edit-document-hydration_level') {
                    $('#ai-skincare-routine-output, #ai-product-recommendations-output, #ai-skin-analysis-output').html('');
                    setTimeout(function() {
                        generateSkincareRoutine($);
                        generateProductRecommendations($);
                        generateSkinAnalysis($);
                    }, 100);
                } else if (fieldId === 'edit-document-acne_level') {
                    $('#ai-skincare-routine-output, #ai-skin-analysis-output').html('');
                    setTimeout(function() {
                        generateSkincareRoutine($);
                        generateSkinAnalysis($);
                    }, 100);
                } else if (fieldId === 'edit-document-skin_concerns') {
                    $('#ai-product-recommendations-output, #ai-skin-analysis-output').html('');
                    setTimeout(function() {
                        generateProductRecommendations($);
                        generateSkinAnalysis($);
                    }, 100);
                } else if (fieldId === 'edit-document-sensitivities') {
                    $('#ai-skin-analysis-output').html('');
                    setTimeout(function() {
                        generateSkinAnalysis($);
                    }, 100);
                }
            } else {
                showPremiumRequiredMessage($);
            }
        });

        // When edit popup opens, refresh AI content
        $('body').on('click', '.neoclient-action-icon.edit, .neoclient-action-button.edit', function() {
            console.log('Edit button clicked - updating AI info');
            $('#ai-skincare-routine-output, #ai-product-recommendations-output, #ai-skin-analysis-output').html('');
            setTimeout(function() {
                console.log('Generating AI content after delay');
                if (hasAIAccess()) {
                    generateSkincareRoutine($);
                    generateProductRecommendations($);
                    generateSkinAnalysis($);
                } else {
                    showPremiumRequiredMessage($);
                }
            }, 1500);
        });

        // Initial AI content activation
        setTimeout(function() {
            $(document).trigger('neoclient:document:loaded');
        }, 500);
    });

    // Return public methods if needed
    return {
        generateSkincareRoutine: generateSkincareRoutine,
        generateProductRecommendations: generateProductRecommendations,
        generateSkinAnalysis: generateSkinAnalysis
    };
}));

// Show premium required message for free users
function showPremiumRequiredMessage($) {
    const premiumMessage = translate('premium_required');
    $('#ai-skincare-routine-output, #ai-product-recommendations-output, #ai-skin-analysis-output')
        .addClass('premium-required')
        .html('<h3>' + translate('skincare_routine_title') + '</h3>' + premiumMessage);
}

// Convert hydration level string to numeric scale
function getHydrationLevelNum(level) {
    const levels = { 'low': 1, 'medium': 2, 'high': 3 };
    return levels[level] || 2;
}

// Convert acne level string to numeric scale
function getAcneLevelNum(level) {
    const levels = { 'none': 0, 'mild': 1, 'moderate': 2, 'severe': 3 };
    return levels[level] || 0;
}

// Collect client data from form fields
function getClientData($) {
    const skinType = $('#edit-document-skin_type').val() || '';
    const hydrationLevel = $('#edit-document-hydration_level').val() || '';
    const acneLevel = $('#edit-document-acne_level').val() || '';
    const skinConcernsText = $('#edit-document-skin_concerns').val() || '';
    const sensitivitiesText = $('#edit-document-sensitivities').val() || '';
    const sunExposure = $('#edit-document-sun_exposure').val() || '';
    const skinTone = $('#edit-document-skin_tone').val() || '';
    const environmentText = $('#edit-document-environmental_factors').val() || '';
    const stressLevel = $('#edit-document-stress_level').val() || '';

    const skinConcerns = skinConcernsText ? skinConcernsText.split(',').map(s => s.trim()).filter(Boolean) : [];
    const sensitivities = sensitivitiesText ? sensitivitiesText.split(',').map(s => s.trim()).filter(Boolean) : [];
    const environmentFactors = environmentText ? environmentText.split(',').map(s => s.trim()).filter(Boolean) : [];

    return { skinType, hydrationLevel, acneLevel, sunExposure, skinTone, skinConcerns, sensitivities, environmentFactors, stressLevel };
}

// Generate comprehensive skincare routine with professional guidance
function generateSkincareRoutine($) {
    const { skinType, hydrationLevel, acneLevel, skinConcerns, sensitivities } = getClientData($);

    const missing = [];
    if (!skinType) missing.push(translate('skin_type'));
    if (!hydrationLevel) missing.push(translate('hydration_level'));
    if (!acneLevel) missing.push(translate('acne_level'));

    if (missing.length > 0) {
        const msg = `**Client record is incomplete.**\n\nPlease complete: ${missing.join(', ')}.`;
        $('#ai-skincare-routine-output').removeClass('premium-required').html('<h3>' + translate('skincare_routine_title') + '</h3>' + msg.replace(/\n/g,'<br>'));
        return;
    }

    const routine = ROUTINE_RULES[skinType] || ROUTINE_RULES.normal;

    let text = '';
    text += '**Morning Routine (biologically informed):**\n';
    text += routine.morning.join('\n') + '\n\n';

    text += '**Evening Routine (barrier repair focus):**\n';
    text += routine.evening.join('\n') + '\n\n';

    text += '**Weekly Care (controlled stimulation):**\n';
    text += routine.weekly.join('\n') + '\n\n';

    // Hydration adjustments
    const hyd = getHydrationLevelNum(hydrationLevel);
    if (hyd <= 1) {
        text += '**Hydration Strategy:** Aim to reduce transepidermal water loss (TEWL) using layered humectants (multi-weight hyaluronic acid), occlusives (squalane/petrolatum), and barrier-supporting lipids (ceramides 1,3,6-II). Consider overnight masks with 5–10% urea and avoid over-cleansing.\n\n';
    } else if (hyd >= 3) {
        text += '**Hydration Maintenance:** Keep humectants once daily and focus on photoprotection and antioxidants to prevent photo-induced dehydration.\n\n';
    }

    // Acne adjustments
    const acne = getAcneLevelNum(acneLevel);
    if (acne >= 1) {
        text += '**Acne Management (AAD-aligned):** Introduce 0.5–2% salicylic acid for follicular penetration, niacinamide 5–10% for sebum modulation, and lightweight non-comedogenic emollients. For moderate to severe acne, discuss benzoyl peroxide 2.5–5% and nightly retinoids with a dermatologist.\n\n';
    }

    // Concerns and sensitivities
    if (skinConcerns && skinConcerns.length) {
        text += '**Targeted Concerns:** ' + skinConcerns.join(', ') + '. Tailor actives (e.g., tranexamic acid for hyperpigmentation, peptides for fine lines).\n\n';
    }
    if (sensitivities && sensitivities.length) {
        text += '**Sensitivity Precautions:** Prefer fragrance-free, dye-free, low-preservative formulas; patch test retinoids/acids; incorporate soothing agents (bisabolol, centella, allantoin).\n\n';
    }

    const $out = $('#ai-skincare-routine-output');
    $out.removeClass('premium-required').html('<h3>' + translate('skincare_routine_title') + '</h3>' + text.replace(/\n/g,'<br>'));
}

// Generate detailed product recommendations with evidence-informed notes
function generateProductRecommendations($) {
    const { skinType, hydrationLevel, acneLevel, skinConcerns } = getClientData($);

    const missing = [];
    if (!skinType) missing.push(translate('skin_type'));
    if (!hydrationLevel) missing.push(translate('hydration_level'));
    if (!acneLevel) missing.push(translate('acne_level'));
    if (!skinConcerns || !skinConcerns.length) missing.push(translate('skin_concerns'));

    if (missing.length > 0) {
        const msg = `**Client record is incomplete.**\n\nPlease complete: ${missing.join(', ')}.`;
        $('#ai-product-recommendations-output').removeClass('premium-required').html('<h3>' + translate('product_recommendations_title') + '</h3>' + msg.replace(/\n/g,'<br>'));
        return;
    }

    const products = PRODUCT_RECOMMENDATIONS[skinType] || PRODUCT_RECOMMENDATIONS.normal;
    let text = '';
    text += '**Cleanser (pH-balanced, barrier safe):**\n- ' + products.cleansers.join('\n- ') + '\n\n';
    text += '**Toner/Essence (hydration and gentle exfoliation):**\n- ' + products.toners.join('\n- ') + '\n\n';
    text += '**Serum (actives matched to phenotype):**\n- ' + products.serums.join('\n- ') + '\n\n';
    text += '**Moisturizer (lipid repletion/barrier support):**\n- ' + products.moisturizers.join('\n- ') + '\n\n';
    text += '**Sunscreen (broad-spectrum SPF 50+):**\n- ' + products.sunscreens.join('\n- ') + '\n\n';

    // Hydration emphasis
    const hyd = getHydrationLevelNum(hydrationLevel);
    if (hyd <= 1) {
        text += '**Hydration Add-ons:** Multi-weight hyaluronic acid, ceramide complex with cholesterol, polyglutamic acid mists for sustained hydration.\n\n';
    }

    // Acne emphasis
    const acne = getAcneLevelNum(acneLevel);
    if (skinConcerns.includes('acne') || acne >= 2) {
        text += '**Acne Toolset:** 2% salicylic acid cleanser/leave-on, benzoyl peroxide 2.5–5%, niacinamide 10%, azelaic acid 10%. Consider professional guidance for retinoids.\n\n';
    }

    if (skinConcerns.includes('hyperpigmentation')) {
        text += '**Hyperpigmentation Actives:** Vitamin C (10–20% L-ascorbic acid with ferulic), alpha arbutin 2%, tranexamic acid 3–5%, azelaic acid 10–15%.\n\n';
    }

    if (skinConcerns.includes('wrinkles')) {
        text += '**Anti-aging Strategy:** Retinol 0.3–1% at night (or bakuchiol alternative), peptides (Matrixyl), hydrating HA serums, diligent photoprotection.\n\n';
    }

    $('#ai-product-recommendations-output').removeClass('premium-required').html('<h3>' + translate('product_recommendations_title') + '</h3>' + text.replace(/\n/g,'<br>'));
}

// Generate professional skin analysis with modern dermatology framing
function generateSkinAnalysis($) {
    const data = getClientData($);

    const missing = [];
    if (!data.skinType) missing.push(translate('skin_type'));
    if (!data.hydrationLevel) missing.push(translate('hydration_level'));
    if (!data.acneLevel) missing.push(translate('acne_level'));
    if (!data.skinConcerns || !data.skinConcerns.length) missing.push(translate('skin_concerns'));
    if (!data.sensitivities || !data.sensitivities.length) missing.push(translate('sensitivities'));

    if (missing.length > 0) {
        const msg = `**Client record is incomplete.**\n\nPlease complete: ${missing.join(', ')}.`;
        $('#ai-skin-analysis-output').removeClass('premium-required').html('<h3>' + translate('skin_analysis_title') + '</h3>' + msg.replace(/\n/g,'<br>'));
        return;
    }

    const hyd = getHydrationLevelNum(data.hydrationLevel);
    const acne = getAcneLevelNum(data.acneLevel);

    let text = '';
    text += '**Client Summary:**\n';
    text += `- **Skin Type:** ${data.skinType}\n`;
    text += `- **Hydration:** ${data.hydrationLevel}\n`;
    text += `- **Acne:** ${data.acneLevel}\n`;
    text += `- **Concerns:** ${data.skinConcerns.join(', ')}\n`;
    text += `- **Sensitivities:** ${data.sensitivities.join(', ')}\n`;
    if (data.sunExposure) text += `- **Sun Exposure:** ${data.sunExposure}\n`;
    if (data.skinTone) text += `- **Skin Tone:** ${data.skinTone}\n`;
    if (data.environmentFactors && data.environmentFactors.length) text += `- **Environment:** ${data.environmentFactors.join(', ')}\n`;
    if (data.stressLevel) text += `- **Stress Level:** ${data.stressLevel}\n`;
    text += '\n';

    // Skin type analysis
    text += '**Skin Type Analysis:** ';
    switch (data.skinType) {
        case 'normal':
            text += 'Balanced lipid and moisture profile with well-functioning barrier and minimal dysbiosis. Focus on maintenance and photoprotection.';
            break;
        case 'oily':
            text += 'Hyperseborrhea increases comedogenesis and inflammatory risk. Strategy: sebum modulation without barrier disruption, non-comedogenic formulations.';
            break;
        case 'dry':
            text += 'Impaired lipid matrix with elevated TEWL; prioritize barrier restoration via ceramides/cholesterol/free fatty acids and gentle cleansing.';
            break;
        case 'combination':
            text += 'Regional heterogeneity (oily T-zone, dry cheeks); apply zonal care with selective actives.';
            break;
        default:
            text += 'Undefined phenotype; proceed with gentle baseline routine.';
    }
    text += '\n\n';

    // Hydration analysis
    text += '**Hydration Analysis:** ';
    if (hyd <= 1) text += 'Dehydration phenotype with compromised barrier; introduce layered humectants, occlusives, and ceramide complexes; minimize surfactant exposure.';
    else if (hyd >= 3) text += 'Good hydration; maintain with humectants and antioxidants; avoid over-exfoliation.';
    else text += 'Moderate hydration; potential improvement via toner + serum layering, occlusive finish at night.';
    text += '\n\n';

    // Acne analysis
    text += '**Acne Status:** ';
    if (acne === 0) text += 'No active lesions; emphasize prevention and non-comedogenic care.';
    else if (acne === 1) text += 'Mild comedonal activity; gentle BHA usage and microbiome-friendly routine recommended.';
    else if (acne === 2) text += 'Inflammatory lesions present; integrate BHA and benzoyl peroxide; consider retinoids with professional oversight.';
    else text += 'Severe, possible scarring risk; dermatology consult for systemic/advanced topical therapies.';
    text += '\n\n';

    // Sensitivities
    text += '**Sensitivity Profile:** Avoid fragrances, essential oils, harsh preservatives; use soothing actives (bisabolol, centella, allantoin). Patch-test potent actives.';
    text += '\n\n';

    // Concerns
    text += '**Concern-driven Strategy:** Match actives to concerns: vitamin C/alpha arbutin/tranexamic acid for pigmentation; retinoids/peptides for wrinkles; niacinamide/azelaic acid for redness/acne.';
    text += '\n\n';

    // General recommendations
    text += '**General Recommendations (AAD 2023-aligned):**\n';
    text += '- Broad-spectrum SPF 50+ daily; reapply every 2–3 hours outdoors.\n';
    text += '- Hydration: 2–3 liters of water/day; balanced diet rich in antioxidants and omega-3.\n';
    text += '- Sleep: 7–9 hours; stress management (mindfulness) to reduce systemic inflammation.\n';
    text += '- Avoid over-exfoliation; prioritize barrier repair and gradual actives introduction.\n';

    $('#ai-skin-analysis-output').removeClass('premium-required').html('<h3>' + translate('skin_analysis_title') + '</h3>' + text.replace(/\n/g,'<br>'));
}

// Expose public methods if needed
window.NeoClientAI = {
    generateSkincareRoutine: generateSkincareRoutine,
    generateProductRecommendations: generateProductRecommendations,
    generateSkinAnalysis: generateSkinAnalysis
};