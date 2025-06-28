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
    categories: [{ 
        type: Schema.Types.ObjectId,
        ref: 'Category'
    }],
    tags: [{ 
        type: String 
    }],
    images: [{
        url: { type: String, required: true }
    }],
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
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

// Add custom validation to ensure at least one category
taskSchema.path('categories').validate(function(value) {
    return value && value.length > 0;
}, 'At least one category is required');

// Create geospatial index for location-based queries
taskSchema.index({ location: '2dsphere' });

const Task = model('Task', taskSchema);

module.exports = Task; 