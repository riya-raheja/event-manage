const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OpenAI = require('openai');
const Event = require('../models/Event');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Generate event description
router.post('/generate-description', auth, async (req, res) => {
    try {
        const { title, category } = req.body;

        const prompt = `Generate a professional and engaging description for a ${category} event titled "${title}". 
        The description should be concise, informative, and include relevant details that would interest attendees.`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        res.json({ description: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generate event checklist
router.post('/generate-checklist', auth, async (req, res) => {
    try {
        const { title, category, description } = req.body;

        const prompt = `Create a comprehensive checklist for a ${category} event titled "${title}". 
        Description: ${description}
        Include all necessary tasks and items that need to be prepared or completed before, during, and after the event.`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        const checklist = completion.choices[0].message.content
            .split('\n')
            .filter(item => item.trim())
            .map(item => ({
                item: item.replace(/^\d+\.\s*/, '').trim(),
                completed: false
            }));

        res.json({ checklist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get smart scheduling suggestions
router.get('/scheduling-suggestions', auth, async (req, res) => {
    try {
        const userEvents = await Event.find({ createdBy: req.user._id });
        
        // Analyze user's event patterns
        const timePatterns = analyzeEventPatterns(userEvents);
        
        // Generate suggestions based on patterns
        const suggestions = await generateSchedulingSuggestions(timePatterns);
        
        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Generate event summary
router.post('/generate-summary', auth, async (req, res) => {
    try {
        const { event } = req.body;

        const prompt = `Create a concise summary of the following event:
        Title: ${event.title}
        Category: ${event.category}
        Description: ${event.description}
        Start: ${event.start}
        End: ${event.end}
        Location: ${event.location}
        Include key details and any important notes for attendees.`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        res.json({ summary: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Helper function to analyze event patterns
function analyzeEventPatterns(events) {
    const patterns = {
        preferredDays: {},
        preferredTimes: {},
        categoryDistribution: {}
    };

    events.forEach(event => {
        // Analyze preferred days
        const day = new Date(event.start).getDay();
        patterns.preferredDays[day] = (patterns.preferredDays[day] || 0) + 1;

        // Analyze preferred times
        const hour = new Date(event.start).getHours();
        patterns.preferredTimes[hour] = (patterns.preferredTimes[hour] || 0) + 1;

        // Analyze category distribution
        patterns.categoryDistribution[event.category] = 
            (patterns.categoryDistribution[event.category] || 0) + 1;
    });

    return patterns;
}

// Helper function to generate scheduling suggestions
async function generateSchedulingSuggestions(patterns) {
    const prompt = `Based on the following event patterns:
    Preferred Days: ${JSON.stringify(patterns.preferredDays)}
    Preferred Times: ${JSON.stringify(patterns.preferredTimes)}
    Category Distribution: ${JSON.stringify(patterns.categoryDistribution)}
    Generate 3-5 smart scheduling suggestions for future events.`;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
    });

    return {
        suggestions: completion.choices[0].message.content.split('\n')
            .filter(suggestion => suggestion.trim())
    };
}

module.exports = router; 