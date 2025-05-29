const User = require('../models/user')
const Tasker = require('../models/tasker')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



//User registration

const userRegister = async (req, res) => {
    const { fullName, emailAddress, phoneNumber, country, residentState, address, password,  dateOfBirth } = req.body;
    
    // Check for required fields
    const requiredFields = {
        fullName, emailAddress, phoneNumber, country, residentState, 
        address, password, dateOfBirth
    };
    
    const missingFields = [];
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            missingFields.push(field);
        }
    }
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields",
            missingFields: missingFields
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await User.findOne({ emailAddress });
        if (existingUser) {
            return res.status(400).json({status: "error", message: 'Email is already in use' });
        }

        const existingPhoneNumber = await User.findOne({ phoneNumber: phoneNumber });
        if (existingPhoneNumber) {
            return res.status(400).json({status: "error", message: 'Phone number is already in use' });
        }

        const user = new User({ 
            fullName, 
            emailAddress, 
            phoneNumber, 
            country, 
            residentState, 
            address,  
            password: hashedPassword, 
            wallet: 0,         
            dateOfBirth
        });
        await user.save();



        res.status(201).json({status: "success", message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({status: "error", message: 'Error registering user', error: error.message});
    }
};

const userLogin = async (req, res) => {
    const { emailAddress, password } = req.body;
    try {
        const user = await User.findOne({ emailAddress });
        if (!user) return res.status(400).json({status: "error", message: 'User not found' });

        // Use bcrypt.compare to safely check the password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) return res.status(400).json({status: "error", message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id},
            "secret123",
            { expiresIn: '30d' }
          );

        return res.status(200).json({status: "success", token, user_type: 'user' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};

const getUser =  async (req, res) => {
    try {
        return res.status(200).json({status: "success", message: 'User fetched successfully', user: req.user });
    } catch (error) {
        res.status(500).json({status: "error",  message: error.message });
    }
};

// Tasker registration

const taskerRegister = async (req, res) => {
    const { firstName, lastName, emailAddress, phoneNumber, country, residentState, originState, address, password } = req.body;
    
    // Check for required fields
    const requiredFields = {
        firstName, lastName, emailAddress, phoneNumber, country, 
        residentState, originState, address, password
    };
    
    const missingFields = [];
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            missingFields.push(field);
        }
    }
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            status: "error",
            message: "Missing required fields",
            missingFields: missingFields
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await Tasker.findOne({ emailAddress });
        if (existingUser) {
            return res.status(400).json({status: "error", message: 'Email is already in use' });
        }

        const existingPhoneNumber = await Tasker.findOne({ phoneNumber: phoneNumber });
        if (existingPhoneNumber) {
            return res.status(400).json({status: "error", message: 'Phone number is already in use' });
        }

        const user = new Tasker({ firstName, lastName, emailAddress, phoneNumber, country, originState, residentState, address,  password: hashedPassword, wallet: 0 });
        await user.save();



        res.status(201).json({status: "success", message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({status: "error", message: 'Error registering user', error: error.message});
    }
};

const taskerLogin = async (req, res) => {
    const { emailAddress, password } = req.body;
    try {
        const user = await Tasker.findOne({ emailAddress });
        if (!user) return res.status(400).json({status: "error", message: 'User not found' });

        // Use bcrypt.compare to safely check the password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) return res.status(400).json({status: "error", message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id},
            "secret123",
            { expiresIn: '30d' }
          );

        return res.status(200).json({status: "success", token, user_type: 'tasker' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};

const getTasker = async (req, res) => {
    try {
        return res.status(200).json({status: "success", message: 'User fetched successfully', user: req.user });
    } catch (error) {
        res.status(500).json({status: "error",  message: error.message });
    }
};


module.exports = {
    userRegister,
    userLogin,
    getUser,
    taskerRegister,
    taskerLogin,
    getTasker
};