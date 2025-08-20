const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do projeto é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Descrição não pode ter mais de 1000 caracteres']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: [true, 'Data de início é obrigatória']
  },
  endDate: {
    type: Date,
    required: [true, 'Data de término é obrigatória']
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Gerente do projeto é obrigatório']
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'lead', 'developer', 'designer', 'tester'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  budget: {
    estimated: {
      type: Number,
      min: [0, 'Orçamento estimado não pode ser negativo']
    },
    actual: {
      type: Number,
      min: [0, 'Orçamento real não pode ser negativo']
    },
    currency: {
      type: String,
      default: 'BRL'
    }
  },
  progress: {
    type: Number,
    min: [0, 'Progresso não pode ser negativo'],
    max: [100, 'Progresso não pode exceder 100%'],
    default: 0
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
  milestones: [{
    title: {
      type: String,
      required: true,
      maxlength: [100, 'Título do marco não pode ter mais de 100 caracteres']
    },
    description: String,
    dueDate: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  risks: [{
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Descrição do risco não pode ter mais de 500 caracteres']
    },
    probability: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    impact: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    mitigation: String,
    status: {
      type: String,
      enum: ['open', 'mitigated', 'closed'],
      default: 'open'
    }
  }],
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'team'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for days until deadline
projectSchema.virtual('daysUntilDeadline').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for overdue status
projectSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false;
  return new Date() > new Date(this.endDate);
});

// Virtual for team size
projectSchema.virtual('teamSize').get(function() {
  return this.team.length;
});

// Virtual for completion status
projectSchema.virtual('completionStatus').get(function() {
  if (this.status === 'completed') return 'Concluído';
  if (this.status === 'cancelled') return 'Cancelado';
  if (this.status === 'on-hold') return 'Em pausa';
  if (this.progress === 0) return 'Não iniciado';
  if (this.progress < 25) return 'Iniciado';
  if (this.progress < 50) return 'Em andamento';
  if (this.progress < 75) return 'Bem avançado';
  return 'Quase concluído';
});

// Indexes for better performance
projectSchema.index({ status: 1, priority: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });
projectSchema.index({ 'team.user': 1 });
projectSchema.index({ createdAt: -1 });

// Pre-save middleware to update progress based on milestones
projectSchema.pre('save', function(next) {
  if (this.milestones && this.milestones.length > 0) {
    const completedMilestones = this.milestones.filter(m => m.completed).length;
    this.progress = Math.round((completedMilestones / this.milestones.length) * 100);
  }
  next();
});

// Method to add team member
projectSchema.methods.addTeamMember = function(userId, role = 'member') {
  const existingMember = this.team.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('Usuário já é membro da equipe');
  }
  
  this.team.push({
    user: userId,
    role
  });
  
  return this.save();
};

// Method to remove team member
projectSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Method to add milestone
projectSchema.methods.addMilestone = function(title, description, dueDate) {
  this.milestones.push({
    title,
    description,
    dueDate
  });
  
  return this.save();
};

// Method to complete milestone
projectSchema.methods.completeMilestone = function(milestoneId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.completed = true;
    milestone.completedAt = new Date();
  }
  
  return this.save();
};

// Method to add risk
projectSchema.methods.addRisk = function(description, probability, impact, mitigation) {
  this.risks.push({
    description,
    probability,
    impact,
    mitigation
  });
  
  return this.save();
};

// Static method to get project statistics
projectSchema.statics.getProjectStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completedProjects: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdueProjects: { $sum: { $cond: [{ $gt: [new Date(), '$endDate'] }, 1, 0] } },
        avgProgress: { $avg: '$progress' },
        totalBudget: { $sum: '$budget.estimated' }
      }
    }
  ]);
};

// Static method to get projects by status
projectSchema.statics.getProjectsByStatus = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        projects: { $push: { name: '$name', progress: '$progress', endDate: '$endDate' } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Project', projectSchema);
