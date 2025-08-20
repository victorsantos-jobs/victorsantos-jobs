const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify token
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check if token exists in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado para acessar esta rota'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Email não verificado. Por favor, verifique seu email primeiro.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Usuário com role '${req.user.role}' não tem permissão para acessar esta rota`
      });
    }

    next();
  };
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isVerified) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Invalid token in optional auth:', error.message);
    }
  }

  next();
};

// Check if user owns the resource or is admin
exports.checkOwnership = (modelName) => {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${modelName}`);
      const resource = await Model.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso não encontrado'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check ownership based on model
      let isOwner = false;

      switch (modelName) {
        case 'User':
          isOwner = resource._id.toString() === req.user._id.toString();
          break;
        case 'Task':
          isOwner = resource.assignedTo.toString() === req.user._id.toString() || 
                   resource.createdBy.toString() === req.user._id.toString();
          break;
        case 'Project':
          isOwner = resource.manager.toString() === req.user._id.toString() ||
                   resource.team.some(member => member.user.toString() === req.user._id.toString());
          break;
        case 'Category':
          isOwner = resource.createdBy.toString() === req.user._id.toString();
          break;
        default:
          isOwner = resource.createdBy && resource.createdBy.toString() === req.user._id.toString();
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar este recurso'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar permissões'
      });
    }
  };
};

// Rate limiting for specific actions
exports.actionRateLimit = (maxActions = 5, windowMs = 15 * 60 * 1000) => {
  const actionCounts = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (actionCounts.has(userId)) {
      const userActions = actionCounts.get(userId);
      userActions.actions = userActions.actions.filter(time => time > windowStart);
      
      if (userActions.actions.length === 0) {
        actionCounts.delete(userId);
      }
    }

    // Check if user has exceeded limit
    if (actionCounts.has(userId)) {
      const userActions = actionCounts.get(userId);
      
      if (userActions.actions.length >= maxActions) {
        return res.status(429).json({
          success: false,
          message: 'Muitas ações em pouco tempo. Tente novamente mais tarde.'
        });
      }
    }

    // Add current action
    if (!actionCounts.has(userId)) {
      actionCounts.set(userId, { actions: [now] });
    } else {
      actionCounts.get(userId).actions.push(now);
    }

    next();
  };
};

module.exports = exports;
