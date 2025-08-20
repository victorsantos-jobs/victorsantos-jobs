const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Task = require('../models/Task');
const User = require('../models/User');
const Category = require('../models/Category');
const Project = require('../models/Project');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/fileUpload');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all tasks with filtering, sorting and pagination
// @route   GET /api/tasks
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('status').optional().isIn(['pending', 'in-progress', 'completed', 'cancelled', 'on-hold']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('category').optional().isMongoId().withMessage('ID de categoria inválido'),
  query('project').optional().isMongoId().withMessage('ID de projeto inválido'),
  query('assignedTo').optional().isMongoId().withMessage('ID de usuário inválido'),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['title', 'status', 'priority', 'dueDate', 'createdAt', 'progress']),
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
      priority,
      category,
      project,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by status
    if (status) filter.status = status;

    // Filter by priority
    if (priority) filter.priority = priority;

    // Filter by category
    if (category) filter.category = category;

    // Filter by project
    if (project) filter.project = project;

    // Filter by assigned user
    if (assignedTo) filter.assignedTo = assignedTo;

    // Search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get tasks with population
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('category', 'name color icon')
      .populate('project', 'name status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
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

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', checkOwnership('Task'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('category', 'name color icon')
      .populate('project', 'name status')
      .populate('dependencies', 'title status priority dueDate')
      .populate('comments.user', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('category')
    .isMongoId()
    .withMessage('Categoria é obrigatória e deve ser um ID válido'),
  body('assignedTo')
    .isMongoId()
    .withMessage('Usuário responsável é obrigatório e deve ser um ID válido'),
  body('dueDate')
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser low, medium, high ou urgent'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Horas estimadas devem ser entre 0 e 1000'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags devem ser um array'),
  body('project')
    .optional()
    .isMongoId()
    .withMessage('Projeto deve ser um ID válido')
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
      title,
      description,
      category,
      assignedTo,
      dueDate,
      priority = 'medium',
      estimatedHours,
      tags = [],
      project
    } = req.body;

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Validate assigned user exists
    const assignedUserExists = await User.findById(assignedTo);
    if (!assignedUserExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário responsável não encontrado'
      });
    }

    // Validate project if provided
    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(400).json({
          success: false,
          message: 'Projeto não encontrado'
        });
      }
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      category,
      assignedTo,
      dueDate,
      priority,
      estimatedHours,
      tags,
      project,
      createdBy: req.user.id
    });

    // Populate references
    await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email' },
      { path: 'category', select: 'name color icon' },
      { path: 'project', select: 'name status' }
    ]);

    // Update user stats
    await req.user.updateStats();

    res.status(201).json({
      success: true,
      message: 'Tarefa criada com sucesso',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', checkOwnership('Task'), [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed', 'cancelled', 'on-hold'])
    .withMessage('Status deve ser pending, in-progress, completed, cancelled ou on-hold'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser low, medium, high ou urgent'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Usuário responsável deve ser um ID válido'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progresso deve ser entre 0 e 100'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Horas estimadas devem ser entre 0 e 1000'),
  body('actualHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Horas reais devem ser entre 0 e 1000')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email' },
      { path: 'category', select: 'name color icon' },
      { path: 'project', select: 'name status' }
    ]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    // Update user stats if status changed to completed
    if (req.body.status === 'completed') {
      await req.user.updateStats(true);
    }

    res.status(200).json({
      success: true,
      message: 'Tarefa atualizada com sucesso',
      data: task
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', checkOwnership('Task'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    // Delete associated files
    if (task.attachments && task.attachments.length > 0) {
      for (const attachment of task.attachments) {
        try {
          await deleteFile(attachment.filename);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
      }
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tarefa deletada com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
router.post('/:id/comments', checkOwnership('Task'), [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comentário deve ter entre 1 e 500 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    await task.addComment(req.user.id, req.body.content);

    // Populate the new comment
    await task.populate('comments.user', 'name email avatar');

    const newComment = task.comments[task.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comentário adicionado com sucesso',
      data: newComment
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add time log to task
// @route   POST /api/tasks/:id/time-logs
// @access  Private
router.post('/:id/time-logs', checkOwnership('Task'), [
  body('startTime')
    .isISO8601()
    .withMessage('Hora de início deve ser uma data válida'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Hora de fim deve ser uma data válida'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Descrição deve ter no máximo 200 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { startTime, endTime, description } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    await task.addTimeLog(req.user.id, new Date(startTime), endTime ? new Date(endTime) : new Date(), description);

    res.status(201).json({
      success: true,
      message: 'Registro de tempo adicionado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload file to task
// @route   POST /api/tasks/:id/attachments
// @access  Private
router.post('/:id/attachments', checkOwnership('Task'), uploadFile.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tarefa não encontrada'
      });
    }

    // Add attachment to task
    task.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: task.attachments[task.attachments.length - 1]
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Task.getTaskStats(req.user.id);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        avgProgress: 0,
        totalEstimatedHours: 0,
        totalActualHours: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get tasks by priority
// @route   GET /api/tasks/stats/by-priority
// @access  Private
router.get('/stats/by-priority', async (req, res, next) => {
  try {
    const stats = await Task.getTasksByPriority();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private
router.get('/overdue', async (req, res, next) => {
  try {
    const overdueTasks = await Task.getOverdueTasks();

    res.status(200).json({
      success: true,
      count: overdueTasks.length,
      data: overdueTasks
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update task status
// @route   PATCH /api/tasks/bulk-update
// @access  Private
router.patch('/bulk-update', [
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('Deve fornecer pelo menos um ID de tarefa'),
  body('taskIds.*')
    .isMongoId()
    .withMessage('IDs de tarefa devem ser válidos'),
  body('updates')
    .isObject()
    .withMessage('Atualizações devem ser um objeto')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { taskIds, updates } = req.body;

    // Validate that user owns all tasks or is admin
    const tasks = await Task.find({
      _id: { $in: taskIds },
      $or: [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ]
    });

    if (tasks.length !== taskIds.length && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar todas as tarefas selecionadas'
      });
    }

    // Update tasks
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} tarefas atualizadas com sucesso`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
