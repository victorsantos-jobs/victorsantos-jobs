
# 🚀 Task Manager API - Backend Profissional

Uma API REST moderna e robusta para gerenciamento de tarefas e projetos, construída com Node.js, Express, MongoDB e funcionalidades avançadas de segurança e autenticação.

## ✨ Características Principais

- 🔐 **Autenticação JWT** com verificação de email
- 👥 **Sistema de Roles** (Admin, Manager, User)
- 📋 **Gestão Completa de Tarefas** com status, prioridades e dependências
- 🚀 **Gestão de Projetos** com equipes, marcos e riscos
- 📂 **Categorização** inteligente de tarefas
- 📊 **Dashboard e Estatísticas** em tempo real
- 📧 **Sistema de Emails** para notificações
- 📁 **Upload de Arquivos** com validação
- 🛡️ **Segurança Avançada** com rate limiting, CORS e validações
- 📱 **API RESTful** com documentação completa
- 🧪 **Testes** e scripts de seed
- 🚀 **Performance** otimizada com índices e agregações

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Banco de Dados**: MongoDB com Mongoose
- **Autenticação**: JWT, bcryptjs
- **Validação**: express-validator
- **Segurança**: helmet, cors, rate-limiting
- **Upload**: multer
- **Emails**: nodemailer
- **Logs**: morgan
- **Compressão**: compression

## 📁 Estrutura do Projeto

```
task-manager-api/
├── models/                 # Modelos do MongoDB
│   ├── User.js           # Modelo de usuário
│   ├── Task.js           # Modelo de tarefa
│   ├── Category.js       # Modelo de categoria
│   └── Project.js        # Modelo de projeto
├── routes/                # Rotas da API
│   ├── auth.js           # Autenticação
│   ├── users.js          # Gestão de usuários
│   ├── tasks.js          # Gestão de tarefas
│   ├── categories.js     # Gestão de categorias
│   └── projects.js       # Gestão de projetos
├── middleware/            # Middlewares
│   ├── auth.js           # Autenticação e autorização
│   ├── errorHandler.js   # Tratamento de erros
│   └── notFound.js       # Rotas não encontradas
├── utils/                 # Utilitários
│   ├── errorResponse.js  # Classe de erro personalizada
│   ├── tokenResponse.js  # Resposta de token JWT
│   ├── sendEmail.js      # Envio de emails
│   └── fileUpload.js     # Upload de arquivos
├── scripts/               # Scripts utilitários
│   └── seed.js           # População do banco
├── uploads/               # Arquivos enviados
├── server.js              # Servidor principal
├── package.json           # Dependências
└── env.example            # Variáveis de ambiente
```

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- Node.js (versão 16 ou superior)
- MongoDB (local ou Atlas)
- Git

### 2. Clone o repositório

```bash
git clone <repository-url>
cd task-manager-api
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure as variáveis de ambiente

```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações do Servidor
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/task-manager
MONGODB_URI_PROD=mongodb+srv://username:password@cluster.mongodb.net/task-manager

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15*60*1000
RATE_LIMIT_MAX=100

# File Upload
MAX_FILE_SIZE=5*1024*1024
UPLOAD_PATH=./uploads
```

### 5. Inicie o MongoDB

```bash
# Local
mongod

# Ou use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 6. Execute o script de seed (opcional)

```bash
npm run seed
```

### 7. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📚 Endpoints da API

### 🔐 Autenticação

