// Configuration
const API_CONFIG = {
    endpoint: 'https://leadspare-backend.vercel.app/api/v1/webhooks/lead',
    apiKey: 'YOUR_API_KEY_HERE' // Replace with your actual API key
};

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Form validation patterns
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[1-9][\d]{0,15}$/,
        linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/,
        website: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
    };

    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearErrors);
    });

    // Validate individual field
    function validateField(e) {
        const field = e.target;
        const fieldName = field.name;
        const value = field.value.trim();

        // Remove existing error styling
        field.classList.remove('border-red-500');

        // Skip validation for optional fields that are empty
        if (!field.hasAttribute('required') && !value) {
            return true;
        }

        let isValid = true;
        let errorMessage = '';

        // Check required fields
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (value) {
            // Validate based on field type
            switch(fieldName) {
                case 'email':
                    if (!patterns.email.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'phone':
                    if (!patterns.phone.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid phone number';
                    }
                    break;
                case 'linkedin':
                    if (!patterns.linkedin.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid LinkedIn profile URL';
                    }
                    break;
                case 'website':
                    if (!patterns.website.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid website URL';
                    }
                    break;
                case 'firstName':
                case 'lastName':
                    if (value.length < 2) {
                        isValid = false;
                        errorMessage = 'Name must be at least 2 characters long';
                    }
                    break;
                case 'value':
                    if (isNaN(value) || parseFloat(value) < 0) {
                        isValid = false;
                        errorMessage = 'Please enter a valid positive number';
                    }
                    break;
            }
        }

        if (!isValid) {
            showFieldError(field, errorMessage);
        }

        return isValid;
    }

    // Show field error
    function showFieldError(field, message) {
        field.classList.add('border-red-500');
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error text-red-500 text-sm mt-1';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    // Clear field errors
    function clearErrors(e) {
        const field = e.target;
        field.classList.remove('border-red-500');
        const errorMsg = field.parentNode.querySelector('.field-error');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    // Form submission with API integration
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate all fields
        let isFormValid = true;
        const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
        
        requiredInputs.forEach(input => {
            if (!validateField({ target: input })) {
                isFormValid = false;
            }
        });

        // Also validate optional fields that have values
        const optionalInputs = form.querySelectorAll('input:not([required]), textarea:not([required])');
        optionalInputs.forEach(input => {
            if (input.value.trim()) {
                if (!validateField({ target: input })) {
                    isFormValid = false;
                }
            }
        });

        if (isFormValid) {
            submitToLeadSpare();
        }
    });

    // Submit form to LeadSpare API
    async function submitToLeadSpare() {
        // Show loading state
        form.classList.add('form-submitting');
        submitButton.textContent = 'SUBMITTING...';
        submitButton.disabled = true;

        // Prepare form data
        const formData = new FormData(form);
        const leadData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone') || undefined,
            companyName: formData.get('companyName') || undefined,
            title: formData.get('title') || undefined,
            designation: formData.get('designation') || undefined,
            notes: formData.get('notes') || undefined,
            source: "HR Automation Website",
            value: formData.get('value') ? parseFloat(formData.get('value')) : undefined,
            linkedin: formData.get('linkedin') || undefined,
            website: formData.get('website') || undefined
        };

        // Remove undefined values
        Object.keys(leadData).forEach(key => {
            if (leadData[key] === undefined || leadData[key] === '') {
                delete leadData[key];
            }
        });

        try {
            const response = await fetch(API_CONFIG.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_CONFIG.apiKey
                },
                body: JSON.stringify(leadData)
            });

            if (response.ok) {
                // Success
                form.reset();
                showMessage('Thank you! Your information has been submitted successfully. We will contact you soon!', 'success');
                trackEvent('form_submitted_successfully');
            } else {
                // API error
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage('Sorry, there was an error submitting your information. Please try again or contact us directly.', 'error');
            trackEvent('form_submission_error', { error: error.message });
        } finally {
            // Reset button state
            form.classList.remove('form-submitting');
            submitButton.textContent = 'SUBMIT NOW';
            submitButton.disabled = false;
        }
    }

    // Show success/error message
    function showMessage(message, type) {
        // Remove existing messages
        const existingMessage = form.querySelector('.success-message, .error-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
        messageDiv.textContent = message;
        
        // Add to form
        form.appendChild(messageDiv);
        
        // Remove after 8 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 8000);
    }

    // Analytics tracking
    function trackEvent(eventName, properties = {}) {
        console.log('Event tracked:', eventName, properties);
        // Add your analytics service integration here
    }

    // Track form interactions
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            trackEvent('form_field_focused', { field: input.name });
        });
    });

    // Smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Page performance monitoring
window.addEventListener('load', function() {
    const loadTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    console.log('Page load time:', loadTime + 'ms');
});
