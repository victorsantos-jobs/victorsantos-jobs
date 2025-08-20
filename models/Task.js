const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título da tarefa é obrigatório'],
    trim: true,
    maxlength: [100, 'Título não pode ter mais de 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'Descrição da tarefa é obrigatória'],
    trim: true,
    maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Categoria é obrigatória']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário responsável é obrigatório']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário criador é obrigatório']
  },
  dueDate: {
    type: Date,
    required: [true, 'Data de vencimento é obrigatória']
  },
  completedAt: Date,
  estimatedHours: {
    type: Number,
    min: [0, 'Horas estimadas não podem ser negativas'],
    max: [1000, 'Horas estimadas não podem exceder 1000']
  },
  actualHours: {
    type: Number,
    min: [0, 'Horas reais não podem ser negativas'],
    max: [1000, 'Horas reais não podem exceder 1000']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag não pode ter mais de 20 caracteres']
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comentário não pode ter mais de 500 caracteres']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  progress: {
    type: Number,
    min: [0, 'Progresso não pode ser negativo'],
    max: [100, 'Progresso não pode exceder 100%'],
    default: 0
  },
  timeLogs: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    duration: Number, // in minutes
    description: String
  }],
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    reminder: {
      type: Boolean,
      default: true
    }
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1
    },
    endDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for task age
taskSchema.virtual('age').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false;
  return new Date() > new Date(this.dueDate);
});

// Virtual for completion percentage
taskSchema.virtual('completionPercentage').get(function() {
  if (this.status === 'completed') return 100;
  return this.progress;
});

// Indexes for better performance
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ createdAt: -1 });

// Pre-save middleware to update completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Method to add time log
taskSchema.methods.addTimeLog = function(userId, startTime, endTime, description) {
  const duration = Math.round((endTime - startTime) / (1000 * 60)); // Convert to minutes
  
  this.timeLogs.push({
    user: userId,
    startTime,
    endTime,
    duration,
    description
  });
  
  return this.save();
};

// Method to add comment
taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content
  });
  
  return this.save();
};

// Method to update progress
taskSchema.methods.updateProgress = function(progress) {
  this.progress = Math.max(0, Math.min(100, progress));
  
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Method to assign task
taskSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  return this.save();
};

// Method to add dependency
taskSchema.methods.addDependency = function(taskId) {
  if (!this.dependencies.includes(taskId)) {
    this.dependencies.push(taskId);
  }
  return this.save();
};

// Method to remove dependency
taskSchema.methods.removeDependency = function(taskId) {
  this.dependencies = this.dependencies.filter(dep => dep.toString() !== taskId.toString());
  return this.save();
};

// Static method to get task statistics
taskSchema.statics.getTaskStats = function(userId = null) {
  const match = userId ? { assignedTo: userId } : {};
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        overdueTasks: { $sum: { $cond: [{ $gt: [new Date(), '$dueDate'] }, 1, 0] } },
        avgProgress: { $avg: '$progress' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);
};

// Static method to get tasks by priority
taskSchema.statics.getTasksByPriority = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
        tasks: { $push: { title: '$title', status: '$status', dueDate: '$dueDate' } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo', 'name email');
};

module.exports = mongoose.model('Task', taskSchema);