| Método | Endpoint | Descrição |
|--------|----------|------------|
| POST | `/api/auth/register` | Registrar usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/verify/:token` | Verificar email |
| POST | `/api/auth/forgot-password` | Esqueci a senha |
| PUT | `/api/auth/reset-password/:token` | Resetar senha |
| GET | `/api/auth/me` | Usuário atual |
| PUT | `/api/auth/updatedetails` | Atualizar dados |
| PUT | `/api/auth/updatepassword` | Alterar senha |
| POST | `/api/auth/logout` | Logout |

### 👥 Usuários

| Método | Endpoint | Descrição |
|--------|----------|------------|
| GET | `/api/users` | Listar usuários (Admin) |
| GET | `/api/users/:id` | Obter usuário |
| PUT | `/api/users/:id` | Atualizar usuário |
| DELETE | `/api/users/:id` | Deletar usuário (Admin) |
| POST | `/api/users/:id/avatar` | Upload avatar |
| GET | `/api/users/:id/tasks` | Tarefas do usuário |
| GET | `/api/users/:id/stats` | Estatísticas do usuário |
| GET | `/api/users/:id/dashboard` | Dashboard do usuário |
| PATCH | `/api/users/:id/preferences` | Atualizar preferências |

### 📋 Tarefas

| Método | Endpoint | Descrição |
|--------|----------|------------|
| GET | `/api/tasks` | Listar tarefas |
| GET | `/api/tasks/:id` | Obter tarefa |
| POST | `/api/tasks` | Criar tarefa |
| PUT | `/api/tasks/:id` | Atualizar tarefa |
| DELETE | `/api/tasks/:id` | Deletar tarefa |
| POST | `/api/tasks/:id/comments` | Adicionar comentário |
| POST | `/api/tasks/:id/time-logs` | Adicionar registro de tempo |
| POST | `/api/tasks/:id/attachments` | Upload de arquivo |
| GET | `/api/tasks/stats/overview` | Estatísticas gerais |
| GET | `/api/tasks/stats/by-priority` | Tarefas por prioridade |
| GET | `/api/tasks/overdue` | Tarefas em atraso |
| PATCH | `/api/tasks/bulk-update` | Atualização em lote |

### 📂 Categorias

| Método | Endpoint | Descrição |
|--------|----------|------------|
| GET | `/api/categories` | Listar categorias |
| GET | `/api/categories/:id` | Obter categoria |
| POST | `/api/categories` | Criar categoria |
| PUT | `/api/categories/:id` | Atualizar categoria |
| DELETE | `/api/categories/:id` | Deletar categoria |
| GET | `/api/categories/stats/most-used` | Categorias mais usadas |
| GET | `/api/categories/stats/overview` | Estatísticas gerais |
| PATCH | `/api/categories/bulk-update` | Atualização em lote |

### 🚀 Projetos

| Método | Endpoint | Descrição |
|--------|----------|------------|
| GET | `/api/projects` | Listar projetos |
| GET | `/api/projects/:id` | Obter projeto |
| POST | `/api/projects` | Criar projeto |
| PUT | `/api/projects/:id` | Atualizar projeto |
| DELETE | `/api/projects/:id` | Deletar projeto |
| POST | `/api/projects/:id/team` | Adicionar membro |
| DELETE | `/api/projects/:id/team/:userId` | Remover membro |
| POST | `/api/projects/:id/milestones` | Adicionar marco |
| PATCH | `/api/projects/:id/milestones/:milestoneId/complete` | Completar marco |
| POST | `/api/projects/:id/risks` | Adicionar risco |
| POST | `/api/projects/:id/attachments` | Upload de arquivo |
| GET | `/api/projects/stats/overview` | Estatísticas gerais |
| GET | `/api/projects/stats/by-status` | Projetos por status |

## 🔑 Credenciais de Teste

Após executar o seed, você pode usar estas credenciais:

- **Admin**: `admin@taskmanager.com` / `admin123`
- **Manager**: `maria@taskmanager.com` / `user123`
- **User**: `joao@taskmanager.com` / `user123`

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch
```

## 📊 Funcionalidades Avançadas

### 🔍 Filtros e Busca
- Filtros por status, prioridade, categoria, projeto
- Busca por texto em título, descrição e tags
- Ordenação por múltiplos campos
- Paginação com limite configurável

### 📈 Estatísticas e Relatórios
- Dashboard personalizado por usuário
- Estatísticas de tarefas por status e prioridade
- Relatórios de progresso de projetos
- Métricas de performance da equipe

### 🚀 Gestão de Projetos
- Sistema de marcos (milestones)
- Gestão de riscos com probabilidade e impacto
- Controle de orçamento estimado vs. real
- Equipes com roles específicos

### 📁 Sistema de Arquivos
- Upload de múltiplos tipos de arquivo
- Validação de tamanho e tipo
- Organização por tarefa/projeto
- Limpeza automática de arquivos órfãos

### 🔔 Notificações
- Emails automáticos para verificação
- Reset de senha por email
- Notificações de tarefas em atraso
- Sistema de lembretes configurável

## 🛡️ Segurança

- **JWT** com expiração configurável
- **Rate Limiting** para prevenir ataques
- **Validação** de entrada com express-validator
- **Sanitização** de dados
- **CORS** configurável
- **Helmet** para headers de segurança
- **Compressão** para melhor performance

## 🚀 Deploy

### Heroku
```bash
heroku create
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

### Docker
```bash
docker build -t task-manager-api .
docker run -p 5000:5000 task-manager-api
```

### Vercel
```bash
vercel --prod
```

## 📝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Victor Santos**
- GitHub: [@victorsantos](https://github.com/victorsantos)
- LinkedIn: [Victor Santos](https://linkedin.com/in/victorsantos)

## 🙏 Agradecimentos

- Comunidade Node.js
- MongoDB Atlas
- Express.js team
- Todos os contribuidores

---

⭐ **Se este projeto te ajudou, considere dar uma estrela!**

