const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da categoria é obrigatório'],
    trim: true,
    maxlength: [50, 'Nome não pode ter mais de 50 caracteres'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Descrição não pode ter mais de 200 caracteres']
  },
  color: {
    type: String,
    default: '#007bff',
    match: [/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hexadecimal válido']
  },
  icon: {
    type: String,
    default: '📋'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário criador é obrigatório']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  taskCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted creation date
categorySchema.virtual('createdDate').get(function() {
  return this.createdAt.toLocaleDateString('pt-BR');
});

// Index for better performance
categorySchema.index({ name: 1 });
categorySchema.index({ createdBy: 1 });
categorySchema.index({ isActive: 1 });

// Pre-save middleware to ensure unique names
categorySchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    const existingCategory = await this.constructor.findOne({ 
      name: this.name, 
      _id: { $ne: this._id } 
    });
    
    if (existingCategory) {
      throw new Error('Categoria com este nome já existe');
    }
  }
  next();
});

// Method to update task count
categorySchema.methods.updateTaskCount = async function() {
  const Task = mongoose.model('Task');
  const count = await Task.countDocuments({ category: this._id });
  this.taskCount = count;
  return this.save();
};

// Static method to get categories with task counts
categorySchema.statics.getCategoriesWithTaskCounts = function() {
  return this.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'category',
        as: 'tasks'
      }
    },
    {
      $addFields: {
        taskCount: { $size: '$tasks' }
      }
    },
    {
      $project: {
        tasks: 0
      }
    },
    {
      $sort: { name: 1 }
    }
  ]);
};

// Static method to get most used categories
categorySchema.statics.getMostUsedCategories = function(limit = 5) {
  return this.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'category',
        as: 'tasks'
      }
    },
    {
      $addFields: {
        taskCount: { $size: '$tasks' }
      }
    },
    {
      $match: {
        taskCount: { $gt: 0 }
      }
    },
    {
      $sort: { taskCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        tasks: 0
      }
    }
  ]);
};

module.exports = mongoose.model('Category', categorySchema);
