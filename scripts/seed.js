const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Project = require('../models/Project');
const Task = require('../models/Task');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/task-manager',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Project.deleteMany();
    await Task.deleteMany();

    console.log('🗑️  Existing data cleared');

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@taskmanager.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    });

    // Create regular users
    const user1 = await User.create({
      name: 'João Silva',
      email: 'joao@taskmanager.com',
      password: 'user123',
      role: 'user',
      isVerified: true
    });

    const user2 = await User.create({
      name: 'Maria Santos',
      email: 'maria@taskmanager.com',
      password: 'user123',
      role: 'manager',
      isVerified: true
    });

    const user3 = await User.create({
      name: 'Pedro Costa',
      email: 'pedro@taskmanager.com',
      password: 'user123',
      role: 'user',
      isVerified: true
    });

    console.log('👥 Users created');

    // Create categories
    const categories = await Category.create([
      {
        name: 'Desenvolvimento',
        description: 'Tarefas relacionadas ao desenvolvimento de software',
        color: '#007bff',
        icon: '💻',
        createdBy: adminUser._id,
        isDefault: true
      },
      {
        name: 'Design',
        description: 'Tarefas relacionadas ao design e UX/UI',
        color: '#28a745',
        icon: '🎨',
        createdBy: adminUser._id,
        isDefault: true
      },
      {
        name: 'Testes',
        description: 'Tarefas relacionadas a testes e qualidade',
        color: '#ffc107',
        icon: '🧪',
        createdBy: adminUser._id,
        isDefault: true
      },
      {
        name: 'Documentação',
        description: 'Tarefas relacionadas à documentação',
        color: '#6c757d',
        icon: '📚',
        createdBy: adminUser._id,
        isDefault: true
      },
      {
        name: 'Reuniões',
        description: 'Tarefas relacionadas a reuniões e comunicação',
        color: '#dc3545',
        icon: '🤝',
        createdBy: adminUser._id,
        isDefault: true
      }
    ]);

    console.log('📂 Categories created');

    // Create projects
    const projects = await Project.create([
      {
        name: 'E-commerce Platform',
        description: 'Desenvolvimento de uma plataforma de e-commerce completa com sistema de pagamentos, gestão de produtos e painel administrativo.',
        status: 'active',
        priority: 'high',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        manager: user2._id,
        team: [
          { user: user2._id, role: 'manager' },
          { user: user1._id, role: 'developer' },
          { user: user3._id, role: 'designer' }
        ],
        budget: {
          estimated: 50000,
          currency: 'BRL'
        },
        tags: ['e-commerce', 'web', 'payment']
      },
      {
        name: 'Mobile App',
        description: 'Aplicativo móvel para iOS e Android com funcionalidades de geolocalização e notificações push.',
        status: 'planning',
        priority: 'medium',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-08-31'),
        manager: user2._id,
        team: [
          { user: user2._id, role: 'manager' },
          { user: user1._id, role: 'developer' }
        ],
        budget: {
          estimated: 30000,
          currency: 'BRL'
        },
        tags: ['mobile', 'ios', 'android']
      }
    ]);

    console.log('🚀 Projects created');

    // Create tasks
    const tasks = await Task.create([
      {
        title: 'Configurar ambiente de desenvolvimento',
        description: 'Instalar e configurar todas as ferramentas necessárias para o desenvolvimento do projeto e-commerce.',
        status: 'completed',
        priority: 'high',
        category: categories[0]._id,
        project: projects[0]._id,
        assignedTo: user1._id,
        createdBy: user2._id,
        dueDate: new Date('2024-01-15'),
        completedAt: new Date('2024-01-10'),
        estimatedHours: 8,
        actualHours: 6,
        tags: ['setup', 'environment'],
        progress: 100
      },
      {
        title: 'Criar wireframes do sistema',
        description: 'Desenvolver wireframes detalhados para todas as telas do sistema e-commerce, incluindo fluxo de usuário.',
        status: 'in-progress',
        priority: 'medium',
        category: categories[1]._id,
        project: projects[0]._id,
        assignedTo: user3._id,
        createdBy: user2._id,
        dueDate: new Date('2024-02-15'),
        estimatedHours: 16,
        actualHours: 8,
        tags: ['wireframes', 'ux', 'design'],
        progress: 50
      },
      {
        title: 'Implementar autenticação',
        description: 'Desenvolver sistema de autenticação com JWT, incluindo login, registro e recuperação de senha.',
        status: 'pending',
        priority: 'high',
        category: categories[0]._id,
        project: projects[0]._id,
        assignedTo: user1._id,
        createdBy: user2._id,
        dueDate: new Date('2024-02-28'),
        estimatedHours: 24,
        tags: ['auth', 'jwt', 'security'],
        progress: 0
      },
      {
        title: 'Configurar banco de dados',
        description: 'Configurar MongoDB com schemas, índices e configurações de backup para o projeto e-commerce.',
        status: 'in-progress',
        priority: 'medium',
        category: categories[0]._id,
        project: projects[0]._id,
        assignedTo: user1._id,
        createdBy: user2._id,
        dueDate: new Date('2024-01-30'),
        estimatedHours: 12,
        actualHours: 6,
        tags: ['database', 'mongodb', 'setup'],
        progress: 50
      },
      {
        title: 'Criar testes unitários',
        description: 'Implementar testes unitários para todas as funcionalidades principais do sistema.',
        status: 'pending',
        priority: 'low',
        category: categories[2]._id,
        project: projects[0]._id,
        assignedTo: user3._id,
        createdBy: user2._id,
        dueDate: new Date('2024-03-15'),
        estimatedHours: 20,
        tags: ['testing', 'unit', 'quality'],
        progress: 0
      },
      {
        title: 'Documentar API',
        description: 'Criar documentação completa da API REST com exemplos de uso e códigos de resposta.',
        status: 'pending',
        priority: 'medium',
        category: categories[3]._id,
        project: projects[0]._id,
        assignedTo: user2._id,
        createdBy: user2._id,
        dueDate: new Date('2024-03-30'),
        estimatedHours: 16,
        tags: ['api', 'documentation', 'swagger'],
        progress: 0
      },
      {
        title: 'Reunião de planejamento',
        description: 'Reunião semanal para alinhar o progresso do projeto e definir próximas tarefas.',
        status: 'pending',
        priority: 'low',
        category: categories[4]._id,
        project: projects[0]._id,
        assignedTo: user2._id,
        createdBy: user2._id,
        dueDate: new Date('2024-01-22'),
        estimatedHours: 2,
        tags: ['meeting', 'planning', 'weekly'],
        progress: 0
      }
    ]);

    console.log('✅ Tasks created');

    // Update user stats
    await user1.updateStats();
    await user1.updateStats();
    await user1.updateStats();
    await user1.updateStats();
    await user1.updateStats();
    await user1.updateStats();
    await user1.updateStats();

    await user2.updateStats();
    await user2.updateStats();
    await user2.updateStats();
    await user2.updateStats();
    await user2.updateStats();
    await user2.updateStats();
    await user2.updateStats();

    await user3.updateStats();
    await user3.updateStats();
    await user3.updateStats();

    console.log('📊 User stats updated');

    // Update category task counts
    for (const category of categories) {
      await category.updateTaskCount();
    }

    console.log('📈 Category task counts updated');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Sample Data:');
    console.log(`   👥 Users: ${await User.countDocuments()}`);
    console.log(`   📂 Categories: ${await Category.countDocuments()}`);
    console.log(`   🚀 Projects: ${await Project.countDocuments()}`);
    console.log(`   ✅ Tasks: ${await Task.countDocuments()}`);

    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@taskmanager.com / admin123');
    console.log('   User: joao@taskmanager.com / user123');
    console.log('   Manager: maria@taskmanager.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
connectDB().then(() => {
  seedData();
});
