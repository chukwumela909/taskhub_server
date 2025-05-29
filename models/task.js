const { Schema, model } = require('mongoose');

const taskSchema = new Schema({
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    },
    tags: [{ 
        type: String 
    }],
    media: [{
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video', 'document'], required: true },
        publicId: { type: String }
    }],
    location: {
        address: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true }
    },
    budget: { 
        type: Number, 
        required: true 
    },
    isBiddingEnabled: { 
        type: Boolean, 
        default: false 
    },
    deadline: { 
        type: Date 
    },
    status: { 
        type: String, 
        enum: ['open', 'assigned', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    assignedTasker: { 
        type: Schema.Types.ObjectId, 
        ref: 'Tasker' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

const Task = model('Task', taskSchema);

module.exports = Task; 