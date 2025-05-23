const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoute');




const app = express();
app.use(express.json());

mongoose.connect('mongodb+srv://amirizew:WZuU4tlmrpBuokk7@cluster0.fhjcavr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Could not connect to MongoDB', err));

app.use(express.json());

// routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({status: "error", message: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
});
