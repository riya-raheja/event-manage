document.addEventListener('DOMContentLoaded', async () => {
    // Load user profile data
    await loadUserProfile();
    
    // Set up event listeners
    setupEventListeners();
});

async function loadUserProfile() {
    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to load profile');
        }

        const user = await response.json();
        populateProfileForm(user);
    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorMessage('Failed to load profile data');
    }
}

function populateProfileForm(user) {
    // Update profile image
    const profileImage = document.getElementById('profile-image');
    profileImage.src = user.profileImage || '/images/default-avatar.png';

    // Update header info
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-email').textContent = user.email;

    // Populate form fields
    document.getElementById('name').value = user.name || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('location').value = user.location || '';

    // Social links
    document.getElementById('twitter').value = user.socialLinks?.twitter || '';
    document.getElementById('linkedin').value = user.socialLinks?.linkedin || '';
    document.getElementById('github').value = user.socialLinks?.github || '';

    // Preferences
    document.getElementById('theme').value = user.preferences?.theme || 'light';
    document.getElementById('calendar-view').value = user.preferences?.calendarView || 'month';
    document.getElementById('email-notifications').checked = user.preferences?.notifications?.email ?? true;
    document.getElementById('push-notifications').checked = user.preferences?.notifications?.push ?? true;
}

function setupEventListeners() {
    // Profile image upload
    const imageUpload = document.getElementById('image-upload');
    imageUpload.addEventListener('change', handleImageUpload);

    // Profile form submission
    const profileForm = document.getElementById('profile-form');
    profileForm.addEventListener('submit', handleProfileUpdate);
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showErrorMessage('Please upload an image file');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showErrorMessage('Image size should be less than 5MB');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('profileImage', file);

        const response = await fetch('/api/users/profile/image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload image');
        }

        const data = await response.json();
        
        // Update profile image
        document.getElementById('profile-image').src = data.profileImage;
        
        showSuccessMessage('Profile image updated successfully');
    } catch (error) {
        console.error('Error uploading image:', error);
        showErrorMessage('Failed to upload image');
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('name'),
        bio: formData.get('bio'),
        phone: formData.get('phone'),
        location: formData.get('location'),
        socialLinks: {
            twitter: formData.get('socialLinks.twitter'),
            linkedin: formData.get('socialLinks.linkedin'),
            github: formData.get('socialLinks.github')
        },
        preferences: {
            theme: formData.get('preferences.theme'),
            calendarView: formData.get('preferences.calendarView'),
            notifications: {
                email: formData.get('preferences.notifications.email') === 'on',
                push: formData.get('preferences.notifications.push') === 'on'
            }
        }
    };

    try {
        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const updatedUser = await response.json();
        populateProfileForm(updatedUser);
        showSuccessMessage('Profile updated successfully');

        // Update theme if changed
        if (data.preferences.theme !== document.documentElement.getAttribute('data-theme')) {
            document.documentElement.setAttribute('data-theme', data.preferences.theme);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorMessage('Failed to update profile');
    }
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
} 