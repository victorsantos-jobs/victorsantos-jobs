const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Category = require('../models/Category');
const Task = require('../models/Task');
const { protect, authorize, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('isActive').optional().isBoolean().withMessage('isActive deve ser true ou false'),
  query('search').optional().trim(),
  query('sortBy').optional().isIn(['name', 'createdAt', 'taskCount']),
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
      isActive,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get categories with task counts
    const categories = await Category.getCategoriesWithTaskCounts();

    // Apply filters
    let filteredCategories = categories;
    if (Object.keys(filter).length > 0) {
      filteredCategories = categories.filter(category => {
        if (filter.isActive !== undefined && category.isActive !== filter.isActive) return false;
        if (filter.$or) {
          const searchMatch = filter.$or.some(condition => {
            if (condition.name) {
              return new RegExp(condition.name.$regex, condition.name.$options).test(category.name);
            }
            if (condition.description) {
              return new RegExp(condition.description.$regex, condition.description.$options).test(category.description || '');
            }
            return false;
          });
          if (!searchMatch) return false;
        }
        return true;
      });
    }

    // Apply sorting
    filteredCategories.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredCategories.length;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const paginatedCategories = filteredCategories.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedCategories.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      },
      data: paginatedCategories
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Get task count for this category
    await category.updateTaskCount();

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
router.post('/', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Descrição deve ter no máximo 200 caracteres'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Cor deve ser um código hexadecimal válido'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Ícone deve ter no máximo 10 caracteres')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, color, icon } = req.body;

    // Create category
    const category = await Category.create({
      name,
      description,
      color,
      icon,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
router.put('/:id', checkOwnership('Category'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Descrição deve ter no máximo 200 caracteres'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Cor deve ser um código hexadecimal válido'),
  body('icon')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Ícone deve ter no máximo 10 caracteres'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser true ou false')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Categoria atualizada com sucesso',
      data: category
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
router.delete('/:id', checkOwnership('Category'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoria não encontrada'
      });
    }

    // Check if category has tasks
    const taskCount = await Task.countDocuments({ category: req.params.id });
    if (taskCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Não é possível deletar uma categoria que possui ${taskCount} tarefa(s) associada(s)`
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Categoria deletada com sucesso'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get most used categories
// @route   GET /api/categories/stats/most-used
// @access  Private
router.get('/stats/most-used', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limite deve ser entre 1 e 20')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const limit = parseInt(req.query.limit) || 5;

    const mostUsedCategories = await Category.getMostUsedCategories(limit);

    res.status(200).json({
      success: true,
      count: mostUsedCategories.length,
      data: mostUsedCategories
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get category statistics
// @route   GET /api/categories/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res, next) => {
  try {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });
    const inactiveCategories = await Category.countDocuments({ isActive: false });

    // Get categories with task counts
    const categoriesWithTasks = await Category.getCategoriesWithTaskCounts();
    const totalTasks = categoriesWithTasks.reduce((sum, cat) => sum + cat.taskCount, 0);
    const avgTasksPerCategory = totalCategories > 0 ? (totalTasks / totalCategories).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCategories,
        activeCategories,
        inactiveCategories,
        totalTasks,
        avgTasksPerCategory: parseFloat(avgTasksPerCategory),
        categoriesWithTasks
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update categories
// @route   PATCH /api/categories/bulk-update
// @access  Private
router.patch('/bulk-update', [
  body('categoryIds')
    .isArray({ min: 1 })
    .withMessage('Deve fornecer pelo menos um ID de categoria'),
  body('categoryIds.*')
    .isMongoId()
    .withMessage('IDs de categoria devem ser válidos'),
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

    const { categoryIds, updates } = req.body;

    // Validate that user owns all categories or is admin
    const categories = await Category.find({
      _id: { $in: categoryIds },
      createdBy: req.user.id
    });

    if (categories.length !== categoryIds.length && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para atualizar todas as categorias selecionadas'
      });
    }

    // Update categories
    const result = await Category.updateMany(
      { _id: { $in: categoryIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} categorias atualizadas com sucesso`,
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
