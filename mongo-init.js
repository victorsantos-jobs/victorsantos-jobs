// MongoDB initialization script
db = db.getSiblingDB('task-manager');

// Create collections
db.createCollection('users');
db.createCollection('tasks');
db.createCollection('categories');
db.createCollection('projects');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "createdAt": -1 });

db.tasks.createIndex({ "status": 1, "priority": 1 });
db.tasks.createIndex({ "assignedTo": 1, "status": 1 });
db.tasks.createIndex({ "dueDate": 1 });
db.tasks.createIndex({ "project": 1 });
db.tasks.createIndex({ "category": 1 });
db.tasks.createIndex({ "createdAt": -1 });

db.categories.createIndex({ "name": 1 }, { unique: true });
db.categories.createIndex({ "createdBy": 1 });
db.categories.createIndex({ "isActive": 1 });

db.projects.createIndex({ "status": 1, "priority": 1 });
db.projects.createIndex({ "manager": 1 });
db.projects.createIndex({ "startDate": 1, "endDate": 1 });
db.projects.createIndex({ "team.user": 1 });
db.projects.createIndex({ "createdAt": -1 });

print('MongoDB initialized successfully!');
print('Collections created: users, tasks, categories, projects');
print('Indexes created for optimal performance');
