const { Schema, model } = require('mongoose');

const userSchema = new Schema({ 
    fullName: { type: String, required: true, },
    emailAddress: {type: String, required: true, unique: true},
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    profilePicture: { type: String, default: '' },
    country: { type: String, required: true },
    originState: { type: String, },
    residentState: { type: String, required: true },
    area: { type: String,  },
    address: { type: String, required: true },
    password: { type: String, required: true, unique: true },
    wallet: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const User = model('User', userSchema);

module.exports = User;