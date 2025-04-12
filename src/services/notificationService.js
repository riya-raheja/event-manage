const nodemailer = require('nodemailer');
const Push = require('push.js');

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send email notification
async function sendEmailNotification(to, subject, text, html) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            html
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email notification error:', error);
        return false;
    }
}

// Send browser push notification
function sendPushNotification(title, options) {
    try {
        Push.create(title, {
            body: options.body,
            icon: options.icon,
            timeout: options.timeout || 4000,
            onClick: options.onClick
        });
        return true;
    } catch (error) {
        console.error('Push notification error:', error);
        return false;
    }
}

// Send event reminder
async function sendEventReminder(event, user) {
    const eventTime = new Date(event.start);
    const now = new Date();
    const timeUntilEvent = eventTime - now;
    
    // Only send reminder if event is within the next 24 hours
    if (timeUntilEvent > 0 && timeUntilEvent <= 24 * 60 * 60 * 1000) {
        const subject = `Reminder: ${event.title}`;
        const text = `Don't forget about your event: ${event.title}\n
            Time: ${eventTime.toLocaleString()}\n
            Location: ${event.location || 'Not specified'}\n
            Description: ${event.description || 'No description provided'}`;

        const html = `
            <h2>Event Reminder: ${event.title}</h2>
            <p><strong>Time:</strong> ${eventTime.toLocaleString()}</p>
            <p><strong>Location:</strong> ${event.location || 'Not specified'}</p>
            <p><strong>Description:</strong> ${event.description || 'No description provided'}</p>
            <p>View event details: <a href="${process.env.FRONTEND_URL}/events/${event._id}">Click here</a></p>
        `;

        // Send email notification if enabled
        if (user.preferences.notifications.email) {
            await sendEmailNotification(user.email, subject, text, html);
        }

        // Send push notification if enabled
        if (user.preferences.notifications.push) {
            sendPushNotification(`Event Reminder: ${event.title}`, {
                body: `Starts at ${eventTime.toLocaleTimeString()}`,
                onClick: () => window.open(`${process.env.FRONTEND_URL}/events/${event._id}`)
            });
        }
    }
}

// Send event invitation
async function sendEventInvitation(event, invitee) {
    const subject = `Invitation: ${event.title}`;
    const text = `You've been invited to: ${event.title}\n
        Time: ${new Date(event.start).toLocaleString()}\n
        Location: ${event.location || 'Not specified'}\n
        Description: ${event.description || 'No description provided'}`;

    const html = `
        <h2>Event Invitation: ${event.title}</h2>
        <p><strong>Time:</strong> ${new Date(event.start).toLocaleString()}</p>
        <p><strong>Location:</strong> ${event.location || 'Not specified'}</p>
        <p><strong>Description:</strong> ${event.description || 'No description provided'}</p>
        <p>View event details: <a href="${process.env.FRONTEND_URL}/events/${event._id}">Click here</a></p>
    `;

    // Send email notification
    await sendEmailNotification(invitee.email, subject, text, html);
}

module.exports = {
    sendEmailNotification,
    sendPushNotification,
    sendEventReminder,
    sendEventInvitation
}; 