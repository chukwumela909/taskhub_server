const { Schema, model } = require('mongoose');

const taskerSchema = new Schema({ 
    firstName: { type: String, required: true, },
    lastName: { type: String, required: true, },
    emailAddress: {type: String, required: true, unique: true},
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    profilePicture: { type: String, default: '' },
    country: { type: String, required: true },
    originState: { type: String, required: true },
    residentState: { type: String, required: true },
    area: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
});

const Tasker = model('Tasker', taskerSchema);

module.exports = Tasker;