import { createEvent, deleteEvent, getDetail, getEvents, updateEvent } from "../services/EventServices.js"
import { validationResult } from "express-validator"
import { logActivity } from "../services/ActivityService.js";

export const create = async(req, res) => {
    const { title, description, event_date, location, organizer } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }

    if(req.user.role !== 'admin'){
        return res.status(400).json({message: 'Only admin is allowed to create an event.'})
    }

    const eventData = { title, description, event_date, location, organizer };

    try {
        const response = await createEvent(eventData);
        if(response.success){
            // Log activity for event creation
            await logActivity(req.user.id, req.user.role, 'event_create', `Created event: ${title}`);
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to review an appointment. Please try again later.' });
    }
}

export const get = async(req, res) => {
    const { page = 1, limit = 5, date_from, date_to, location } = req.body;

    const eventData = { page, limit, date_from, date_to, location };

    try {
        const response = await getEvents(eventData);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch events. Please try again later.' });
    }
}

export const detail = async(req, res) => {
    const userId = req.params.id;

    try {
        const response = await getDetail(userId);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch event details. Please try again later.' });
    }
}

export const del = async(req, res) => {
    const userId = req.params.id;

    if(req.user.role !== 'admin'){
        return {success: false, message: 'Only admmins can delete an event'};
    }

    try {
        const response = await deleteEvent(userId);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete an event. Please try again later.' });
    }
} 

export const update = async(req, res) => {
    const userId = req.params.id;
    const { title, description, event_date, location, organizer } = req.body;

    if(req.user.role !== 'admin'){
        return {success: false, message: 'Only admmins can delete an event'};
    }

    const eventData = { title, description, event_date, location, organizer };

    try {
        const response = await updateEvent(userId, eventData);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete an event. Please try again later.' });
    }
}


