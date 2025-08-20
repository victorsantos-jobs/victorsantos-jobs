const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/fileUpload');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('manager').optional().isMongoId().withMessage('ID de gerente inválido'),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['name', 'status', 'priority', 'startDate', 'endDate', 'createdAt', 'progress']),
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
      manager,
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

    // Filter by manager
    if (manager) filter.manager = manager;

    // Search in name and description
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by user access (if not admin)
    if (req.user.role !== 'admin') {
      filter.$or = [
        { manager: req.user.id },
        { 'team.user': req.user.id }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get projects with population
    const projects = await Project.find(filter)
      .populate('manager', 'name email avatar')
      .populate('team.user', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Project.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      count: projects.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      data: projects
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
router.get('/:id', checkOwnership('Project'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email avatar')
      .populate('team.user', 'name email avatar')
      .populate('milestones')
      .populate('risks');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('startDate')
    .isISO8601()
    .withMessage('Data de início deve ser uma data válida'),
  body('endDate')
    .isISO8601()
    .withMessage('Data de término deve ser uma data válida'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser low, medium, high ou urgent'),
  body('budget.estimated')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Orçamento estimado deve ser um número positivo'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags devem ser um array')
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
      name,
      description,
      startDate,
      endDate,
      priority = 'medium',
      budget,
      tags = []
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Data de início deve ser anterior à data de término'
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      priority,
      budget,
      tags,
      manager: req.user.id,
      team: [{ user: req.user.id, role: 'manager' }]
    });

    // Populate references
    await project.populate([
      { path: 'manager', select: 'name email avatar' },
      { path: 'team.user', select: 'name email avatar' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Projeto criado com sucesso',
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
router.put('/:id', checkOwnership('Project'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nome deve ter entre 3 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descrição deve ter entre 10 e 1000 caracteres'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Status deve ser planning, active, on-hold, completed ou cancelled'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Prioridade deve ser low, medium, high ou urgent'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve ser uma data válida'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data de término deve ser uma data válida'),
  body('budget.estimated')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Orçamento estimado deve ser um número positivo'),
  body('budget.actual')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Orçamento real deve ser um número positivo')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Validate dates if both are provided
    if (req.body.startDate && req.body.endDate) {
      if (new Date(req.body.startDate) >= new Date(req.body.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Data de início deve ser anterior à data de término'
        });
      }
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate([
      { path: 'manager', select: 'name email avatar' },
      { path: 'team.user', select: 'name email avatar' }
    ]);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      data: project
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', checkOwnership('Project'), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Check if project has tasks
    const taskCount = await Task.countDocuments({ project: req.params.id });
    if (taskCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível deletar um projeto que possui ${taskCount} tarefa(s) associada(s)`
      });
    }

    // Delete associated files
    if (project.attachments && project.attachments.length > 0) {
      for (const attachment of project.attachments) {
        try {
          await deleteFile(attachment.filename);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
        }
      }
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add team member to project
// @route   POST /api/projects/:id/team
// @access  Private
router.post('/:id/team', checkOwnership('Project'), [
  body('userId')
    .isMongoId()
    .withMessage('ID de usuário deve ser válido'),
  body('role')
    .optional()
    .isIn(['member', 'lead', 'developer', 'designer', 'tester'])
    .withMessage('Role deve ser member, lead, developer, designer ou tester')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId, role = 'member' } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    await project.addTeamMember(userId, role);

    // Populate team
    await project.populate('team.user', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Membro adicionado à equipe com sucesso',
      data: {
        team: project.team
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove team member from project
// @route   DELETE /api/projects/:id/team/:userId
// @access  Private
router.delete('/:id/team/:userId', checkOwnership('Project'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Prevent removing the manager
    if (project.manager.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível remover o gerente do projeto'
      });
    }

    await project.removeTeamMember(userId);

    res.status(200).json({
      success: true,
      message: 'Membro removido da equipe com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add milestone to project
// @route   POST /api/projects/:id/milestones
// @access  Private
router.post('/:id/milestones', checkOwnership('Project'), [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título deve ter entre 3 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('dueDate')
    .isISO8601()
    .withMessage('Data de vencimento deve ser uma data válida')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, dueDate } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    await project.addMilestone(title, description, dueDate);

    res.status(201).json({
      success: true,
      message: 'Marco adicionado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Complete milestone
// @route   PATCH /api/projects/:id/milestones/:milestoneId/complete
// @access  Private
router.patch('/:id/milestones/:milestoneId/complete', checkOwnership('Project'), async (req, res, next) => {
  try {
    const { milestoneId } = req.params;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    await project.completeMilestone(milestoneId);

    res.status(200).json({
      success: true,
      message: 'Marco marcado como concluído'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add risk to project
// @route   POST /api/projects/:id/risks
// @access  Private
router.post('/:id/risks', checkOwnership('Project'), [
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Descrição deve ter entre 10 e 500 caracteres'),
  body('probability')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Probabilidade deve ser low, medium ou high'),
  body('impact')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Impacto deve ser low, medium ou high'),
  body('mitigation')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mitigação deve ter no máximo 500 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { description, probability, impact, mitigation } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    await project.addRisk(description, probability, impact, mitigation);

    res.status(201).json({
      success: true,
      message: 'Risco adicionado com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload file to project
// @route   POST /api/projects/:id/attachments
// @access  Private
router.post('/:id/attachments', checkOwnership('Project'), uploadFile.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Add attachment to project
    project.attachments.push({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: project.attachments[project.attachments.length - 1]
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get project statistics
// @route   GET /api/projects/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res, next) => {
  try {
    const stats = await Project.getProjectStats();

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        overdueProjects: 0,
        avgProgress: 0,
        totalBudget: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get projects by status
// @route   GET /api/projects/stats/by-status
// @access  Private
router.get('/stats/by-status', async (req, res, next) => {
  try {
    const stats = await Project.getProjectsByStatus();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
