/**
 * VICTOR SANTOS PORTFOLIO - MODERN JAVASCRIPT
 * Interactive features and animations
 */

class PortfolioApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupLoadingScreen();
        this.setupNavigation();
        this.setupTypewriter();
        this.setupParticles();
        this.setupAnimations();
        this.setupSkillBars();
        this.setupProjectFilters();
        this.setupContactForm();
        this.setupScrollEffects();
    }

    // Loading Screen
    setupLoadingScreen() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('fade-out');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }
            }, 1000);
        });
    }

    // Navigation
    setupNavigation() {
        const navbar = document.getElementById('mainNav');
        const navLinks = document.querySelectorAll('.nav-link');

        // Smooth scrolling for navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Active link highlighting
        this.updateActiveNavLink();
        window.addEventListener('scroll', () => this.updateActiveNavLink());
    }

    updateActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        const scrollPos = window.scrollY + 100;

        sections.forEach(section => {
            const top = section.offsetTop;
            const bottom = top + section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPos >= top && scrollPos <= bottom) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // Typewriter Effect
    setupTypewriter() {
        const typewriterElement = document.querySelector('.typewriter');
        if (!typewriterElement) return;

        const words = JSON.parse(typewriterElement.getAttribute('data-words'));
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let currentWord = '';

        const typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseTime = 2000;

        const type = () => {
            currentWord = words[wordIndex];

            if (isDeleting) {
                typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }

            let speed = isDeleting ? deleteSpeed : typeSpeed;

            if (!isDeleting && charIndex === currentWord.length) {
                speed = pauseTime;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
            }

            setTimeout(type, speed);
        };

        type();
    }

    // Particle System
    setupParticles() {
        const canvas = document.getElementById('particles-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticles = () => {
            particles = [];
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.random() * 2 + 1,
                    opacity: Math.random() * 0.8 + 0.2
                });
            }
        };

        const updateParticles = () => {
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
            });
        };

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(102, 126, 234, ${particle.opacity})`;
                ctx.fill();
            });

            // Draw connections
            particles.forEach((particle, i) => {
                particles.slice(i + 1).forEach(otherParticle => {
                    const dx = particle.x - otherParticle.x;
                    const dy = particle.y - otherParticle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(otherParticle.x, otherParticle.y);
                        ctx.strokeStyle = `rgba(102, 126, 234, ${0.3 * (1 - distance / 100)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
            });
        };

        const animate = () => {
            updateParticles();
            drawParticles();
            animationId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        createParticles();
        animate();

        window.addEventListener('resize', () => {
            resizeCanvas();
            createParticles();
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        });
    }

    // Scroll Animations
    setupAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Animate elements on scroll
        const animateElements = document.querySelectorAll('.animate-on-scroll, .skill-category, .about-content, .about-visual, .contact-form-container');
        animateElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            observer.observe(el);
        });
    }

    // Skill Bars Animation
    setupSkillBars() {
        const skillObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressBars = entry.target.querySelectorAll('.skill-progress');
                    progressBars.forEach(bar => {
                        const progress = bar.getAttribute('data-progress');
                        setTimeout(() => {
                            bar.style.width = `${progress}%`;
                        }, Math.random() * 500);
                    });
                }
            });
        }, { threshold: 0.5 });

        const skillsSection = document.getElementById('skills');
        if (skillsSection) {
            skillObserver.observe(skillsSection);
        }
    }

    // Project Filters
    setupProjectFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const projectsGrid = document.getElementById('projects-grid');

        if (!projectsGrid) return;

        // Sample projects data
        const projects = [
            {
                title: "E-commerce Platform",
                description: "Plataforma completa de e-commerce com React e Node.js",
                image: "https://via.placeholder.com/400x250",
                category: "fullstack",
                technologies: ["React", "Node.js", "MongoDB", "Stripe"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            },
            {
                title: "Dashboard Analytics",
                description: "Dashboard interativo para análise de dados com gráficos dinâmicos",
                image: "https://via.placeholder.com/400x250",
                category: "frontend",
                technologies: ["Vue.js", "Chart.js", "TypeScript"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            },
            {
                title: "API RESTful",
                description: "API robusta para aplicações mobile com autenticação JWT",
                image: "https://via.placeholder.com/400x250",
                category: "backend",
                technologies: ["PHP", "Laravel", "MySQL", "JWT"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            },
            {
                title: "Sistema de Chat",
                description: "Aplicação de chat em tempo real com Socket.io",
                image: "https://via.placeholder.com/400x250",
                category: "fullstack",
                technologies: ["React", "Socket.io", "Express", "Redis"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            },
            {
                title: "Landing Page Moderna",
                description: "Landing page responsiva com animações avançadas",
                image: "https://via.placeholder.com/400x250",
                category: "frontend",
                technologies: ["HTML5", "CSS3", "JavaScript", "GSAP"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            },
            {
                title: "Microserviços API",
                description: "Arquitetura de microserviços com Docker e Kubernetes",
                image: "https://via.placeholder.com/400x250",
                category: "backend",
                technologies: ["Node.js", "Docker", "Kubernetes", "PostgreSQL"],
                github: "https://github.com/victorsantos-jobs",
                demo: "https://demo.example.com"
            }
        ];

        // Render projects
        const renderProjects = (filteredProjects = projects) => {
            projectsGrid.innerHTML = filteredProjects.map(project => `
                <div class="project-card" data-category="${project.category}">
                    <div class="project-image">
                        <img src="${project.image}" alt="${project.title}" loading="lazy">
                        <div class="project-overlay">
                            <div class="project-actions">
                                <a href="${project.github}" target="_blank" class="project-btn">
                                    <i class="fab fa-github"></i>
                                </a>
                                <a href="${project.demo}" target="_blank" class="project-btn">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="project-content">
                        <h3 class="project-title">${project.title}</h3>
                        <p class="project-description">${project.description}</p>
                        <div class="project-technologies">
                            ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `).join('');

            // Add CSS for project cards
            this.addProjectStyles();
        };

        // Filter functionality
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter projects
                const filteredProjects = filter === 'all' 
                    ? projects 
                    : projects.filter(project => project.category === filter);

                renderProjects(filteredProjects);
            });
        });

        // Initial render
        renderProjects();
    }

    addProjectStyles() {
        // Add CSS for project cards if not already added
        if (document.getElementById('project-styles')) return;

        const style = document.createElement('style');
        style.id = 'project-styles';
        style.textContent = `
            .project-card {
                background: var(--bg-secondary);
                border-radius: var(--radius-xl);
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all var(--transition-normal);
            }

            .project-card:hover {
                transform: translateY(-5px);
                box-shadow: var(--shadow-xl);
            }

            .project-image {
                position: relative;
                overflow: hidden;
                height: 250px;
            }

            .project-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform var(--transition-normal);
            }

            .project-card:hover .project-image img {
                transform: scale(1.05);
            }

            .project-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity var(--transition-normal);
            }

            .project-card:hover .project-overlay {
                opacity: 1;
            }

            .project-actions {
                display: flex;
                gap: var(--space-4);
            }

            .project-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 50px;
                height: 50px;
                background: var(--primary-color);
                color: var(--white);
                border-radius: var(--radius-full);
                text-decoration: none;
                font-size: var(--text-xl);
                transition: all var(--transition-fast);
            }

            .project-btn:hover {
                background: var(--primary-light);
                transform: scale(1.1);
                color: var(--white);
            }

            .project-content {
                padding: var(--space-6);
            }

            .project-title {
                font-size: var(--text-xl);
                font-weight: 700;
                margin-bottom: var(--space-3);
                color: var(--text-primary);
            }

            .project-description {
                color: var(--text-secondary);
                margin-bottom: var(--space-4);
                line-height: 1.6;
            }

            .project-technologies {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-2);
            }

            .tech-tag {
                background: rgba(102, 126, 234, 0.1);
                color: var(--primary-color);
                padding: var(--space-1) var(--space-3);
                border-radius: var(--radius-full);
                font-size: var(--text-sm);
                font-weight: 600;
                border: 1px solid rgba(102, 126, 234, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    // Contact Form
    setupContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';
            submitButton.disabled = true;

            try {
                // Simulate form submission
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Success feedback
                this.showNotification('Mensagem enviada com sucesso!', 'success');
                contactForm.reset();
            } catch (error) {
                // Error feedback
                this.showNotification('Erro ao enviar mensagem. Tente novamente.', 'error');
            } finally {
                // Reset button
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // Notification System
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                ${message}
            </div>
        `;

        // Add notification styles
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: var(--space-4) var(--space-6);
                border-radius: var(--radius-lg);
                color: var(--white);
                font-weight: 600;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform var(--transition-normal);
                max-width: 400px;
                box-shadow: var(--shadow-xl);
            }

            .notification-success {
                background: var(--success-color);
            }

            .notification-error {
                background: var(--error-color);
            }

            .notification.show {
                transform: translateX(0);
            }

            .notification-content {
                display: flex;
                align-items: center;
            }
        `;

        if (!document.getElementById('notification-styles')) {
            style.id = 'notification-styles';
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Scroll Effects
    setupScrollEffects() {
        let ticking = false;

        const updateScrollEffects = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;

            // Parallax effect for hero background
            const heroBackground = document.querySelector('.hero-background');
            if (heroBackground) {
                heroBackground.style.transform = `translateY(${rate}px)`;
            }

            ticking = false;
        };

        const requestTick = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestTick);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PortfolioApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause expensive operations when tab is not visible
        console.log('Tab hidden - pausing animations');
    } else {
        // Resume operations when tab becomes visible
        console.log('Tab visible - resuming animations');
    }
});

// Performance monitoring
window.addEventListener('load', () => {
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
    }
});
