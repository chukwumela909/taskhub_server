const Tasker = require('../models/tasker');

// Notify taskers about new tasks matching their categories
const notifyMatchingTaskers = async (task) => {
    try {
        // Find taskers who have ANY of the task's categories in their categories array
        const matchingTaskers = await Tasker.find({
            categories: { $in: task.categories },
            isActive: true,
            isEmailVerified: true
        }).populate('categories', 'name displayName');

        if (matchingTaskers.length === 0) {
            console.log(`No matching taskers found for categories: ${task.categories.join(', ')}`);
            return;
        }

        console.log(`Found ${matchingTaskers.length} matching taskers for task: ${task.title}`);
        
        // Get category names for logging
        const Category = require('../models/category');
        const taskCategories = await Category.find({ _id: { $in: task.categories } });
        const categoryNames = taskCategories.map(cat => cat.displayName).join(', ');
        
        for (const tasker of matchingTaskers) {
            // Find which categories match for this tasker
            const matchingCategoryIds = tasker.categories
                .filter(taskerCat => task.categories.some(taskCat => taskCat.toString() === taskerCat._id.toString()))
                .map(cat => cat.displayName)
                .join(', ');
                
            console.log(`📧 Notification: Tasker ${tasker.firstName} ${tasker.lastName} (${tasker.emailAddress}) - New "${categoryNames}" task available: "${task.title}" (matches: ${matchingCategoryIds})`);
            
            // In a real implementation, you would:
            // 1. Send email notification
            // 2. Send push notification
            // 3. Create in-app notification record
            // 4. Send SMS notification (if enabled)
            
            // Example structure for future implementation:
            /*
            await sendEmailNotification({
                to: tasker.emailAddress,
                subject: `New Task Available: ${task.title}`,
                template: 'new-task-notification',
                data: {
                    taskerName: `${tasker.firstName} ${tasker.lastName}`,
                    taskTitle: task.title,
                    taskDescription: task.description,
                    taskBudget: task.budget,
                    taskCategories: categoryNames,
                    taskLocation: task.location,
                    taskDeadline: task.deadline,
                    taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
                }
            });
            
            await createInAppNotification({
                userId: tasker._id,
                type: 'new_task_match',
                title: 'New Task Available',
                message: `A new "${categoryNames}" task has been posted in your area.`,
                data: {
                    taskId: task._id,
                    taskTitle: task.title,
                    taskBudget: task.budget
                }
            });
            */
        }
        
        return {
            notifiedCount: matchingTaskers.length,
            taskCategories: categoryNames,
            taskers: matchingTaskers.map(tasker => ({
                id: tasker._id,
                name: `${tasker.firstName} ${tasker.lastName}`,
                email: tasker.emailAddress,
                matchingCategories: tasker.categories
                    .filter(taskerCat => task.categories.some(taskCat => taskCat.toString() === taskerCat._id.toString()))
                    .map(cat => cat.displayName)
            }))
        };
        
    } catch (error) {
        console.error('Error notifying matching taskers:', error);
        throw error;
    }
};

// Get taskers by category for analytics
const getTaskersByCategory = async (categoryId) => {
    try {
        const taskers = await Tasker.find({
            categories: categoryId,
            isActive: true
        }).populate('categories', 'name displayName description');
        
        return taskers;
    } catch (error) {
        console.error('Error getting taskers by category:', error);
        throw error;
    }
};

// Get category match statistics
const getCategoryMatchStats = async (categoryId) => {
    try {
        const Task = require('../models/task');
        
        const [taskersCount, tasksCount, recentTasks] = await Promise.all([
            Tasker.countDocuments({ categories: categoryId, isActive: true }),
            Task.countDocuments({ categories: categoryId }),
            Task.find({ categories: categoryId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt status budget')
                .populate('user', 'fullName')
        ]);
        
        return {
            categoryId,
            availableTaskers: taskersCount,
            totalTasks: tasksCount,
            recentTasks
        };
    } catch (error) {
        console.error('Error getting category match stats:', error);
        throw error;
    }
};

module.exports = {
    notifyMatchingTaskers,
    getTaskersByCategory,
    getCategoryMatchStats
}; 