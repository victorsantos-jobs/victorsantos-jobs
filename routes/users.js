const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/fileUpload');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('role').optional().isIn(['user', 'admin', 'manager']),
  query('isVerified').optional().isBoolean().withMessage('isVerified deve ser true ou false'),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['name', 'email', 'role', 'createdAt', 'lastLogin']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      role,
      isVerified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await User.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', checkOwnership('User'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
router.put('/:id', checkOwnership('User'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'manager'])
    .withMessage('Role deve ser user, admin ou manager'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Tema deve ser light, dark ou auto'),
  body('preferences.language')
    .optional()
    .isIn(['pt-BR', 'en-US', 'es-ES'])
    .withMessage('Idioma deve ser pt-BR, en-US ou es-ES')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Only admins can change roles
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode deletar sua própria conta'
      });
    }

    // Delete user's avatar if exists
    if (user.avatar && user.avatar.public_id !== 'default-avatar') {
      try {
        await deleteFile(user.avatar.public_id);
      } catch (fileError) {
        console.error('Error deleting avatar:', fileError);
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload user avatar
// @route   POST /api/users/:id/avatar
// @access  Private
router.post('/:id/avatar', checkOwnership('User'), uploadFile.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de arquivo não suportado. Use JPEG, PNG ou GIF'
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Delete old avatar if exists
    if (user.avatar && user.avatar.public_id !== 'default-avatar') {
      try {
        await deleteFile(user.avatar.public_id);
      } catch (fileError) {
        console.error('Error deleting old avatar:', fileError);
      }
    }

    // Update user avatar
    user.avatar = {
      public_id: req.file.filename,
      url: `/uploads/${req.file.filename}`
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar atualizado com sucesso',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user tasks
// @route   GET /api/users/:id/tasks
// @access  Private
router.get('/:id/tasks', checkOwnership('User'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('status').optional().isIn(['pending', 'in-progress', 'completed', 'cancelled', 'on-hold']),
  query('sortBy').optional().isIn(['title', 'status', 'priority', 'dueDate', 'createdAt']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = { assignedTo: req.params.id };
    if (status) filter.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get tasks
    const tasks = await Task.find(filter)
      .populate('category', 'name color icon')
      .populate('project', 'name status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Task.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      data: tasks
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
router.get('/:id/stats', checkOwnership('User'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Get task statistics
    const taskStats = await Task.getTaskStats(req.params.id);

    // Get user statistics
    const userStats = await User.getUserStats();

    res.status(200).json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          userSince: user.createdAt,
          preferences: user.preferences
        },
        tasks: taskStats[0] || {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          avgProgress: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0
        },
        stats: user.stats,
        global: userStats[0] || {
          totalUsers: 0,
          verifiedUsers: 0,
          adminUsers: 0,
          avgTasksCompleted: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user dashboard data
// @route   GET /api/users/:id/dashboard
// @access  Private
router.get('/:id/dashboard', checkOwnership('User'), async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Get recent tasks
    const recentTasks = await Task.find({ assignedTo: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('category', 'name color icon')
      .populate('project', 'name status')
      .lean();

    // Get overdue tasks
    const overdueTasks = await Task.find({
      assignedTo: userId,
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('category', 'name color icon')
      .limit(5)
      .lean();

    // Get tasks due today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const tasksDueToday = await Task.find({
      assignedTo: userId,
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('category', 'name color icon')
      .lean();

    // Get tasks by status
    const tasksByStatus = await Task.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        recentTasks,
        overdueTasks,
        tasksDueToday,
        tasksByStatus,
        summary: {
          totalRecent: recentTasks.length,
          totalOverdue: overdueTasks.length,
          totalDueToday: tasksDueToday.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user preferences
// @route   PATCH /api/users/:id/preferences
// @access  Private
router.patch('/:id/preferences', checkOwnership('User'), [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Tema deve ser light, dark ou auto'),
  body('language')
    .optional()
    .isIn(['pt-BR', 'en-US', 'es-ES'])
    .withMessage('Idioma deve ser pt-BR, en-US ou es-ES'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Notificação por email deve ser true ou false'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Notificação push deve ser true ou false')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Update preferences
    if (req.body.theme) user.preferences.theme = req.body.theme;
    if (req.body.language) user.preferences.language = req.body.language;
    if (req.body.notifications) {
      if (req.body.notifications.email !== undefined) {
        user.preferences.notifications.email = req.body.notifications.email;
      }
      if (req.body.notifications.push !== undefined) {
        user.preferences.notifications.push = req.body.notifications.push;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferências atualizadas com sucesso',
      data: {
        preferences: user.preferences
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
