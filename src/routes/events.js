const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Event = require('../models/Event');

// Get event statistics
router.get('/statistics', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Get total events
        const totalEvents = await Event.countDocuments({ createdBy: userId });

        // Get this month's events
        const monthlyEvents = await Event.countDocuments({
            createdBy: userId,
            start: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Get last month's events for trend calculation
        const lastMonthEvents = await Event.countDocuments({
            createdBy: userId,
            start: { $gte: startOfLastMonth, $lt: startOfMonth }
        });

        // Calculate trend percentage
        const eventsTrend = lastMonthEvents === 0 ? 100 : 
            Math.round(((monthlyEvents - lastMonthEvents) / lastMonthEvents) * 100);

        // Get upcoming events (next 7 days)
        const upcomingEvents = await Event.countDocuments({
            createdBy: userId,
            start: { $gte: now, $lte: nextWeek }
        });

        // Get next 5 events
        const nextEvents = await Event.find({
            createdBy: userId,
            start: { $gte: now }
        })
        .sort({ start: 1 })
        .limit(5)
        .select('title start location');

        // Get category distribution
        const events = await Event.find({ createdBy: userId });
        const categoryDistribution = events.reduce((acc, event) => {
            acc[event.category] = (acc[event.category] || 0) + 1;
            return acc;
        }, {});

        // Get monthly distribution (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const monthlyDistribution = await Event.aggregate([
            {
                $match: {
                    createdBy: userId,
                    start: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$start" },
                        month: { $month: "$start" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]);

        // Format monthly distribution
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedMonthlyDistribution = monthlyDistribution.map(item => ({
            month: months[item._id.month - 1],
            count: item.count
        }));

        // Get timeline data (events per day for the next 30 days)
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const timelineEvents = await Event.find({
            createdBy: userId,
            start: { $gte: now, $lte: thirtyDaysFromNow }
        }).sort({ start: 1 });

        const timeline = timelineEvents.reduce((acc, event) => {
            const date = event.start.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const timelineData = Object.keys(timeline).map(date => ({
            date: date,
            count: timeline[date]
        }));

        res.json({
            totalEvents,
            monthlyEvents,
            upcomingEvents,
            eventsTrend,
            nextEvents,
            categoryDistribution,
            monthlyDistribution: formattedMonthlyDistribution,
            timeline: timelineData
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create a new event
router.post('/', auth, async (req, res) => {
    try {
        const event = new Event({
            ...req.body,
            createdBy: req.user._id
        });

        await event.save();
        res.status(201).json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all events for the current user
router.get('/', auth, async (req, res) => {
    try {
        const events = await Event.find({ createdBy: req.user._id })
            .sort({ start: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single event
router.get('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update an event
router.put('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete an event
router.delete('/:id', auth, async (req, res) => {
    try {
        const event = await Event.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add attendee to event
router.post('/:id/attendees', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const attendee = {
            user: req.body.userId,
            status: 'pending'
        };

        event.attendees.push(attendee);
        await event.save();

        res.json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update attendee status
router.put('/:id/attendees/:attendeeId', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const attendee = event.attendees.id(req.params.attendeeId);
        if (!attendee) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        attendee.status = req.body.status;
        await event.save();

        res.json(event);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 